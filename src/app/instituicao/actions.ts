"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { UFS } from "@/lib/validation";
import { getSiteUrl } from "@/lib/env";
import type { FormState } from "@/lib/form-state";

const uuid = z.string().uuid();

const orgSchema = z.object({
  nome: z.string().trim().min(3, "Nome muito curto.").max(160),
  tipo: z.enum(["escola", "rede", "instituicao"]),
  uf: z.union([z.enum(UFS), z.literal("")]),
  municipio: z.string().trim().max(120).optional().default(""),
});

export async function criarOrganizacao(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser("/instituicao");
  const p = orgSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { status: "error", message: p.error.issues[0].message };
  const { data, error } = await supabase.rpc("criar_organizacao", { _nome: p.data.nome, _tipo: p.data.tipo, _uf: p.data.uf, _municipio: p.data.municipio });
  if (error || !data) return { status: "error", message: error?.message.includes("Limite") ? "Você já gerencia 5 organizações." : "Não foi possível criar." };
  redirect(`/instituicao/${data}`);
}

export type ConviteState = { status: "idle" | "success" | "error"; message?: string; link?: string };

/** Gera um link de convite. O token aparece uma única vez; no banco fica só o hash. */
export async function criarConvite(_prev: ConviteState, fd: FormData): Promise<ConviteState> {
  const { supabase } = await requireUser("/instituicao");
  const org = uuid.safeParse(fd.get("org"));
  const papel = z.enum(["membro", "gestor"]).safeParse(fd.get("papel"));
  const dias = z.coerce.number().int().min(1).max(30).safeParse(fd.get("dias"));
  if (!org.success || !papel.success || !dias.success) return { status: "error", message: "Dados inválidos." };
  const token = randomBytes(32).toString("base64url");
  const { error } = await supabase.from("org_convites").insert({
    org_id: org.data,
    token_hash: createHash("sha256").update(token, "utf8").digest("hex"),
    papel: papel.data,
    expira_em: new Date(Date.now() + dias.data * 86400000).toISOString(),
  });
  if (error) return { status: "error", message: "Só a gestão pode criar convites." };
  revalidatePath(`/instituicao/${org.data}`);
  return { status: "success", link: `${getSiteUrl()}/instituicao/convite/${token}`, message: "Copie o link agora: por segurança, ele não será mostrado de novo." };
}

export async function revogarConvite(fd: FormData) {
  const { supabase } = await requireUser("/instituicao");
  const id = uuid.parse(fd.get("id"));
  const org = uuid.parse(fd.get("org"));
  await supabase.from("org_convites").update({ revogado: true }).eq("id", id);
  revalidatePath(`/instituicao/${org}`);
}

export async function aceitarConvite(fd: FormData) {
  const { supabase } = await requireUser("/instituicao");
  const token = z.string().regex(/^[A-Za-z0-9_-]{20,100}$/).safeParse(fd.get("token"));
  if (!token.success) redirect("/instituicao?erro=convite");
  const { data, error } = await supabase.rpc("aceitar_convite", { _token: token.data });
  if (error || !data) redirect("/instituicao?erro=convite");
  revalidatePath("/instituicao");
  redirect(`/instituicao/${data}?bemvindo=1`);
}

export async function alterarMembro(fd: FormData) {
  const { supabase, user } = await requireUser("/instituicao");
  const org = uuid.parse(fd.get("org"));
  const membro = uuid.parse(fd.get("membro"));
  const acao = z.enum(["tornar_gestor", "tornar_membro", "remover", "sair"]).parse(fd.get("acao"));
  let error;
  if (acao === "remover" || acao === "sair") {
    if (acao === "sair" && membro !== user.id) redirect(`/instituicao/${org}`);
    ({ error } = await supabase.from("org_membros").delete().eq("org_id", org).eq("user_id", membro));
  } else {
    ({ error } = await supabase.from("org_membros").update({ papel: acao === "tornar_gestor" ? "gestor" : "membro" }).eq("org_id", org).eq("user_id", membro));
  }
  revalidatePath(`/instituicao/${org}`);
  if (error) redirect(`/instituicao/${org}?erro=${encodeURIComponent(error.message.includes("gestor") ? "gestor" : "membro")}`);
  redirect(acao === "sair" ? "/instituicao?saiu=1" : `/instituicao/${org}?ok=membro`);
}

export async function excluirOrganizacao(fd: FormData) {
  const { supabase } = await requireUser("/instituicao");
  const org = uuid.parse(fd.get("org"));
  if (fd.get("confirmar") !== "EXCLUIR") redirect(`/instituicao/${org}?erro=confirmacao`);
  await supabase.from("organizacoes").delete().eq("id", org);
  revalidatePath("/instituicao");
  redirect("/instituicao?excluida=1");
}
