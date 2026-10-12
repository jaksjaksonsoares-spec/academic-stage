import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { hojeSaoPaulo } from "@/lib/concursos";
import { enviarEmail, emailConfigurado, modeloEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/env";
import { avisoDeEstudos, avisosDePrazo, enviaEmailHoje, filtrarPorTopicos, type ConcursoAcompanhado, type Preferencias } from "@/lib/notificacoes";

export const runtime = "nodejs";
export const maxDuration = 60;

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Rotina diária: cria avisos no site e envia o resumo por e-mail a quem pediu. */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada." }, { status: 503 });

  const hoje = hojeSaoPaulo();
  const { data: dest, error } = await admin.rpc("destinatarios_notificacao");
  if (error) return NextResponse.json({ error: "Falha ao ler destinatários." }, { status: 500 });

  let noSite = 0, emails = 0, falhas = 0;
  for (const d of (dest ?? []) as (Preferencias & { user_id: string; email: string })[]) {
    const { data: favs } = await admin.from("favorites").select("item_id").eq("user_id", d.user_id).eq("item_type", "concurso");
    const ids = (favs ?? []).map((f) => f.item_id).filter((id) => /^[0-9a-f-]{36}$/.test(id));
    const { data: concursos } = ids.length
      ? await admin.from("concursos").select("id,slug,titulo,inscricao_fim,data_prova").in("id", ids).eq("publicado", true)
      : { data: [] };
    const { count: sessoes } = await admin.from("sessoes_estudo").select("id", { count: "exact", head: true }).eq("user_id", d.user_id).eq("data", hoje).eq("concluida", false);

    const avisos = filtrarPorTopicos(d, { prazos: avisosDePrazo((concursos ?? []) as ConcursoAcompanhado[], hoje), estudos: avisoDeEstudos(sessoes ?? 0, hoje) });
    if (avisos.length === 0) continue;

    // Avisos no site: a chave única evita repetir o mesmo aviso.
    let novos = avisos;
    if (d.in_app_enabled) {
      const { data: inseridos } = await admin
        .from("notificacoes")
        .upsert(avisos.map((a) => ({ user_id: d.user_id, ...a })), { onConflict: "user_id,chave", ignoreDuplicates: true })
        .select("chave");
      noSite += inseridos?.length ?? 0;
      novos = avisos.filter((a) => (inseridos ?? []).some((i) => i.chave === a.chave));
    }

    if (enviaEmailHoje(d, hoje) && emailConfigurado() && (d.in_app_enabled ? novos.length > 0 : true)) {
      const lista = d.in_app_enabled ? novos : avisos;
      const corpo = modeloEmail(
        "Seus avisos do AcademiC Stage",
        [...lista.map((a) => `• ${a.titulo} — ${a.corpo}\n${getSiteUrl()}${a.link}`), `Para mudar o que recebe: ${getSiteUrl()}/painel/preferencias`],
      );
      const r = await enviarEmail({ to: d.email, subject: lista.length === 1 ? lista[0].titulo : `${lista.length} avisos para você`, ...corpo });
      if (r.status === "enviado") emails++;
      else falhas++;
    }
  }

  await admin.rpc("purge_old_erros").then(() => undefined, () => undefined);
  return NextResponse.json({ destinatarios: (dest ?? []).length, noSite, emails, falhas, em: hoje });
}
