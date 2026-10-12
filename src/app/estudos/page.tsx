import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { hojeSaoPaulo, formatData } from "@/lib/concursos";
import { Icon } from "@/components/icon";
import { FormMessage } from "@/components/ui";

export const metadata: Metadata = {
  title: "Preparação para concursos",
  description: "Plano de estudos com revisões espaçadas, agenda semanal, controle de tempo, metas, flashcards e relatório de dificuldades por matéria.",
  alternates: { canonical: "/estudos" },
};

export default async function EstudosPage({ searchParams }: { searchParams: Promise<{ excluido?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  const hoje = hojeSaoPaulo();

  if (!supabase || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <Cabecalho />
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/cadastro" className="rounded-[var(--radius-control)] bg-[var(--action)] px-6 py-3 font-bold text-[var(--action-text)]">Criar conta gratuita</Link>
          <Link href="/entrar?next=/estudos" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-6 py-3 font-bold">Já tenho conta</Link>
        </div>
        <Recursos />
      </div>
    );
  }

  const [{ data: planos }, { data: hojeSessoes }, { count: cartoesHoje }] = await Promise.all([
    supabase.from("planos_estudo").select("id,titulo,data_prova,created_at").order("created_at", { ascending: false }),
    supabase.from("sessoes_estudo").select("id,plano_id,topico,materia,tipo,concluida,minutos_planejados").eq("data", hoje).order("tipo"),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).lte("proxima_revisao", hoje),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <Cabecalho />
      {sp.excluido && <div className="mt-6"><FormMessage status="success" message="Plano excluído." /></div>}

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="hoje" className="rounded-[var(--radius-card)] bg-[var(--color-ink)] p-6 text-white">
          <h2 id="hoje" className="text-xl font-bold">Hoje</h2>
          {hojeSessoes && hojeSessoes.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {hojeSessoes.map((s) => (
                <li key={s.id} className={`flex gap-2 ${s.concluida ? "opacity-60 line-through" : ""}`}>
                  <span className="text-[var(--color-spot)]">{s.tipo === "estudo" ? "Estudar" : "Revisar"}</span>
                  <span>{s.topico} <span className="text-[#a3afcc]">· {s.minutos_planejados} min</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[#c3cce3]">Nada programado para hoje.</p>
          )}
        </section>
        <section aria-labelledby="cartoes" className="rounded-[var(--radius-card)] border border-[var(--line)] p-6">
          <h2 id="cartoes" className="text-xl font-bold">Flashcards</h2>
          <p className="mt-2 text-[var(--muted)]">{cartoesHoje ? `${cartoesHoje} ${cartoesHoje === 1 ? "cartão para revisar" : "cartões para revisar"} hoje.` : "Nenhum cartão para revisar hoje."}</p>
          <Link href="/estudos/flashcards" className="mt-4 inline-block rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold hover:border-[var(--muted)]">
            {cartoesHoje ? "Revisar agora" : "Criar cartões"}
          </Link>
        </section>
      </div>

      <section aria-labelledby="planos" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="planos" className="text-2xl font-bold">Seus planos</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/editais" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold">A partir de um edital</Link>
            <Link href="/estudos/novo" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2 font-bold text-[var(--action-text)]">Novo plano</Link>
          </div>
        </div>
        {planos && planos.length > 0 ? (
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {planos.map((p) => (
              <li key={p.id}>
                <Link href={`/estudos/${p.id}`} className="flex flex-wrap justify-between gap-2 py-4 hover:underline">
                  <span className="font-bold">{p.titulo}</span>
                  <span className="text-sm text-[var(--muted)]">{p.data_prova ? `Prova em ${formatData(p.data_prova)}` : "Sem data de prova"}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[var(--muted)]">Você ainda não tem planos. Comece por um edital — os conteúdos já vêm preenchidos — ou monte do zero.</p>
        )}
      </section>
      <Recursos />
    </div>
  );
}

function Cabecalho() {
  return (
    <div className="flex items-start gap-5">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-ink)] text-[var(--color-spot)]">
        <Icon name="calendar" className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Preparação para concursos</h1>
        <p className="mt-3 max-w-2xl text-lg text-[var(--muted)]">
          Monte um cronograma a partir do edital, acompanhe o tempo estudado e revise no momento certo.
        </p>
      </div>
    </div>
  );
}

function Recursos() {
  const itens = [
    "Cronograma automático pela data da prova e pelo seu tempo disponível",
    "Matérias intercaladas e revisões depois de 1, 7 e 30 dias",
    "Revisão geral nos últimos dias antes da prova",
    "Agenda semanal, registro de minutos e de dificuldade por sessão",
    "Meta semanal e relatório de evolução por matéria",
    "Flashcards com revisão espaçada (caixas de Leitner)",
    "Exportação do cronograma para a agenda do celular (.ics)",
  ];
  return (
    <section aria-labelledby="recursos" className="mt-14">
      <h2 id="recursos" className="text-xl font-bold">O que dá para fazer</h2>
      <ul className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
        {itens.map((r) => (
          <li key={r} className="flex gap-3"><Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-[var(--action)]" /><span>{r}</span></li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-[var(--muted)]">
        Simulados com questões de provas anteriores dependem de um banco de questões com autorização de uso e ainda não estão disponíveis. Você pode montar provas autorais em “Provas e avaliações”.
      </p>
    </section>
  );
}
