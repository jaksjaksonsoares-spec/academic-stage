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

  // Conteúdo criado na plataforma (fases 2 a 5). Tabelas com RLS de dono; filtramos pelo usuário mesmo assim.
  const uid = user.id;
  const [documentos, turmas, planos, sessoes, flashcards, editais, suporte, notificacoes, recursos, denuncias, colecoes, organizacoes, interesses] = await Promise.all([
    supabase.from("documentos").select("*").eq("user_id", uid),
    supabase.from("turmas").select("*").eq("user_id", uid),
    supabase.from("planos_estudo").select("*").eq("user_id", uid),
    supabase.from("sessoes_estudo").select("*").eq("user_id", uid),
    supabase.from("flashcards").select("*").eq("user_id", uid),
    supabase.from("editais_analises").select("*").eq("user_id", uid),
    supabase.from("suporte_solicitacoes").select("protocolo,nome,email,categoria,assunto,descricao,status,resposta,respondida_em,created_at").eq("user_id", uid),
    supabase.from("notificacoes").select("titulo,corpo,link,lida_em,created_at").eq("user_id", uid),
    supabase.from("recursos").select("*").eq("autor_id", uid),
    supabase.from("recurso_denuncias").select("recurso_id,motivo,detalhe,resolvida,created_at").eq("user_id", uid),
    supabase.from("colecoes").select("*, colecao_itens(*)").eq("user_id", uid),
    supabase.from("org_membros").select("papel,created_at,organizacoes(nome,tipo)").eq("user_id", uid),
    supabase.from("interesse_planos").select("plano,created_at").eq("user_id", uid),
  ]);

  const failed = [profile, prefs, favorites, consents, events, roles, documentos, turmas, planos, sessoes, flashcards, editais, suporte, notificacoes, recursos, denuncias, colecoes, organizacoes, interesses].find((r) => r.error);
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
    documentos: documentos.data,
    turmas: turmas.data,
    planos_de_estudo: planos.data,
    sessoes_de_estudo: sessoes.data,
    flashcards: flashcards.data,
    analises_de_edital: editais.data,
    solicitacoes_de_atendimento: suporte.data,
    notificacoes: notificacoes.data,
    materiais_compartilhados: recursos.data,
    denuncias_feitas: denuncias.data,
    colecoes: colecoes.data,
    organizacoes: organizacoes.data,
    interesse_em_planos: interesses.data,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="academic-stage-meus-dados.json"`,
      "Cache-Control": "no-store",
    },
  });
}
