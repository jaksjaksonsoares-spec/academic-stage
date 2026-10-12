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

/** Acesso de editor: confere o papel no banco (a RLS confere de novo em cada escrita). */
export async function requireEditor(nextPath = "/editor/concursos") {
  const { supabase, user } = await requireUser(nextPath);
  const { data, error } = await supabase.rpc("is_editor");
  if (error || data !== true) {
    notFound();
  }
  return { supabase, user };
}
