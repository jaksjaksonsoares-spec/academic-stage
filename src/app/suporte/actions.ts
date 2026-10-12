"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/rate-limit";
import { destinoSuporte, enviarEmail, modeloEmail, type Anexo } from "@/lib/email";
import {
  CATEGORIAS_SUPORTE,
  MAX_ANEXOS,
  MAX_TOTAL_ANEXOS,
  gerarProtocolo,
  nomeSeguro,
  pareceSpam,
  tipoPorAssinatura,
  verificarTokenFormulario,
} from "@/lib/suporte";

export type SuporteState = {
  status: "idle" | "success" | "error";
  message?: string;
  fields?: Record<string, string>;
  protocolo?: string;
  emailAdmin?: "enviado" | "falhou" | "nao_configurado";
  emailUsuario?: "enviado" | "falhou" | "nao_configurado";
};

const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido para a resposta.").max(254),
  categoria: z.enum(Object.keys(CATEGORIAS_SUPORTE) as [keyof typeof CATEGORIAS_SUPORTE, ...(keyof typeof CATEGORIAS_SUPORTE)[]], { errorMap: () => ({ message: "Escolha uma categoria." }) }),
  assunto: z.string().trim().min(3, "Escreva um assunto.").max(160),
  descricao: z.string().trim().min(10, "Descreva a solicitação com pelo menos 10 caracteres.").max(5000),
  consentimento: z.literal("on", { errorMap: () => ({ message: "É preciso concordar com o uso dos dados para responder." }) }),
});

export async function enviarSolicitacao(_prev: SuporteState, fd: FormData): Promise<SuporteState> {
  // 1. Antispam: campo invisível, tempo mínimo e limite por origem.
  if (String(fd.get("site") ?? "") !== "") return { status: "success", message: "Solicitação recebida." }; // robô: finge sucesso
  const segredo = process.env.FORM_SECRET;
  if (segredo) {
    const v = verificarTokenFormulario(String(fd.get("token") ?? ""), segredo);
    if (v === "rapido") return { status: "error", message: "Envio rápido demais. Aguarde alguns segundos e tente de novo." };
    if (v !== "ok") return { status: "error", message: "O formulário expirou. Recarregue a página e envie de novo." };
  }
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
  if (!limiter.check(`suporte:${ip}`).ok) return { status: "error", message: "Muitas solicitações em pouco tempo. Tente novamente mais tarde." };

  // 2. Validação dos campos.
  const parsed = schema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { status: "error", message: "Revise os campos destacados.", fields };
  }
  const d = parsed.data;
  if (pareceSpam(`${d.assunto} ${d.descricao}`)) return { status: "error", message: "A mensagem foi identificada como possível spam. Reescreva sem links promocionais." };

  // 3. Verificação dos anexos pelo conteúdo real.
  const arquivos = fd.getAll("anexos").filter((f): f is File => f instanceof File && f.size > 0);
  if (arquivos.length > MAX_ANEXOS) return { status: "error", fields: { anexos: `Envie no máximo ${MAX_ANEXOS} arquivos.` } };
  const total = arquivos.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL_ANEXOS) return { status: "error", fields: { anexos: "Os anexos somam mais de 4 MB." } };
  const anexos: { nome: string; mime: string; bytes: Uint8Array }[] = [];
  for (const f of arquivos) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const tipo = tipoPorAssinatura(bytes);
    if (!tipo) return { status: "error", fields: { anexos: `“${f.name.slice(0, 60)}” não é PDF, PNG ou JPG.` } };
    anexos.push({ nome: nomeSeguro(f.name, tipo.ext), mime: tipo.mime, bytes });
  }

  const admin = createAdminClient();
  if (!admin) return { status: "error", message: "O atendimento ainda não foi configurado neste ambiente. Tente mais tarde." };

  // Limite por e-mail no banco (vale entre instâncias do servidor).
  const umaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("suporte_solicitacoes").select("id", { count: "exact", head: true }).ilike("email", d.email).gte("created_at", umaHora);
  if ((count ?? 0) >= 3) return { status: "error", message: "Já recebemos 3 solicitações deste e-mail na última hora. Aguarde a resposta." };

  const { user } = await getUser();
  const protocolo = gerarProtocolo();

  // 4. Anexos para o armazenamento privado.
  const armazenados: { path: string; nome: string; tipo: string; tamanho: number }[] = [];
  for (const a of anexos) {
    const path = `${protocolo}/${a.nome}`;
    const { error } = await admin.storage.from("suporte").upload(path, a.bytes, { contentType: a.mime, upsert: false });
    if (error) return { status: "error", message: "Não foi possível guardar os anexos. Tente sem anexos ou mais tarde." };
    armazenados.push({ path, nome: a.nome, tipo: a.mime, tamanho: a.bytes.byteLength });
  }

  // 5. E-mail para a administração (só conta como enviado com confirmação do provedor).
  const categoria = CATEGORIAS_SUPORTE[d.categoria];
  const destino = destinoSuporte();
  const corpoAdmin = modeloEmail(`Nova solicitação ${protocolo}`, [
    `Categoria: ${categoria}`,
    `De: ${d.nome} <${d.email}>${user ? " (usuário com conta)" : " (visitante)"}`,
    `Assunto: ${d.assunto}`,
    d.descricao,
    armazenados.length ? `Anexos: ${armazenados.map((a) => a.nome).join(", ")}` : "Sem anexos.",
  ]);
  const anexosEmail: Anexo[] = anexos.map((a) => ({ filename: a.nome, content: Buffer.from(a.bytes).toString("base64") }));
  const envioAdmin = destino
    ? await enviarEmail({ to: destino, subject: `[${protocolo}] ${categoria}: ${d.assunto}`, ...corpoAdmin, replyTo: d.email, attachments: anexosEmail })
    : ({ status: "nao_configurado" } as const);

  // 6. Confirmação para quem pediu.
  const corpoUsuario = modeloEmail("Recebemos sua solicitação", [
    `Olá, ${d.nome}.`,
    `Seu número de protocolo é ${protocolo}. Guarde-o para acompanhar o atendimento.`,
    `Assunto: ${d.assunto}`,
    "Responderemos neste e-mail. Não é preciso enviar a mesma solicitação de novo.",
  ]);
  const envioUsuario = await enviarEmail({ to: d.email, subject: `Protocolo ${protocolo} — AcademiC Stage`, ...corpoUsuario });

  // 7. Registro com data e situação de cada envio.
  const { error } = await admin.from("suporte_solicitacoes").insert({
    protocolo,
    user_id: user?.id ?? null,
    nome: d.nome,
    email: d.email,
    categoria: d.categoria,
    assunto: d.assunto,
    descricao: d.descricao,
    anexos: armazenados,
    email_admin_status: envioAdmin.status,
    email_admin_id: envioAdmin.status === "enviado" ? envioAdmin.id : null,
    email_usuario_status: envioUsuario.status,
    consentimento_em: new Date().toISOString(),
  });
  if (error) {
    if (armazenados.length) await admin.storage.from("suporte").remove(armazenados.map((a) => a.path));
    return { status: "error", message: "Não foi possível registrar a solicitação. Tente novamente." };
  }

  return {
    status: "success",
    protocolo,
    emailAdmin: envioAdmin.status,
    emailUsuario: envioUsuario.status,
    message: `Solicitação registrada com o protocolo ${protocolo}.`,
  };
}
