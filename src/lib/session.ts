import "server-only";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

/**
 * Segunda barreira de acesso: além do middleware, toda página e ação privada
 * valida o usuário no servidor antes de ler ou gravar dados.
 */
export async function requireUser(nextPath = "/painel") {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  return { supabase, user };
}

export type Profile = {
  id: string;
  display_name: string;
  uf: string | null;
  municipios: string[];
  etapas: string[];
  componentes: string[];
  objetivos: string;
  interesses: string[];
  onboarding_completed_at: string | null;
  plan: "gratuito" | "profissional" | "institucional";
  created_at: string;
};

export type NotificationPrefs = {
  email_enabled: boolean;
  in_app_enabled: boolean;
  frequency: "imediata" | "diaria" | "semanal";
  topics: string[];
};

/**
 * Acesso administrativo. O banco exige o segundo fator (aal2) para editores e
 * administradores; quem tem o papel mas ainda não passou pelo MFA é levado
 * para a tela de verificação. Quem não tem o papel recebe 404.
 */
async function requirePapel(rpc: "is_editor" | "is_admin", nextPath: string) {
  const { supabase, user } = await requireUser(nextPath);
  const { data, error } = await supabase.rpc(rpc);
  if (!error && data === true) return { supabase, user };
  const { data: temPapel } = await supabase.rpc("tem_papel_administrativo");
  if (temPapel === true) redirect(`/admin/mfa?next=${encodeURIComponent(nextPath)}`);
  notFound();
}

export function requireEditor(nextPath = "/editor/concursos") {
  return requirePapel("is_editor", nextPath);
}

export function requireAdmin(nextPath = "/admin") {
  return requirePapel("is_admin", nextPath);
}
