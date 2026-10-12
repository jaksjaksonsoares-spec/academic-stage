import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { formatData, hojeSaoPaulo } from "@/lib/concursos";
import { addDias, inicioDaSemana, minutosNaSemana, resumoPorMateria, type SessaoRegistro } from "@/lib/estudos";
import { FormMessage } from "@/components/ui";
import { Icon } from "@/components/icon";
import { excluirPlano, regerarCronograma } from "../actions";
import { SessaoItem, type SessaoView } from "./sessao-item";

export const metadata: Metadata = { title: "Plano de estudos", robots: { index: false } };

const NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function PlanoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ semana?: string; avisos?: string; regerado?: string; erro?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const { supabase } = await requireUser(`/estudos/${id}`);

  const { data: plano } = await supabase.from("planos_estudo").select("*").eq("id", id).maybeSingle();
  if (!plano) notFound();
  const { data: sessoesRaw } = await supabase
    .from("sessoes_estudo")
    .select("id,data,topico,materia,tipo,minutos_planejados,concluida,minutos_estudados,dificuldade")
    .eq("plano_id", id)
    .order("data")
    .limit(5000);
  const sessoes = (sessoesRaw ?? []) as (SessaoView & SessaoRegistro)[];

  const hoje = hojeSaoPaulo();
  const semana = sp.semana && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana) ? inicioDaSemana(sp.semana) : inicioDaSemana(hoje);
  const dias = Array.from({ length: 7 }, (_, i) => addDias(semana, i));

  const total = sessoes.length;
  const concluidas = sessoes.filter((s) => s.concluida).length;
  const atrasadas = sessoes.filter((s) => !s.concluida && s.data < hoje).length;
  const semanaAtual = minutosNaSemana(sessoes, hoje);
  const materias = resumoPorMateria(sessoes);
  const diasProva = plano.data_prova ? Math.round((Date.parse(plano.data_prova) - Date.parse(hoje)) / 86400000) : null;
  const meta = plano.meta_semanal_minutos as number | null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/estudos" className="text-sm text-[var(--muted)] hover:underline">Preparação para concursos</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.8rem,4vw,2.75rem)] font-extrabold">{plano.titulo}</h1>
          <p className="mt-1 text-[var(--muted)]">
            {plano.data_prova ? `Prova em ${formatData(plano.data_prova)}${diasProva != null && diasProva >= 0 ? ` — faltam ${diasProva} dias` : ""}` : "Sem data de prova"}
            {plano.edital_id && <> · <Link href={`/editais/${plano.edital_id}`} className="underline">ver edital analisado</Link></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/estudos/${plano.id}/ics`} className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold"><Icon name="calendar" className="h-4 w-4" /> Exportar para agenda</a>
          <form action={regerarCronograma}>
            <input type="hidden" name="id" value={plano.id} />
            <button type="submit" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold" title="Reorganiza as sessões futuras não concluídas a partir de hoje">Reorganizar a partir de hoje</button>
          </form>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {sp.regerado && <FormMessage status="success" message="Cronograma reorganizado a partir de hoje. O histórico foi mantido." />}
        {sp.avisos && <FormMessage status="error" message={sp.avisos.split(" | ").join(" ")} />}
        {sp.erro === "confirmacao" && <FormMessage status="error" message="Marque a confirmação para excluir o plano." />}
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat rotulo="Progresso" valor={total ? `${Math.round((concluidas / total) * 100)}%` : "—"} detalhe={`${concluidas} de ${total} sessões`} />
        <Stat rotulo="Esta semana" valor={`${semanaAtual.estudados} min`} detalhe={meta ? `meta: ${meta} min` : `planejado: ${semanaAtual.planejados} min`} />
        <Stat rotulo="Atrasadas" valor={String(atrasadas)} detalhe={atrasadas ? "use “Reorganizar” para redistribuir" : "em dia"} />
        <Stat rotulo="Matérias" valor={String(materias.length)} detalhe={`${(plano.topicos as unknown[]).length} tópicos`} />
      </dl>
      {meta ? (
        <div className="mt-3" aria-label={`Meta semanal: ${Math.min(100, Math.round((semanaAtual.estudados / meta) * 100))}%`}>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full rounded-full bg-[var(--action)]" style={{ width: `${Math.min(100, (semanaAtual.estudados / meta) * 100)}%` }} />
          </div>
        </div>
      ) : null}

      <section aria-labelledby="agenda" className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="agenda" className="text-2xl font-bold">Semana de {formatData(semana)}</h2>
          <nav aria-label="Semanas" className="flex gap-2">
            <Link href={`?semana=${addDias(semana, -7)}`} className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-bold">Anterior</Link>
            <Link href={`?semana=${inicioDaSemana(hoje)}`} className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-bold">Hoje</Link>
            <Link href={`?semana=${addDias(semana, 7)}`} className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-bold">Próxima</Link>
          </nav>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dias.map((d) => {
            const doDia = sessoes.filter((s) => s.data === d);
            const ehHoje = d === hoje;
            return (
              <div key={d} className={`rounded-[var(--radius-card)] border p-3 ${ehHoje ? "border-[var(--action)]" : "border-[var(--line)]"}`}>
                <h3 className="mb-2 flex items-baseline justify-between font-bold">
                  {NOMES_DIA[new Date(`${d}T12:00:00Z`).getUTCDay()]}
                  <span className="text-sm font-normal text-[var(--muted)]">{formatData(d)?.slice(0, 5)}{ehHoje ? " · hoje" : ""}</span>
                </h3>
                {doDia.length === 0 ? <p className="text-sm text-[var(--muted)]">Livre</p> : <ul className="space-y-2">{doDia.map((s) => <SessaoItem key={s.id} s={s} />)}</ul>}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="relatorio" className="mt-12">
        <h2 id="relatorio" className="text-2xl font-bold">Evolução por matéria</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Matérias com mais sessões marcadas como “difícil” aparecem primeiro.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="border-b-2 border-[var(--text)] text-sm">
              <tr><th className="py-2 pr-4">Matéria</th><th className="py-2 pr-4">Concluídas</th><th className="py-2 pr-4">Tempo</th><th className="py-2">Marcadas como difícil</th></tr>
            </thead>
            <tbody>
              {materias.map((m) => (
                <tr key={m.materia} className="border-b border-[var(--line)]">
                  <td className="py-2 pr-4 font-bold">{m.materia}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-2 w-20 overflow-hidden rounded-full bg-[var(--line)]"><span className="block h-full bg-[var(--action)]" style={{ width: `${m.planejadas ? (m.concluidas / m.planejadas) * 100 : 0}%` }} /></span>
                      {m.concluidas}/{m.planejadas}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{Math.floor(m.minutos / 60)}h{String(m.minutos % 60).padStart(2, "0")}</td>
                  <td className="py-2">{m.dificeis > 0 ? <strong className="text-[var(--color-danger)]">{m.dificeis}</strong> : "0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form action={excluirPlano} className="mt-12 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-6">
        <input type="hidden" name="id" value={plano.id} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmar" className="h-4 w-4" /> Confirmo que quero excluir este plano e todo o histórico</label>
        <button type="submit" className="text-sm font-bold text-[var(--color-danger)] underline">Excluir plano</button>
      </form>
    </div>
  );
}

function Stat({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--line)] p-4">
      <dt className="text-sm text-[var(--muted)]">{rotulo}</dt>
      <dd className="font-[family-name:var(--font-display)] text-3xl font-extrabold">{valor}</dd>
      <dd className="text-sm text-[var(--muted)]">{detalhe}</dd>
    </div>
  );
}
