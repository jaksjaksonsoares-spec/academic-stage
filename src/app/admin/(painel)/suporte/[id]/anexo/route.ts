import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Entrega um anexo de atendimento por link assinado de 60 segundos, só para administradores com MFA. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Inválido." }, { status: 400 });
  const { supabase, user } = await getUser();
  if (!supabase || !user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const path = req.nextUrl.searchParams.get("path") ?? "";
  const { data: s } = await supabase.from("suporte_solicitacoes").select("protocolo,anexos").eq("id", id).maybeSingle();
  const anexos = (s?.anexos ?? []) as { path: string }[];
  if (!s || !anexos.some((a) => a.path === path)) return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });

  const service = createAdminClient();
  if (!service) return NextResponse.json({ error: "Armazenamento não configurado." }, { status: 503 });
  const { data, error } = await service.storage.from("suporte").createSignedUrl(path, 60, { download: true });
  if (error || !data) return NextResponse.json({ error: "Não foi possível gerar o link." }, { status: 500 });
  await supabase.rpc("registrar_auditoria", { _acao: "anexo_baixado", _alvo_tipo: "suporte", _alvo_id: s.protocolo, _detalhes: { path } });
  return NextResponse.redirect(data.signedUrl);
}
