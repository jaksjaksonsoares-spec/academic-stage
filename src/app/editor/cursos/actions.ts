"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEditor } from "@/lib/session";
import { slugify } from "@/lib/concursos";
import { UFS } from "@/lib/validation";
import type { FormState } from "@/lib/form-state";

type Supa = Awaited<ReturnType<typeof requireEditor>>["supabase"];
const auditar = (s: Supa, acao: string, id: string, d: Record<string, unknown> = {}) =>
  s.rpc("registrar_auditoria", { _acao: acao, _alvo_tipo: "curso", _alvo_id: id, _detalhes: d });

const https = z.string().trim().url("Informe um link completo.").refine((u) => u.startsWith("https://"), "Use https://");
const opt = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const optData = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).transform((v) => v || null);

const schema = z
  .object({
    titulo: z.string().trim().min(5, "Título muito curto.").max(200),
    instituicao: z.string().trim().min(2, "Informe a instituição.").max(200),
    tipo: z.enum(["livre", "extensao", "aperfeicoamento", "lato_sensu", "mestrado", "doutorado", "evento", "webinar", "bolsa", "programa", "selecao_academica"]),
    modalidade: z.enum(["presencial", "ead", "hibrido"]),
    gratuito: z.enum(["sim", "nao"]).transform((v) => v === "sim"),
    custo: opt(200),
    carga_horaria: z.union([z.literal(""), z.coerce.number().int().min(1).max(10000)]).transform((v) => (v === "" ? null : v)),
    duracao: opt(100),
    publico: opt(500),
    requisitos: opt(2000),
    inscricao_fim: optData,
    inicio: optData,
    certificacao: opt(500),
    reconhecimento_conferido: z.enum(["on"]).optional().transform((v) => v === "on"),
    reconhecimento_fonte: z.union([https, z.literal("")]).transform((v) => v || null),
    uf: z.union([z.enum(UFS), z.literal("")]).transform((v) => v || null),
    link_oficial: https,
    fonte_nome: z.string().trim().min(2, "Informe a fonte.").max(200),
  })
  .refine((d) => d.gratuito || d.custo, { message: "Informe o custo do curso pago.", path: ["custo"] })
  .refine((d) => !d.reconhecimento_conferido || d.reconhecimento_fonte, { message: "Informe o link onde o reconhecimento foi conferido.", path: ["reconhecimento_fonte"] });

export async function salvarCurso(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireEditor("/editor/cursos");
  const id = String(fd.get("id") ?? "") || null;
  const p = schema.safeParse(Object.fromEntries([...fd.entries()].filter(([k]) => k !== "id")));
  if (!p.success) {
    const fields: Record<string, string> = {};
    for (const i of p.error.issues) fields[String(i.path[0])] ??= i.message;
    return { status: "error", message: "Revise os campos destacados.", fields };
  }
  if (id) {
    const { error } = await supabase.from("cursos").update(p.data).eq("id", id);
    if (error) return { status: "error", message: "Não foi possível salvar." };
    await auditar(supabase, "curso_salvo", id);
    revalidatePath("/formacao", "layout");
    return { status: "success", message: "Curso salvo." };
  }
  const slug = `${slugify(`${p.data.instituicao} ${p.data.titulo}`) || "curso"}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 120);
  const { data, error } = await supabase.from("cursos").insert({ ...p.data, slug, criado_por: user.id }).select("id").single();
  if (error || !data) return { status: "error", message: "Não foi possível criar o curso." };
  await auditar(supabase, "curso_salvo", data.id);
  redirect(`/editor/cursos?editar=${data.id}`);
}

export async function verificarCurso(fd: FormData) {
  const { supabase } = await requireEditor("/editor/cursos");
  const id = z.string().uuid().parse(fd.get("id"));
  await supabase.from("cursos").update({ ultima_verificacao_em: new Date().toISOString() }).eq("id", id);
  await auditar(supabase, "curso_verificado", id);
  revalidatePath("/formacao", "layout");
  redirect(`/editor/cursos?editar=${id}&ok=verificado`);
}

export async function publicarCurso(fd: FormData) {
  const { supabase } = await requireEditor("/editor/cursos");
  const id = z.string().uuid().parse(fd.get("id"));
  const publicar = fd.get("publicar") === "1";
  const { error } = await supabase.from("cursos").update({ publicado: publicar }).eq("id", id);
  if (!error) await auditar(supabase, publicar ? "curso_publicado" : "curso_despublicado", id);
  revalidatePath("/formacao", "layout");
  redirect(`/editor/cursos?editar=${id}&${error ? "erro=publicar" : "ok=publicacao"}`);
}

export async function excluirCurso(fd: FormData) {
  const { supabase } = await requireEditor("/editor/cursos");
  const id = z.string().uuid().parse(fd.get("id"));
  if (fd.get("confirmar") !== "on") redirect(`/editor/cursos?editar=${id}&erro=confirmacao`);
  await supabase.from("cursos").delete().eq("id", id);
  await auditar(supabase, "curso_excluido", id);
  revalidatePath("/formacao", "layout");
  redirect("/editor/cursos?ok=excluido");
}
