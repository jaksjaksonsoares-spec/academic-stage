import type { Metadata } from "next";
import Link from "next/link";
import {
  AREAS_CARGO,
  ESCOLARIDADES,
  MODALIDADES,
  REGIMES,
  REGIOES,
  SITUACOES,
  TIPOS_SELECAO,
  formatBRL,
  formatData,
  lerFiltros,
  type Filtros,
} from "@/lib/concursos";
import { buscarConcursos, POR_PAGINA } from "@/lib/concursos-query";
import { UFS } from "@/lib/validation";
import { SituacaoBadge } from "@/components/situacao-badge";
import { Icon } from "@/components/icon";

export const metadata: Metadata = {
  title: "Concursos e processos seletivos na educação",
  description: "Concursos e seleções para professores, pedagogos e profissionais da educação em todo o Brasil, sempre com link para o edital oficial e data de verificação.",
  alternates: { canonical: "/concursos" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ConcursosPage({ searchParams }: { searchParams: SP }) {
  const f = lerFiltros(await searchParams);
  const result = await buscarConcursos(f);
  const paginas = Math.max(1, Math.ceil(result.total / POR_PAGINA));
  const temFiltro = Object.entries(f).some(([k, v]) => k !== "pagina" && v !== undefined);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Concursos e processos seletivos</h1>
        <p className="mt-3 text-lg text-[var(--muted)]">
          Cada oportunidade traz o link do edital oficial e a data em que foi conferida. “Inscrições abertas” só aparece com
          verificação feita nos últimos 7 dias.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[280px_1fr]">
        <FiltrosForm f={f} />

        <section aria-labelledby="resultados" aria-live="polite">
          <h2 id="resultados" className="sr-only">Resultados</h2>

          {!result.configured && (
            <Aviso titulo="Banco de dados ainda não conectado">
              A lista de concursos aparece aqui depois que o Supabase for configurado.
            </Aviso>
          )}
          {"error" in result && result.error && (
            <Aviso titulo="Não foi possível carregar os concursos">Tente recarregar a página em alguns instantes.</Aviso>
          )}

          {result.configured && !("error" in result) && (
            <p className="mb-4 font-bold">
              {result.total === 0 ? "Nenhuma oportunidade" : `${result.total} ${result.total === 1 ? "oportunidade" : "oportunidades"}`}
              {temFiltro && " com esses filtros"}
            </p>
          )}

          {result.configured && result.rows.length === 0 && !("error" in result) && (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--line)] p-8">
              <h3 className="text-lg font-bold">{temFiltro ? "Nada encontrado com esses filtros" : "Ainda não há concursos publicados"}</h3>
              <p className="mt-2 max-w-xl text-[var(--muted)]">
                {temFiltro
                  ? "Tente ampliar a busca: troque o estado pela região, remova a faixa salarial ou a situação."
                  : "Os concursos entram aqui à medida que são conferidos na fonte oficial. Preferimos uma lista menor e correta a uma lista longa com dados duvidosos."}
              </p>
              {temFiltro && (
                <Link href="/concursos" className="mt-4 inline-block font-bold text-[var(--action)] underline">Limpar filtros</Link>
              )}
            </div>
          )}

          <ul className="space-y-4">
            {result.rows.map((c) => {
              const vagas = c.concurso_cargos.reduce((s, k) => s + (k.vagas ?? 0), 0);
              const maxSal = Math.max(0, ...c.concurso_cargos.map((k) => k.remuneracao ?? 0));
              return (
                <li key={c.id}>
                  <Link href={`/concursos/${c.slug}`} className="lift block rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <SituacaoBadge situacao={c.situacao} />
                      <span className="text-sm text-[var(--muted)]">{TIPOS_SELECAO[c.tipo_selecao as keyof typeof TIPOS_SELECAO]}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold">{c.titulo}</h3>
                    <p className="text-[var(--muted)]">
                      {c.orgao} — {c.municipio ? `${c.municipio}/` : ""}{c.uf}
                    </p>
                    <p className="mt-2 text-[0.97rem]">{c.concurso_cargos.map((k) => k.cargo).join(", ")}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                      <Dado rotulo="Inscrições até" valor={formatData(c.inscricao_fim)} />
                      <Dado rotulo="Vagas" valor={vagas ? String(vagas) : null} />
                      <Dado rotulo="Remuneração até" valor={maxSal ? formatBRL(maxSal) : null} />
                      <Dado rotulo="Banca" valor={c.banca} />
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>

          {paginas > 1 && <Paginacao f={f} paginas={paginas} />}
        </section>
      </div>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{rotulo}</dt>
      <dd className="font-bold">{valor ?? "Não informado"}</dd>
    </div>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div role="status" className="mb-6 flex gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--line)] p-5">
      <Icon name="info" className="h-5 w-5 shrink-0 text-[var(--action)]" />
      <div>
        <p className="font-bold">{titulo}</p>
        <p className="text-[var(--muted)]">{children}</p>
      </div>
    </div>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: Record<string, string> | readonly string[] }) {
  const entries = Array.isArray(options) ? options.map((o) => [o, o]) : Object.entries(options);
  return (
    <div className="space-y-1">
      <label htmlFor={`f-${name}`} className="block text-sm font-bold">{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className="field py-2">
        <option value="">Todos</option>
        {entries.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function FiltrosForm({ f }: { f: Filtros }) {
  const situacoes = Object.fromEntries(Object.entries(SITUACOES).map(([k, v]) => [k, v.label]));
  const regioes = Object.fromEntries(Object.keys(REGIOES).map((r) => [r, r]));
  return (
    <form action="/concursos" method="get" className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Filtros de concursos">
      <div className="space-y-1">
        <label htmlFor="f-q" className="block text-sm font-bold">Órgão, município ou título</label>
        <input id="f-q" name="q" type="search" defaultValue={f.q} maxLength={100} className="field py-2" />
      </div>
      <Select name="situacao" label="Situação" value={f.situacao} options={situacoes} />
      <div className="grid grid-cols-2 gap-3">
        <Select name="regiao" label="Região" value={f.regiao} options={regioes} />
        <Select name="uf" label="Estado" value={f.uf} options={UFS} />
      </div>
      <Select name="area" label="Área" value={f.area} options={AREAS_CARGO} />
      <Select name="escolaridade" label="Escolaridade" value={f.escolaridade} options={ESCOLARIDADES} />
      <Select name="tipo" label="Tipo de seleção" value={f.tipo} options={TIPOS_SELECAO} />
      <Select name="regime" label="Contratação" value={f.regime} options={REGIMES} />
      <Select name="modalidade" label="Modalidade da prova" value={f.modalidade} options={MODALIDADES} />
      <div className="space-y-1">
        <label htmlFor="f-banca" className="block text-sm font-bold">Banca</label>
        <input id="f-banca" name="banca" defaultValue={f.banca} maxLength={80} className="field py-2" />
      </div>
      <div className="space-y-1">
        <label htmlFor="f-salario" className="block text-sm font-bold">Remuneração mínima (R$)</label>
        <input id="f-salario" name="salario" type="number" min={0} step={100} defaultValue={f.salario} className="field py-2" />
      </div>
      <div className="space-y-1">
        <label htmlFor="f-ate" className="block text-sm font-bold">Inscrições terminam até</label>
        <input id="f-ate" name="ate" type="date" defaultValue={f.ate} className="field py-2" />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2.5 font-bold text-[var(--action-text)]">Filtrar</button>
        <Link href="/concursos" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2.5 font-bold">Limpar</Link>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Se o estado e a região forem escolhidos juntos, vale o estado.
      </p>
    </form>
  );
}

function Paginacao({ f, paginas }: { f: Filtros; paginas: number }) {
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v !== undefined && k !== "pagina") params.set(k, String(v));
    params.set("pagina", String(p));
    return `/concursos?${params}`;
  };
  return (
    <nav aria-label="Páginas" className="mt-8 flex items-center justify-between">
      {f.pagina > 1 ? <Link href={href(f.pagina - 1)} className="font-bold text-[var(--action)]">Anterior</Link> : <span />}
      <span className="text-[var(--muted)]">Página {f.pagina} de {paginas}</span>
      {f.pagina < paginas ? <Link href={href(f.pagina + 1)} className="font-bold text-[var(--action)]">Próxima</Link> : <span />}
    </nav>
  );
}
