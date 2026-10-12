"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEditor } from "@/lib/session";
import { TIPOS_RECURSO } from "@/lib/biblioteca";
import { ETAPAS } from "@/lib/validation";
import type { FormState } from "@/lib/form-state";

const uuid = z.string().uuid();
type Supa = Awaited<ReturnType<typeof requireEditor>>["supabase"];
const auditar = (s: Supa, acao: string, id: string, d: Record<string, unknown> = {}) =>
  s.rpc("registrar_auditoria", { _acao: acao, _alvo_tipo: "recurso", _alvo_id: id, _detalhes: d });

export async function moderarRecurso(fd: FormData) {
  const { supabase, user } = await requireEditor("/editor/biblioteca");
  const id = uuid.parse(fd.get("id"));
  const decisao = z.enum(["aprovar", "recusar", "arquivar"]).parse(fd.get("decisao"));
  const motivo = z.string().trim().max(500).parse(fd.get("motivo") ?? "");
  if (decisao === "recusar" && !motivo) redirect("/editor/biblioteca?erro=motivo");
  const status = decisao === "aprovar" ? "publicado" : decisao === "recusar" ? "recusado" : "arquivado";
  await supabase
    .from("recursos")
    .update({ status, motivo_recusa: decisao === "recusar" ? motivo : null, revisado_por: user.id, revisado_em: new Date().toISOString() })
    .eq("id", id);
  await auditar(supabase, `recurso_${status}`, id, motivo ? { motivo } : {});
  revalidatePath("/biblioteca");
  revalidatePath("/editor/biblioteca");
  redirect("/editor/biblioteca?ok=1");
}

export async function resolverDenuncia(fd: FormData) {
  const { supabase } = await requireEditor("/editor/biblioteca");
  const id = z.coerce.number().int().positive().parse(fd.get("id"));
  await supabase.from("recurso_denuncias").update({ resolvida: true }).eq("id", id);
  revalidatePath("/editor/biblioteca");
}

const curadoriaSchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  descricao: z.string().trim().min(10).max(1500),
  tipo: z.enum(Object.keys(TIPOS_RECURSO) as [string, ...string[]]),
  etapas: z.array(z.enum(ETAPAS.map((e) => e.value) as [string, ...string[]])).max(9),
  componente: z.string().trim().max(80).optional().transform((v) => v || null),
  link_url: z.string().trim().url().refine((u) => u.startsWith("https://"), "Use https://"),
  fonte_nome: z.string().trim().min(2).max(200),
  licenca: z.enum(["link-externo", "cc-by-4.0", "cc-by-sa-4.0", "cc-by-nc-4.0", "cc-by-nc-sa-4.0", "cc0", "dominio-publico"]),
});

/** Curadoria: indica um recurso externo confiável. A plataforma só aponta para a fonte. */
export async function adicionarCuradoria(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireEditor("/editor/biblioteca");
  const p = curadoriaSchema.safeParse({ ...Object.fromEntries(fd.entries()), etapas: fd.getAll("etapas") });
  if (!p.success) return { status: "error", message: p.error.issues[0].message };
  const { data, error } = await supabase
    .from("recursos")
    .insert({ ...p.data, origem: "curadoria", visibilidade: "publica", status: "publicado", autor_id: user.id, revisado_por: user.id, revisado_em: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: "Não foi possível adicionar." };
  await auditar(supabase, "recurso_curado", data.id, { link: p.data.link_url });
  revalidatePath("/biblioteca");
  return { status: "success", message: "Recurso publicado na biblioteca." };
}
