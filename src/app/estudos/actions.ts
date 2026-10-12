"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { gerarCronograma, responderCartao, type Topico } from "@/lib/estudos";
import { hojeSaoPaulo } from "@/lib/concursos";
import type { FormState } from "@/lib/form-state";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const planoSchema = z.object({
  titulo: z.string().trim().min(1, "Dê um nome ao plano.").max(160),
  data_prova: z.union([data, z.literal("")]).transform((v) => v || null),
  dias_semana: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Escolha pelo menos um dia da semana."),
  minutos_dia: z.coerce.number().int().min(15, "Mínimo de 15 minutos por dia.").max(720),
  minutos_sessao: z.coerce.number().int().min(10).max(240),
  meta_semanal_minutos: z.union([z.literal(""), z.coerce.number().int().min(0).max(10080)]).transform((v) => (v === "" ? null : v)),
  materias: z
    .array(z.object({ materia: z.string().trim().max(120), topicos: z.array(z.string().trim().min(1).max(400)).max(200) }))
    .max(40),
  edital_id: z.union([z.string().uuid(), z.literal("")]).transform((v) => v || null),
});

export async function criarPlanoEstudo(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser("/estudos");
  let materias: unknown = [];
  try {
    materias = JSON.parse(String(fd.get("materias") ?? "[]"));
  } catch {
    return { status: "error", message: "Não foi possível ler os conteúdos." };
  }
  const parsed = planoSchema.safeParse({
    titulo: fd.get("titulo"),
    data_prova: fd.get("data_prova") ?? "",
    dias_semana: fd.getAll("dias_semana"),
    minutos_dia: fd.get("minutos_dia"),
    minutos_sessao: fd.get("minutos_sessao"),
    meta_semanal_minutos: fd.get("meta_semanal_minutos") ?? "",
    materias,
    edital_id: fd.get("edital_id") ?? "",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const d = parsed.data;
  const hoje = hojeSaoPaulo();
  if (d.data_prova && d.data_prova <= hoje) return { status: "error", message: "A data da prova precisa ser depois de hoje." };
  if (d.minutos_sessao > d.minutos_dia) return { status: "error", message: "A sessão não pode ser maior que o tempo diário." };

  const topicos: Topico[] = [];
  d.materias.forEach((m, i) => m.topicos.forEach((t, j) => topicos.push({ id: `m${i}t${j}`, materia: m.materia || "Geral", topico: t })));
  if (topicos.length === 0) return { status: "error", message: "Inclua pelo menos um tópico para estudar." };
  if (topicos.length > 400) return { status: "error", message: "Limite de 400 tópicos por plano." };

  const { data: plano, error } = await supabase
    .from("planos_estudo")
    .insert({
      titulo: d.titulo,
      data_prova: d.data_prova,
      inicio: hoje,
      dias_semana: [...new Set(d.dias_semana)].sort(),
      minutos_dia: d.minutos_dia,
      minutos_sessao: d.minutos_sessao,
      meta_semanal_minutos: d.meta_semanal_minutos,
      topicos,
      edital_id: d.edital_id,
    })
    .select("id")
    .single();
  if (error || !plano) return { status: "error", message: "Não foi possível criar o plano." };

  const cron = gerarCronograma({ topicos, inicio: hoje, dataProva: d.data_prova, diasSemana: d.dias_semana, minutosDia: d.minutos_dia, minutosSessao: d.minutos_sessao });
  if (cron.sessoes.length > 0) {
    const { error: e2 } = await supabase.from("sessoes_estudo").insert(cron.sessoes.slice(0, 3000).map((s) => ({ ...s, plano_id: plano.id })));
    if (e2) return { status: "error", message: "O plano foi criado, mas o cronograma não pôde ser salvo. Abra o plano e gere o cronograma de novo." };
  }

  revalidatePath("/estudos");
  redirect(`/estudos/${plano.id}${cron.avisos.length ? `?avisos=${encodeURIComponent(cron.avisos.join(" | "))}` : ""}`);
}

/** Refaz as sessões futuras não concluídas, mantendo o histórico. */
export async function regerarCronograma(fd: FormData) {
  const { supabase } = await requireUser("/estudos");
  const id = z.string().uuid().parse(fd.get("id"));
  const { data: p } = await supabase.from("planos_estudo").select("*").eq("id", id).single();
  if (!p) redirect("/estudos");
  const hoje = hojeSaoPaulo();

  const { data: feitas } = await supabase.from("sessoes_estudo").select("topico_id").eq("plano_id", id).eq("tipo", "estudo").eq("concluida", true);
  const jaEstudados = new Set((feitas ?? []).map((f) => f.topico_id));
  const pendentes = (p.topicos as Topico[]).filter((t) => !jaEstudados.has(t.id));

  await supabase.from("sessoes_estudo").delete().eq("plano_id", id).eq("concluida", false).gte("data", hoje);
  const cron = gerarCronograma({ topicos: pendentes, inicio: hoje, dataProva: p.data_prova, diasSemana: p.dias_semana, minutosDia: p.minutos_dia, minutosSessao: p.minutos_sessao });
  if (cron.sessoes.length) await supabase.from("sessoes_estudo").insert(cron.sessoes.map((s) => ({ ...s, plano_id: id })));
  revalidatePath(`/estudos/${id}`);
  redirect(`/estudos/${id}?regerado=1${cron.avisos.length ? `&avisos=${encodeURIComponent(cron.avisos.join(" | "))}` : ""}`);
}

const sessaoSchema = z.object({
  id: z.coerce.number().int().positive(),
  concluida: z.boolean(),
  minutos: z.number().int().min(0).max(720).nullable(),
  dificuldade: z.number().int().min(1).max(3).nullable(),
});

export async function atualizarSessao(input: { id: number; concluida: boolean; minutos: number | null; dificuldade: number | null }) {
  const { supabase } = await requireUser("/estudos");
  const s = sessaoSchema.safeParse(input);
  if (!s.success) return { ok: false };
  const { error } = await supabase
    .from("sessoes_estudo")
    .update({
      concluida: s.data.concluida,
      minutos_estudados: s.data.concluida ? s.data.minutos : null,
      dificuldade: s.data.dificuldade,
      concluida_em: s.data.concluida ? new Date().toISOString() : null,
    })
    .eq("id", s.data.id);
  return { ok: !error };
}

export async function excluirPlano(fd: FormData) {
  const { supabase } = await requireUser("/estudos");
  const id = z.string().uuid().parse(fd.get("id"));
  if (fd.get("confirmar") !== "on") redirect(`/estudos/${id}?erro=confirmacao`);
  await supabase.from("planos_estudo").delete().eq("id", id);
  revalidatePath("/estudos");
  redirect("/estudos?excluido=1");
}

/* ── Flashcards ───────────────────────────────────────────────────── */

const cartaoSchema = z.object({
  frente: z.string().trim().min(1, "Escreva a pergunta.").max(1000),
  verso: z.string().trim().min(1, "Escreva a resposta.").max(2000),
  materia: z.string().trim().max(120).default(""),
});

export async function criarFlashcard(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser("/estudos/flashcards");
  const p = cartaoSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { status: "error", message: p.error.issues[0].message };
  const { count } = await supabase.from("flashcards").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 2000) return { status: "error", message: "Limite de 2.000 cartões atingido." };
  const { error } = await supabase.from("flashcards").insert({ ...p.data, proxima_revisao: hojeSaoPaulo() });
  if (error) return { status: "error", message: "Não foi possível salvar o cartão." };
  revalidatePath("/estudos/flashcards");
  return { status: "success", message: "Cartão criado." };
}

export async function responderFlashcard(input: { id: number; acertou: boolean }) {
  const { supabase } = await requireUser("/estudos/flashcards");
  const id = z.number().int().positive().safeParse(input.id);
  if (!id.success) return { ok: false };
  const { data: c } = await supabase.from("flashcards").select("caixa,acertos,erros").eq("id", id.data).single();
  if (!c) return { ok: false };
  const prox = responderCartao(c.caixa, input.acertou, hojeSaoPaulo());
  const { error } = await supabase
    .from("flashcards")
    .update({ ...prox, acertos: c.acertos + (input.acertou ? 1 : 0), erros: c.erros + (input.acertou ? 0 : 1) })
    .eq("id", id.data);
  return { ok: !error, ...prox };
}

export async function excluirFlashcard(fd: FormData) {
  const { supabase } = await requireUser("/estudos/flashcards");
  const id = z.coerce.number().int().positive().parse(fd.get("id"));
  await supabase.from("flashcards").delete().eq("id", id);
  revalidatePath("/estudos/flashcards");
}
