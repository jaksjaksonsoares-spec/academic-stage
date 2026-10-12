import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { formatData } from "@/lib/concursos";
import type { ResultadoEdital } from "@/lib/edital-analise";
import { Icon } from "@/components/icon";
import { excluirAnalise } from "../actions";
import { PlanoDoEdital } from "./plano-do-edital";

export const metadata: Metadata = { title: "Edital analisado", robots: { index: false } };

function Paginas({ paginas }: { paginas: (number | null)[] }) {
  const ps = [...new Set(paginas.filter((p): p is number => p != null))].sort((a, b) => a - b);
  if (ps.length === 0) return null;
  return <span className="whitespace-nowrap text-sm font-bold text-[var(--action)]">{ps.length === 1 ? `p. ${ps[0]}` : `pp. ${ps.join(", ")}`}</span>;
}

export default async function EditalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase } = await requireUser(`/editais/${id}`);
  const { data } = await supabase.from("editais_analises").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data.resultado as ResultadoEdital;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/editais" className="text-sm text-[var(--muted)] hover:underline">Central de editais</Link>
      <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.75rem)] font-extrabold">{data.titulo}</h1>
      <p className="mt-2 text-[var(--muted)]">
        {r.metodo === "ia" ? "Analisado com IA, com páginas citadas" : "Leitura por palavras-chave"}
        {data.paginas ? ` · ${data.paginas} páginas` : ""}
        {data.origem_url && <> · <a href={data.origem_url} target="_blank" rel="noopener noreferrer" className="underline">documento original</a></>}
      </p>

      <div role="note" className="mt-6 flex gap-3 rounded-[var(--radius-card)] border border-dashed border-[#d08a00] p-4 text-[0.97rem]">
        <Icon name="alert" className="h-5 w-5 shrink-0 text-[#d08a00]" />
        <p>
          Resumo automático para orientar a leitura. Confira cada ponto na página indicada do edital. Não é orientação jurídica; o edital e suas retificações prevalecem.
        </p>
      </div>

      {r.avisos.length > 0 && (
        <details className="mt-6 rounded-[var(--radius-control)] border border-[var(--line)] p-4">
          <summary className="cursor-pointer font-bold">O que não foi possível identificar ({r.avisos.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--muted)]">{r.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
        </details>
      )}

      <nav aria-label="Seções" className="mt-8 flex flex-wrap gap-2">
        <a href="#plano" className="rounded-full bg-[var(--action)] px-4 py-1.5 text-sm font-bold text-[var(--action-text)]">Transformar em plano de estudos</a>
        {r.datas.length > 0 && <a href="#datas" className="rounded-full border border-[var(--line)] px-4 py-1.5 text-sm font-bold">Datas</a>}
        {r.conteudos.length > 0 && <a href="#conteudos" className="rounded-full border border-[var(--line)] px-4 py-1.5 text-sm font-bold">Conteúdos</a>}
        <a href="#secoes" className="rounded-full border border-[var(--line)] px-4 py-1.5 text-sm font-bold">Regras e requisitos</a>
      </nav>

      {r.resumoIA && r.resumoIA.length > 0 && (
        <section aria-labelledby="ia" className="mt-12">
          <h2 id="ia" className="text-2xl font-bold">Resumo com IA</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Gerado por IA a partir do PDF. As páginas são as citadas pela própria IA.</p>
          <div className="mt-4 space-y-4">
            {r.resumoIA.map((s) => (
              <article key={s.id} className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold">{s.titulo}</h3>
                  {s.paginas.length > 0 ? <Paginas paginas={s.paginas} /> : <span className="text-sm text-[var(--muted)]">sem página citada</span>}
                </div>
                <p className="mt-2 whitespace-pre-line">{s.texto || "—"}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {r.datas.length > 0 && (
        <section id="datas" aria-labelledby="datas-t" className="mt-12 scroll-mt-24">
          <h2 id="datas-t" className="text-2xl font-bold">Datas encontradas</h2>
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {r.datas.map((d, i) => (
              <li key={i} className="grid gap-1 py-3 sm:grid-cols-[120px_1fr_auto] sm:gap-4">
                <strong>{formatData(d.data)}</strong>
                <span className="text-[var(--muted)]">{d.contexto}</span>
                <Paginas paginas={[d.pagina]} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.conteudos.length > 0 && (
        <section id="conteudos" aria-labelledby="cont-t" className="mt-12 scroll-mt-24">
          <h2 id="cont-t" className="text-2xl font-bold">Conteúdos cobrados</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {r.conteudos.map((b, i) => (
              <article key={i} className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-bold">{b.materia}</h3>
                  <Paginas paginas={[b.pagina]} />
                </div>
                <ul className="mt-2 list-disc pl-5 text-[0.97rem]">{b.topicos.map((t) => <li key={t}>{t}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>
      )}

      <section id="secoes" aria-labelledby="sec-t" className="mt-12 scroll-mt-24">
        <h2 id="sec-t" className="text-2xl font-bold">Regras e requisitos — trechos do edital</h2>
        <div className="mt-4 space-y-3">
          {r.secoes.filter((s) => s.trechos.length > 0).map((s) => (
            <details key={s.id} className="rounded-[var(--radius-card)] border border-[var(--line)] p-4" open={["requisitos", "isencao", "desempate"].includes(s.id)}>
              <summary className="flex cursor-pointer items-center justify-between gap-3 font-bold">
                {s.titulo} <Paginas paginas={s.trechos.map((t) => t.pagina)} />
              </summary>
              <ul className="mt-3 space-y-2">
                {s.trechos.map((t, i) => (
                  <li key={i} className="flex gap-3 border-l-2 border-[var(--line)] pl-3 text-[0.97rem]">
                    <span className="flex-1">{t.texto}</span>
                    <Paginas paginas={[t.pagina]} />
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section id="plano" aria-labelledby="plano-t" className="mt-14 scroll-mt-24 rounded-[var(--radius-stage)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lift)] sm:p-8">
        <h2 id="plano-t" className="text-2xl font-bold">Transformar este edital em plano de estudos</h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Revise os conteúdos (um tópico por linha, agrupados por matéria), informe a data da prova e o seu tempo disponível.
        </p>
        <PlanoDoEdital editalId={data.id} titulo={data.titulo} conteudos={r.conteudos} datas={r.datas} />
      </section>

      <form action={excluirAnalise} className="mt-10">
        <input type="hidden" name="id" value={data.id} />
        <button type="submit" className="text-sm font-bold text-[var(--color-danger)] underline">Excluir esta análise</button>
      </form>
    </div>
  );
}
