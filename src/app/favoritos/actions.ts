"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

const schema = z.object({
  itemType: z.enum(["concurso", "link", "material", "curso", "edital", "ferramenta"]),
  itemId: z.string().min(1).max(120),
  path: z.string().max(300),
});

export type FavoriteResult = { ok: boolean; saved?: boolean; message?: string };

export async function toggleFavorite(input: { itemType: string; itemId: string; path: string }): Promise<FavoriteResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Item inválido." };

  const { supabase, user } = await getUser();
  if (!supabase || !user) return { ok: false, message: "Entre na sua conta para salvar." };

  const { itemType, itemId, path } = parsed.data;
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("favorites").delete().eq("id", existing.id)
    : await supabase.from("favorites").insert({ user_id: user.id, item_type: itemType, item_id: itemId });

  if (error) return { ok: false, message: "Não foi possível salvar agora. Tente de novo." };
  revalidatePath(safeRedirectPath(path, "/"));
  revalidatePath("/painel");
  return { ok: true, saved: !existing };
}
