"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireEditor } from "@/lib/session";
import { slugify } from "@/lib/concursos";
import { UFS } from "@/lib/validation";
import type { FormState } from "@/lib/form-state";

type Supa = Awaited<ReturnType<typeof requireEditor>>["supabase"];
async function auditar(supabase: Supa, acao: string, alvoId: string, detalhes: Record<string, unknown> = {}) {
  await supabase.rpc("registrar_auditoria", { _acao: acao, _alvo_tipo: "concurso", _alvo_id: alvoId, _detalhes: detalhes });
}

const url = z.string().trim().url("Informe um link completo, começando com https://").max(1000).refine((v) => /^https?:\/\//.test(v), "Use http ou https.");
const optUrl = z.union([url, z.literal("")]).transform((v) => v || null);
const optText = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const optDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).transform((v) => v || null);
const optNum = z.union([z.literal(""), z.coerce.number().min(0).max(1_000_000)]).transform((v) => (v === "" ? null : v));

const cargoSchema = z.object({
  cargo: z.string().trim().min(2, "Informe o cargo.").max(200),
  area: z.enum(["professor", "pedagogo", "gestor", "apoio", "educacao_especial", "outro"]),
  escolaridade: z.enum(["medio", "tecnico", "superior", "especializacao", "mestrado", "doutorado"]),
  formacao_exigida: optText(500),
  requisitos: optText(2000),
  vagas: z.union([z.literal(""), z.null(), z.coerce.number().int().min(0).max(100000)]).transform((v) => (v === "" ? null : v)),
  cadastro_reserva: z.boolean(),
  remuneracao: z.union([z.literal(""), z.null(), z.coerce.number().min(0).max(1_000_000)]).transform((v) => (v === "" ? null : v)),
  carga_horaria: optText(60),
  regime: z.union([z.enum(["estatutario", "celetista", "temporario", "outro"]), z.literal("")]).transform((v) => v || null),
});

const concursoSchema = z
  .object({
    titulo: z.string().trim().min(5, "Título muito curto.").max(200),
    orgao: z.string().trim().min(2, "Informe o órgão.").max(200),
    esfera: z.enum(["municipal", "estadual", "federal", "privada"]),
    uf: z.enum(UFS, { errorMap: () => ({ message: "Escolha o estado." }) }),
    municipio: optText(120),
    tipo_selecao: z.enum(["concurso", "processo_seletivo_simplificado"]),
    fase: z.enum(["previsto", "edital_publicado", "encerrado", "suspenso", "cancelado"]),
    banca: optText(120),
    modalidade: z.union([z.enum(["presencial", "remota", "hibrida"]), z.literal("")]).transform((v) => v || null),
    data_publicacao: optDate,
    inscricao_inicio: optDate,
    inscricao_fim: optDate,
    data_prova: optDate,
    taxa_inscricao: optNum,
    edital_url: optUrl,
    inscricao_url: optUrl,
    fonte_nome: z.string().trim().min(2, "Informe a fonte.").max(200),
    fonte_url: url,
    conteudo_programatico: optText(20000),
    observacoes: optText(2000),
    cargos: z.array(cargoSchema).min(1, "Inclua pelo menos um cargo.").max(40),
  })
  .refine((d) => !d.inscricao_inicio || !d.inscricao_fim || d.inscricao_fim >= d.inscricao_inicio, {
    message: "O fim das inscrições não pode ser antes do início.",
    path: ["inscricao_fim"],
  })
  .refine((d) => d.fase !== "edital_publicado" || d.edital_url, {
    message: "Com edital publicado, o link do edital é obrigatório.",
    path: ["edital_url"],
  });

function errorsOf(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) {
    const k = i.path[0] === "cargos" ? "cargos" : String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.path[0] === "cargos" && typeof i.path[1] === "number" ? `Cargo ${i.path[1] + 1}: ${i.message}` : i.message;
  }
  return out;
}

export async function salvarConcurso(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireEditor();
  const id = String(fd.get("id") ?? "") || null;

  let cargosRaw: unknown = [];
  try {
    cargosRaw = JSON.parse(String(fd.get("cargos") ?? "[]"));
  } catch {
    return { status: "error", message: "Não foi possível ler os cargos." };
  }

  const raw = Object.fromEntries([...fd.entries()].filter(([k]) => k !== "cargos" && k !== "id"));
  const parsed = concursoSchema.safeParse({ ...raw, cargos: cargosRaw });
  if (!parsed.success) return { status: "error", message: "Revise os campos destacados.", fields: errorsOf(parsed.error) };

  const { cargos, ...dados } = parsed.data;

  let concursoId = id;
  if (id) {
    const { error } = await supabase.from("concursos").update(dados).eq("id", id);
    if (error) return { status: "error", message: `Não foi possível salvar: ${error.message}` };
    await supabase.from("concurso_cargos").delete().eq("concurso_id", id);
  } else {
    const base = slugify(`${dados.orgao} ${dados.titulo}`) || "concurso";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 120);
    const { data, error } = await supabase
      .from("concursos")
      .insert({ ...dados, slug, criado_por: user.id, publicado: false })
      .select("id")
      .single();
    if (error || !data) return { status: "error", message: `Não foi possível criar: ${error?.message ?? "erro"}` };
    concursoId = data.id;
  }

  const { error: cErr } = await supabase.from("concurso_cargos").insert(cargos.map((k) => ({ ...k, concurso_id: concursoId })));
  if (cErr) return { status: "error", message: `Concurso salvo, mas os cargos falharam: ${cErr.message}` };

  await auditar(supabase, id ? "concurso_editado" : "concurso_criado", String(concursoId), { titulo: dados.titulo });
  revalidatePath("/concursos");
  revalidatePath("/editor/concursos");
  if (!id) redirect(`/editor/concursos/${concursoId}?criado=1`);
  return { status: "success", message: "Alterações salvas." };
}

const verificacaoSchema = z.object({
  id: z.string().uuid(),
  fonte_url: url,
  observacao: optText(1000),
});

export async function registrarVerificacao(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireEditor();
  const parsed = verificacaoSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { status: "error", fields: errorsOf(parsed.error) };

  const { error } = await supabase.from("concurso_verificacoes").insert({
    concurso_id: parsed.data.id,
    fonte_url: parsed.data.fonte_url,
    observacao: parsed.data.observacao,
    verificado_por: user.id,
  });
  if (error) return { status: "error", message: "Não foi possível registrar a verificação." };
  await auditar(supabase, "concurso_verificado", parsed.data.id, { fonte_url: parsed.data.fonte_url });
  revalidatePath(`/editor/concursos/${parsed.data.id}`);
  revalidatePath("/concursos", "layout");
  return { status: "success", message: "Verificação registrada agora." };
}

export async function definirPublicacao(fd: FormData) {
  const { supabase } = await requireEditor();
  const id = z.string().uuid().parse(fd.get("id"));
  const publicar = fd.get("publicar") === "1";
  const { error } = await supabase.from("concursos").update({ publicado: publicar }).eq("id", id);
  if (!error) await auditar(supabase, publicar ? "concurso_publicado" : "concurso_despublicado", id);
  revalidatePath("/concursos", "layout");
  revalidatePath(`/editor/concursos/${id}`);
  redirect(`/editor/concursos/${id}?${error ? "erro=publicacao" : publicar ? "publicado=1" : "despublicado=1"}`);
}

export async function excluirConcurso(fd: FormData) {
  const { supabase } = await requireEditor();
  const id = z.string().uuid().parse(fd.get("id"));
  if (fd.get("confirmar") !== "EXCLUIR") redirect(`/editor/concursos/${id}?erro=confirmacao`);
  const { error } = await supabase.from("concursos").delete().eq("id", id);
  if (!error) await auditar(supabase, "concurso_excluido", id);
  revalidatePath("/concursos", "layout");
  redirect("/editor/concursos?excluido=1");
}
