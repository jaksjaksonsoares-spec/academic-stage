import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

/**
 * Portabilidade (LGPD, art. 18, V): devolve em JSON todos os dados pessoais
 * que a plataforma guarda sobre quem está logado.
 */
export async function GET() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const [profile, prefs, favorites, consents, events, roles] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).single(),
    supabase.from("favorites").select("item_type,item_id,created_at").eq("user_id", user.id),
    supabase.from("consents").select("document,version,accepted_at").eq("user_id", user.id),
    supabase.from("security_events").select("event_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("user_roles").select("role,granted_at").eq("user_id", user.id),
  ]);

  const failed = [profile, prefs, favorites, consents, events, roles].find((r) => r.error);
  if (failed) return NextResponse.json({ error: "Não foi possível gerar a exportação. Tente novamente." }, { status: 500 });

  await supabase.from("security_events").insert({ user_id: user.id, event_type: "dados_exportados" });

  const body = {
    gerado_em: new Date().toISOString(),
    conta: { id: user.id, email: user.email, criada_em: user.created_at, email_confirmado_em: user.email_confirmed_at ?? null },
    perfil: profile.data,
    preferencias_de_notificacao: prefs.data,
    favoritos: favorites.data,
    consentimentos: consents.data,
    papeis: roles.data,
    eventos_de_seguranca: events.data,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="academic-stage-meus-dados.json"`,
      "Cache-Control": "no-store",
    },
  });
}
