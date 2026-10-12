"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { SCHEMAS, TIPOS_DOCUMENTO, conteudoInicial, type TipoDocumento } from "@/lib/documentos";
import type { FormState } from "@/lib/form-state";

const tipoSchema = z.enum(["plano", "atividade", "avaliacao"]);
const uuid = z.string().uuid();

/** Limite de documentos por conta no plano gratuito (configurável no futuro por plano). */
const LIMITE_DOCUMENTOS_GRATUITO = 300;

export async function criarDocumento(fd: FormData) {
  const tipo = tipoSchema.parse(fd.get("tipo"));
  const { supabase } = await requireUser(`/${TIPOS_DOCUMENTO[tipo].rota}`);

  const { count } = await supabase.from("documentos").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= LIMITE_DOCUMENTOS_GRATUITO) redirect("/painel/documentos?erro=limite");

  const turma = uuid.safeParse(fd.get("turma_id"));
  const { data, error } = await supabase
    .from("documentos")
    .insert({
      tipo,
      titulo: `${TIPOS_DOCUMENTO[tipo].label} sem título`,
      turma_id: turma.success ? turma.data : null,
      conteudo: conteudoInicial(tipo),
    })
    .select("id")
    .single();

  if (error || !data) redirect("/painel/documentos?erro=criar");
  redirect(`/painel/documentos/${data.id}`);
}

export type SaveResult = { ok: boolean; message: string; savedAt?: string };

export async function salvarDocumento(input: { id: string; tipo: TipoDocumento; titulo: string; turmaId: string | null; conteudo: unknown }): Promise<SaveResult> {
  const { supabase } = await requireUser("/painel/documentos");
  const id = uuid.safeParse(input.id);
  const tipo = tipoSchema.safeParse(input.tipo);
  const titulo = z.string().trim().min(1, "Dê um título ao documento.").max(160).safeParse(input.titulo);
  if (!id.success || !tipo.success) return { ok: false, message: "Documento inválido." };
  if (!titulo.success) return { ok: false, message: titulo.error.issues[0].message };

  const conteudo = SCHEMAS[tipo.data].safeParse(input.conteudo);
  if (!conteudo.success) {
    const i = conteudo.error.issues[0];
    return { ok: false, message: `Não foi possível salvar: campo “${i.path.join(".")}” — ${i.message}` };
  }

  const turmaId = input.turmaId ? uuid.safeParse(input.turmaId) : null;
  const { data, error } = await supabase
    .from("documentos")
    .update({ titulo: titulo.data, turma_id: turmaId?.success ? turmaId.data : null, conteudo: conteudo.data })
    .eq("id", id.data)
    .select("updated_at")
    .single();

  if (error || !data) return { ok: false, message: "Não foi possível salvar. Verifique a conexão e tente de novo." };
  revalidatePath("/painel/documentos");
  return { ok: true, message: "Salvo", savedAt: data.updated_at };
}

export async function duplicarDocumento(fd: FormData) {
  const { supabase } = await requireUser("/painel/documentos");
  const id = uuid.parse(fd.get("id"));
  const { data: orig } = await supabase.from("documentos").select("tipo,titulo,turma_id,conteudo").eq("id", id).single();
  if (!orig) redirect("/painel/documentos?erro=duplicar");
  const { data } = await supabase
    .from("documentos")
    .insert({ ...orig, titulo: `${orig.titulo} (cópia)`.slice(0, 160) })
    .select("id")
    .single();
  revalidatePath("/painel/documentos");
  redirect(data ? `/painel/documentos/${data.id}` : "/painel/documentos?erro=duplicar");
}

export async function excluirDocumento(fd: FormData) {
  const { supabase } = await requireUser("/painel/documentos");
  const id = uuid.parse(fd.get("id"));
  await supabase.from("documentos").delete().eq("id", id);
  revalidatePath("/painel/documentos");
  redirect("/painel/documentos?excluido=1");
}

const turmaSchema = z.object({
  nome: z.string().trim().min(1, "Dê um nome à turma.").max(80),
  etapa: z.string().trim().max(40).optional().transform((v) => v || null),
  componente: z.string().trim().max(60).optional().transform((v) => v || null),
});

export async function criarTurma(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser("/painel/documentos");
  const parsed = turmaSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { count } = await supabase.from("turmas").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 60) return { status: "error", message: "Limite de 60 turmas atingido." };
  const { error } = await supabase.from("turmas").insert(parsed.data);
  if (error) return { status: "error", message: "Não foi possível criar a turma." };
  revalidatePath("/painel/documentos");
  return { status: "success", message: `Turma “${parsed.data.nome}” criada.` };
}

export async function excluirTurma(fd: FormData) {
  const { supabase } = await requireUser("/painel/documentos");
  const id = uuid.parse(fd.get("id"));
  // Os documentos da turma continuam existindo, só ficam sem turma.
  await supabase.from("turmas").delete().eq("id", id);
  revalidatePath("/painel/documentos");
  redirect("/painel/documentos");
}
