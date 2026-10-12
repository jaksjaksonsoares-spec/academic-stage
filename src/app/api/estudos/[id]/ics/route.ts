import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { gerarIcs, type EventoDia } from "@/lib/ics";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  const { supabase, user } = await getUser();
  if (!supabase || !user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: plano } = await supabase.from("planos_estudo").select("id,titulo,data_prova").eq("id", id).maybeSingle();
  if (!plano) return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  const { data: sessoes } = await supabase.from("sessoes_estudo").select("id,data,topico,materia,tipo,minutos_planejados").eq("plano_id", id).eq("concluida", false).order("data").limit(3000);

  // Um evento por dia, listando o que estudar — mais legível na agenda do celular.
  const porDia = new Map<string, string[]>();
  for (const s of sessoes ?? []) {
    const rotulo = s.tipo === "estudo" ? "Estudar" : s.tipo === "revisao" ? "Revisar" : "Revisão geral";
    porDia.set(s.data, [...(porDia.get(s.data) ?? []), `${rotulo}: ${s.topico} (${s.materia}, ${s.minutos_planejados} min)`]);
  }
  const eventos: EventoDia[] = [...porDia.entries()].map(([data, itens]) => ({
    uid: `${plano.id}-${data}`,
    data,
    titulo: `Estudos — ${itens.length} ${itens.length === 1 ? "sessão" : "sessões"}`,
    descricao: itens.join("\n"),
  }));
  if (plano.data_prova) eventos.push({ uid: `${plano.id}-prova`, data: plano.data_prova, titulo: `Prova — ${plano.titulo}` });

  return new NextResponse(gerarIcs(plano.titulo, eventos), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="plano-de-estudos.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
