"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authLimiter } from "@/lib/rate-limit";
import type { FormState } from "@/lib/form-state";
import {
  deleteAccountSchema,
  fieldErrors,
  formDataToObject,
  interestsSchema,
  notificationSchema,
  profileSchema,
} from "@/lib/validation";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/painel/perfil");
  const parsed = profileSchema.safeParse(formDataToObject(formData, ["etapas"]));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error), message: "Revise os campos destacados." };

  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.displayName,
      uf: d.uf || null,
      municipios: d.municipios,
      etapas: d.etapas,
      componentes: d.componentes,
      objetivos: d.objetivos,
    })
    .eq("id", user.id);

  if (error) return { status: "error", message: "Não foi possível salvar o perfil. Tente novamente." };
  await supabase.from("security_events").insert({ user_id: user.id, event_type: "perfil_atualizado" });
  revalidatePath("/painel", "layout");
  return { status: "success", message: "Perfil salvo." };
}

export async function saveInterests(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/boas-vindas");
  const skip = formData.get("intent") === "pular";
  const parsed = interestsSchema.safeParse(formDataToObject(formData, ["interesses"]));
  if (!parsed.success) return { status: "error", message: "Seleção inválida." };

  const { error } = await supabase
    .from("profiles")
    .update({
      ...(skip ? {} : { interesses: parsed.data.interesses }),
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  revalidatePath("/painel", "layout");
  redirect("/painel");
}

export async function updateInterests(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/painel/preferencias");
  const parsed = interestsSchema.safeParse(formDataToObject(formData, ["interesses"]));
  if (!parsed.success) return { status: "error", message: "Seleção inválida." };
  const { error } = await supabase.from("profiles").update({ interesses: parsed.data.interesses }).eq("id", user.id);
  if (error) return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  revalidatePath("/painel", "layout");
  return { status: "success", message: "Interesses salvos." };
}

export async function updateNotifications(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/painel/preferencias");
  const parsed = notificationSchema.safeParse({
    emailEnabled: formData.get("emailEnabled") === "on",
    inAppEnabled: formData.get("inAppEnabled") === "on",
    frequency: formData.get("frequency"),
    topics: formData.getAll("topics"),
  });
  if (!parsed.success) return { status: "error", message: "Revise as opções de notificação." };

  const d = parsed.data;
  const { error } = await supabase
    .from("notification_preferences")
    .update({
      email_enabled: d.emailEnabled,
      in_app_enabled: d.inAppEnabled,
      frequency: d.frequency,
      topics: d.topics,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  await supabase.from("security_events").insert({ user_id: user.id, event_type: "preferencias_atualizadas" });
  return { status: "success", message: "Preferências de notificação salvas." };
}

/**
 * Exclusão de conta: confirma a senha, apaga o usuário no Supabase Auth e,
 * por cascata, todos os dados ligados a ele (perfil, favoritos, eventos...).
 */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/painel/conta");
  const parsed = deleteAccountSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };

  if (!authLimiter.check(`delete:${user.id}`).ok) {
    return { status: "error", message: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      status: "error",
      message: "A exclusão automática ainda não foi ativada (falta a chave de serviço no servidor). Peça a exclusão pelo canal de suporte.",
    };
  }

  // Reautenticação: confere a senha num cliente separado, sem alterar a sessão atual.
  const { createClient: createPlainClient } = await import("@supabase/supabase-js");
  const checker = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: pwError } = await checker.auth.signInWithPassword({ email: user.email!, password: parsed.data.password });
  if (pwError) return { status: "error", fields: { password: "Senha incorreta." } };
  await checker.auth.signOut();

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { status: "error", message: "Não foi possível excluir a conta agora. Tente novamente ou fale com o suporte." };

  const current = await createClient();
  await current?.auth.signOut();
  redirect("/entrar?conta=excluida");
}
