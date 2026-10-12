"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { enviarEmail, modeloEmail } from "@/lib/email";
import type { FormState } from "@/lib/form-state";

type Supa = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function auditar(supabase: Supa, acao: string, alvoTipo: string, alvoId: string, detalhes: Record<string, unknown> = {}) {
  await supabase.rpc("registrar_auditoria", { _acao: acao, _alvo_tipo: alvoTipo, _alvo_id: alvoId, _detalhes: detalhes });
}

/* ── Usuários ─────────────────────────────────────────────────────── */

export async function definirPapel(fd: FormData) {
  const { supabase } = await requireAdmin("/admin/usuarios");
  const usuario = z.string().uuid().parse(fd.get("usuario"));
  const papel = z.enum(["editor", "admin"]).parse(fd.get("papel"));
  const ativo = fd.get("ativo") === "1";
  const voltar = String(fd.get("voltar") ?? "/admin/usuarios");
  if (!ativo && fd.get("confirmar") !== "on") redirect(`${voltar.startsWith("/admin/usuarios") ? voltar : "/admin/usuarios"}${voltar.includes("?") ? "&" : "?"}erro=confirmacao`);
  const { error } = await supabase.rpc("admin_definir_papel", { _usuario: usuario, _papel: papel, _ativo: ativo });
  revalidatePath("/admin/usuarios");
  redirect(`/admin/usuarios?${error ? `erro=${encodeURIComponent(error.message.slice(0, 120))}` : "ok=papel"}`);
}

/* ── Suporte ──────────────────────────────────────────────────────── */

const respostaSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["aberta", "em_andamento", "respondida", "encerrada"]),
  resposta: z.string().trim().max(10000).optional().default(""),
  enviar: z.enum(["", "1"]).optional().default(""),
});

export type RespostaState = FormState & { emailStatus?: string };

export async function atualizarSolicitacao(_prev: RespostaState, fd: FormData): Promise<RespostaState> {
  const { supabase, user } = await requireAdmin("/admin/suporte");
  const p = respostaSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { status: "error", message: "Dados inválidos." };
  const { id, status, resposta, enviar } = p.data;
  if (enviar === "1" && !resposta) return { status: "error", message: "Escreva a resposta antes de enviar." };

  const { data: s } = await supabase.from("suporte_solicitacoes").select("protocolo,email,nome,assunto").eq("id", id).single();
  if (!s) return { status: "error", message: "Solicitação não encontrada." };

  let emailStatus: string | undefined;
  if (enviar === "1") {
    const corpo = modeloEmail(`Resposta ao protocolo ${s.protocolo}`, [`Olá, ${s.nome}.`, `Assunto: ${s.assunto}`, resposta]);
    const r = await enviarEmail({ to: s.email, subject: `Re: [${s.protocolo}] ${s.assunto}`, ...corpo });
    emailStatus = r.status;
    if (r.status !== "enviado") {
      return {
        status: "error",
        message: r.status === "nao_configurado" ? "O envio de e-mails não está configurado. A resposta não foi enviada." : "O provedor não confirmou o envio. A resposta não foi enviada; tente de novo.",
      };
    }
  }

  const { error } = await supabase
    .from("suporte_solicitacoes")
    .update({
      status,
      ...(resposta ? { resposta } : {}),
      ...(enviar === "1" ? { respondida_em: new Date().toISOString(), respondida_por: user.id } : {}),
    })
    .eq("id", id);
  if (error) return { status: "error", message: "Não foi possível salvar." };
  await auditar(supabase, enviar === "1" ? "suporte_respondido" : "suporte_atualizado", "suporte", s.protocolo, { status });
  revalidatePath(`/admin/suporte/${id}`);
  revalidatePath("/admin/suporte");
  return { status: "success", message: enviar === "1" ? "Resposta enviada por e-mail e registrada." : "Alterações salvas.", emailStatus };
}

/* ── Links úteis ──────────────────────────────────────────────────── */

const linkSchema = z.object({
  id: z.union([z.literal(""), z.coerce.number().int().positive()]).optional(),
  titulo: z.string().trim().min(2).max(120),
  url: z.string().trim().url().max(1000).refine((u) => u.startsWith("https://"), "Use https://"),
  descricao: z.string().trim().min(10, "Descrição muito curta.").max(400),
  orgao: z.string().trim().min(2).max(120),
  categoria: z.enum(["legislacao", "concursos", "formacao", "planejamento", "avaliacao", "inclusao", "pesquisa", "tecnologia"]),
  ativo: z.enum(["on"]).optional(),
});

export async function salvarLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin("/admin/links");
  const p = linkSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { status: "error", message: p.error.issues[0].message };
  const { id, ativo, ...dados } = p.data;
  const row = { ...dados, ativo: ativo === "on" };
  const { error } = id ? await supabase.from("links_uteis").update(row).eq("id", id) : await supabase.from("links_uteis").insert(row);
  if (error) return { status: "error", message: error.code === "23505" ? "Esse endereço já está cadastrado." : "Não foi possível salvar." };
  await auditar(supabase, id ? "link_editado" : "link_criado", "link", String(id ?? dados.url), { url: dados.url });
  revalidatePath("/admin/links");
  revalidatePath("/links");
  return { status: "success", message: "Link salvo." };
}

export async function excluirLink(fd: FormData) {
  const { supabase } = await requireAdmin("/admin/links");
  const id = z.coerce.number().int().positive().parse(fd.get("id"));
  if (fd.get("confirmar") !== "on") redirect("/admin/links?erro=confirmacao");
  await supabase.from("links_uteis").delete().eq("id", id);
  await auditar(supabase, "link_excluido", "link", String(id));
  revalidatePath("/admin/links");
  revalidatePath("/links");
  redirect("/admin/links?ok=excluido");
}

/* ── Configurações ────────────────────────────────────────────────── */

const n = z.coerce.number().int().min(0).max(5000);
const limitesSchema = z.object({
  gratuito_assistente: n, gratuito_edital: n,
  profissional_assistente: n, profissional_edital: n,
  institucional_assistente: n, institucional_edital: n,
});

export async function salvarLimites(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireAdmin("/admin/configuracoes");
  const p = limitesSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { status: "error", message: "Use números inteiros entre 0 e 5000." };
  const v = p.data;
  const valor = {
    gratuito: { assistente: v.gratuito_assistente, edital: v.gratuito_edital },
    profissional: { assistente: v.profissional_assistente, edital: v.profissional_edital },
    institucional: { assistente: v.institucional_assistente, edital: v.institucional_edital },
  };
  const { error } = await supabase.from("config_plataforma").update({ valor, updated_at: new Date().toISOString(), updated_by: user.id }).eq("chave", "limites_ia");
  if (error) return { status: "error", message: "Não foi possível salvar." };
  await auditar(supabase, "config_alterada", "config", "limites_ia", valor);
  revalidatePath("/admin/configuracoes");
  return { status: "success", message: "Limites atualizados. Valem a partir da próxima solicitação." };
}
