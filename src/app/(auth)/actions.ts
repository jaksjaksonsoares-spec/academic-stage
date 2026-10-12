"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { authLimiter } from "@/lib/rate-limit";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSiteUrl } from "@/lib/env";
import { TERMS_VERSION, type FormState } from "@/lib/form-state";
import {
  fieldErrors,
  forgotPasswordSchema,
  formDataToObject,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";

const NOT_CONFIGURED: FormState = {
  status: "error",
  message: "A autenticação ainda não foi ativada neste ambiente. Configure o Supabase (veja o README).",
};

const TOO_MANY: FormState = {
  status: "error",
  message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
};

async function clientKey(scope: string, email?: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
  return `${scope}:${ip}:${email ?? ""}`;
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(formDataToObject(formData));
  const values = { displayName: String(formData.get("displayName") ?? ""), email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error), values };

  if (!authLimiter.check(await clientKey("signup")).ok) return { ...TOO_MANY, values };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirmar?next=/boas-vindas`,
      data: { display_name: parsed.data.displayName, terms_version: TERMS_VERSION },
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { status: "error", fields: { password: "Essa senha é considerada fraca ou já apareceu em vazamentos. Escolha outra." }, values };
    }
    if (error.status === 429) return { ...TOO_MANY, values };
    // Não revela se o e-mail já está cadastrado (evita enumeração de contas).
    console.error("[signUp]", error.code ?? error.status);
  }

  return {
    status: "success",
    message: `Se o endereço ${parsed.data.email} puder ser cadastrado, você receberá um e-mail de confirmação. Abra o link para ativar sua conta.`,
  };
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(formDataToObject(formData));
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error), values };

  if (!authLimiter.check(await clientKey("signin", parsed.data.email)).ok) return { ...TOO_MANY, values };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { status: "error", message: "Confirme seu e-mail antes de entrar. Procure a mensagem de confirmação na sua caixa de entrada.", values };
    }
    if (error.status === 429) return { ...TOO_MANY, values };
    return { status: "error", message: "E-mail ou senha incorretos.", values };
  }

  await supabase.from("security_events").insert({ user_id: data.user.id, event_type: "login" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", data.user.id)
    .single();

  const fallback = profile?.onboarding_completed_at ? "/painel" : "/boas-vindas";
  redirect(safeRedirectPath(parsed.data.next, fallback));
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };

  if (!authLimiter.check(await clientKey("reset", parsed.data.email)).ok) return TOO_MANY;

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/confirmar?next=/redefinir-senha`,
  });
  if (error && error.status === 429) return TOO_MANY;
  if (error) console.error("[requestPasswordReset]", error.code ?? error.status);

  return {
    status: "success",
    message: "Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. O link expira em pouco tempo.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };

  const { supabase, user } = await getUser();
  if (!supabase) return NOT_CONFIGURED;
  if (!user) return { status: "error", message: "O link expirou. Peça um novo em “Recuperar senha”." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { status: "error", fields: { password: "Escolha uma senha diferente da atual." } };
    if (error.code === "weak_password") return { status: "error", fields: { password: "Essa senha é considerada fraca. Escolha outra." } };
    return { status: "error", message: "Não foi possível atualizar a senha. Tente novamente." };
  }

  await supabase.from("security_events").insert({ user_id: user.id, event_type: "senha_redefinida" });
  // Encerra as outras sessões depois de trocar a senha.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/painel?senha=atualizada");
}

export async function signOut() {
  const { supabase, user } = await getUser();
  if (supabase && user) {
    await supabase.from("security_events").insert({ user_id: user.id, event_type: "logout" });
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function signOutEverywhere() {
  const { supabase, user } = await getUser();
  if (supabase && user) {
    await supabase.from("security_events").insert({ user_id: user.id, event_type: "logout" });
    await supabase.auth.signOut({ scope: "global" });
  }
  redirect("/entrar?sessoes=encerradas");
}
