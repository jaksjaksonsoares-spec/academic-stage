import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkLink, proximoEstado } from "@/lib/link-check";

export const runtime = "nodejs";
export const maxDuration = 60;

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * Chamada pela Vercel Cron (vercel.json) uma vez por dia, com o cabeçalho
 * Authorization: Bearer CRON_SECRET. Testa todos os links e grava o resultado.
 */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada." }, { status: 503 });

  const { data: links, error } = await admin.from("links_uteis").select("id,url,ativo,falhas_consecutivas");
  if (error) return NextResponse.json({ error: "Falha ao ler links." }, { status: 500 });

  const agora = new Date().toISOString();
  const resultados = await Promise.all(
    (links ?? []).map(async (l) => {
      const r = await checkLink(l.url);
      const novo = proximoEstado(l, r);
      await admin.from("links_uteis").update({ ...novo, ultima_verificacao_em: agora }).eq("id", l.id);
      return { id: l.id, ok: r.ok, status: r.status };
    }),
  );

  return NextResponse.json({
    verificados: resultados.length,
    falhas: resultados.filter((r) => !r.ok).length,
    em: agora,
  });
}
