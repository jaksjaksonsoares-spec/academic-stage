"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { LICENCAS_AUTOR, TIPOS_RECURSO, atribuicao, type Licenca } from "@/lib/biblioteca";
import { lerConteudo, type TipoDocumento } from "@/lib/documentos";
import { detectarDadosPessoais, descreverAchados } from "@/lib/dados-pessoais";
import { limiteDocumentos } from "@/lib/limites";
import { ETAPAS } from "@/lib/validation";
import type { FormState } from "@/lib/form-state";

const uuid = z.string().uuid();

const compartilharSchema = z.object({
  documento_id: uuid,
  titulo: z.string().trim().min(3, "Título muito curto.").max(160),
  descricao: z.string().trim().min(10, "Descreva o material em pelo menos 10 caracteres.").max(1500),
  tipo: z.enum(Object.keys(TIPOS_RECURSO) as [string, ...string[]]),
  etapas: z.array(z.enum(ETAPAS.map((e) => e.value) as [string, ...string[]])).max(9),
  componente: z.string().trim().max(80).optional().transform((v) => v || null),
  licenca: z.enum(LICENCAS_AUTOR as [Licenca, ...Licenca[]], { errorMap: () => ({ message: "Escolha uma licença." }) }),
  destino: z.string().regex(/^(publica|org:[0-9a-f-]{36})$/),
  declaracao: z.literal("on", { errorMap: () => ({ message: "Confirme que o material é de sua autoria e pode ser compartilhado." }) }),
});

export async function compartilharDocumento(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/biblioteca/compartilhar");
  const p = compartilharSchema.safeParse({ ...Object.fromEntries(fd.entries()), etapas: fd.getAll("etapas") });
  if (!p.success) return { status: "error", message: p.error.issues[0].message };
  const d = p.data;

  const { data: doc } = await supabase.from("documentos").select("id,tipo,conteudo").eq("id", d.documento_id).maybeSingle();
  if (!doc) return { status: "error", message: "Documento não encontrado." };
  const conteudo = lerConteudo(doc.tipo as TipoDocumento, doc.conteudo);

  // Material compartilhado não pode levar dados pessoais de estudantes.
  const achados = detectarDadosPessoais(JSON.stringify(conteudo));
  if (achados.length) return { status: "error", message: `${descreverAchados(achados)} Edite o documento antes de compartilhar.` };

  const { data: perfil } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  const orgId = d.destino.startsWith("org:") ? d.destino.slice(4) : null;

  const { data, error } = await supabase
    .from("recursos")
    .insert({
      titulo: d.titulo,
      descricao: d.descricao,
      tipo: d.tipo,
      etapas: d.etapas,
      componente: d.componente,
      documento_tipo: doc.tipo,
      conteudo,
      licenca: d.licenca,
      autor_id: user.id,
      autor_nome: perfil?.display_name || null,
      origem: orgId ? "organizacao" : "comunidade",
      visibilidade: orgId ? "organizacao" : "publica",
      org_id: orgId,
    })
    .select("id,status")
    .single();
  if (error || !data) return { status: "error", message: error?.code === "42501" ? "Você não participa dessa organização." : "Não foi possível compartilhar." };
  revalidatePath("/biblioteca");
  redirect(`/biblioteca/minhas?enviado=${data.status === "publicado" ? "org" : "revisao"}`);
}

export async function copiarRecurso(fd: FormData) {
  const { supabase } = await requireUser("/biblioteca");
  const id = uuid.parse(fd.get("id"));
  const { data: r } = await supabase.from("recursos").select("id,titulo,documento_tipo,conteudo,licenca,autor_nome,fonte_nome").eq("id", id).maybeSingle();
  if (!r || !r.conteudo || !r.documento_tipo) redirect(`/biblioteca/${id}?erro=copia`);
  if ((await limiteDocumentos(supabase)).restantes <= 0) redirect(`/biblioteca/${id}?erro=limite`);

  // A atribuição exigida pela licença acompanha a cópia.
  const credito = atribuicao({ titulo: r.titulo, autor_nome: r.autor_nome, fonte_nome: r.fonte_nome, licenca: r.licenca as Licenca });
  const tipo = r.documento_tipo as TipoDocumento;
  const c = lerConteudo(tipo, r.conteudo) as Record<string, unknown>;
  if (tipo === "plano") c.referencias = [c.referencias, `Adaptado de: ${credito}`].filter(Boolean).join("\n");
  else if (tipo === "texto") c.corpo = `${c.corpo}\n\n—\nAdaptado de: ${credito}`;
  else c.instrucoes = [c.instrucoes, `Material adaptado de: ${credito}`].filter(Boolean).join("\n");

  const { data: novo } = await supabase.from("documentos").insert({ tipo, titulo: `${r.titulo} (cópia)`.slice(0, 160), conteudo: c }).select("id").single();
  if (!novo) redirect(`/biblioteca/${id}?erro=copia`);
  await supabase.rpc("registrar_copia_recurso", { _id: id });
  revalidatePath("/painel/documentos");
  redirect(`/painel/documentos/${novo.id}`);
}

const denunciaSchema = z.object({
  id: uuid,
  motivo: z.enum(["direitos_autorais", "erro_conteudo", "inadequado", "dados_pessoais", "outro"]),
  detalhe: z.string().trim().max(1000).optional().transform((v) => v || null),
});

export async function denunciarRecurso(fd: FormData) {
  const { supabase } = await requireUser("/biblioteca");
  const p = denunciaSchema.parse(Object.fromEntries(fd.entries()));
  await supabase.from("recurso_denuncias").upsert({ recurso_id: p.id, motivo: p.motivo, detalhe: p.detalhe }, { onConflict: "recurso_id,user_id", ignoreDuplicates: true });
  redirect(`/biblioteca/${p.id}?denuncia=1`);
}

export async function removerMeuRecurso(fd: FormData) {
  const { supabase } = await requireUser("/biblioteca/minhas");
  const id = uuid.parse(fd.get("id"));
  await supabase.from("recursos").delete().eq("id", id);
  revalidatePath("/biblioteca");
  redirect("/biblioteca/minhas?removido=1");
}

/* ── Coleções ─────────────────────────────────────────────────────── */

export async function criarColecao(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser("/biblioteca/minhas");
  const nome = z.string().trim().min(1, "Dê um nome à coleção.").max(80).safeParse(fd.get("nome"));
  if (!nome.success) return { status: "error", message: nome.error.issues[0].message };
  const { count } = await supabase.from("colecoes").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 50) return { status: "error", message: "Limite de 50 coleções." };
  const { error } = await supabase.from("colecoes").insert({ nome: nome.data });
  if (error) return { status: "error", message: "Não foi possível criar a coleção." };
  revalidatePath("/biblioteca/minhas");
  return { status: "success", message: "Coleção criada." };
}

export async function adicionarAColecao(fd: FormData) {
  const { supabase } = await requireUser("/biblioteca");
  const colecao = uuid.parse(fd.get("colecao"));
  const recurso = uuid.parse(fd.get("recurso"));
  await supabase.from("colecao_itens").upsert({ colecao_id: colecao, recurso_id: recurso }, { ignoreDuplicates: true });
  revalidatePath("/biblioteca/minhas");
  redirect(`/biblioteca/${recurso}?colecao=1`);
}

export async function removerDaColecao(fd: FormData) {
  const { supabase } = await requireUser("/biblioteca/minhas");
  await supabase.from("colecao_itens").delete().eq("colecao_id", uuid.parse(fd.get("colecao"))).eq("recurso_id", uuid.parse(fd.get("recurso")));
  revalidatePath("/biblioteca/minhas");
}

export async function excluirColecao(fd: FormData) {
  const { supabase } = await requireUser("/biblioteca/minhas");
  await supabase.from("colecoes").delete().eq("id", uuid.parse(fd.get("id")));
  revalidatePath("/biblioteca/minhas");
}
