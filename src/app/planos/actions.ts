"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";

/** Registra (ou retira) o interesse em um plano pago. Não há cobrança: serve para avisar quando abrir. */
export async function alternarInteresse(fd: FormData) {
  const { supabase, user } = await requireUser("/planos");
  const plano = z.enum(["profissional", "institucional"]).parse(fd.get("plano"));
  if (fd.get("acao") === "remover") {
    await supabase.from("interesse_planos").delete().eq("user_id", user.id).eq("plano", plano);
  } else {
    await supabase.from("interesse_planos").upsert({ user_id: user.id, plano }, { onConflict: "user_id,plano", ignoreDuplicates: true });
  }
  revalidatePath("/planos");
}
