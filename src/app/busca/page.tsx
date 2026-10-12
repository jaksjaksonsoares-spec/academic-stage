import type { Metadata } from "next";
import Link from "next/link";
import { search, SEARCH_INDEX } from "@/lib/search";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "Busca", robots: { index: false } };

const SUGESTOES = ["concursos", "plano de aula", "BNCC", "prova", "exportar dados"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").slice(0, 120);
  const results = q ? search(q) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-extrabold">Buscar na plataforma</h1>

      <form action="/busca" method="get" role="search" className="mt-6">
        <label htmlFor="q" className="sr-only">Termo de busca</label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Ex.: concurso, plano de aula, avaliação"
            className="field flex-1"
            list="sugestoes-busca"
            autoComplete="off"
          />
          <datalist id="sugestoes-busca">
            {SEARCH_INDEX.map((e) => <option key={e.href} value={e.title} />)}
          </datalist>
          <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 font-bold text-[var(--action-text)]">
            Buscar
          </button>
        </div>
      </form>

      <p className="mt-3 text-sm text-[var(--muted)]">
        Por enquanto a busca cobre as áreas e páginas da plataforma. Concursos, materiais e cursos entram aqui assim que forem publicados.
      </p>

      <div aria-live="polite" className="mt-10">
        {!q && (
          <div>
            <h2 className="font-bold">Experimente</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <li key={s}>
                  <Link href={`/busca?q=${encodeURIComponent(s)}`} className="inline-block rounded-full border border-[var(--line)] px-4 py-1.5 hover:border-[var(--muted)]">
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {q && results.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--line)] p-8">
            <h2 className="text-lg font-bold">Nada encontrado para “{q}”</h2>
            <p className="mt-2 text-[var(--muted)]">
              Tente um termo mais curto ou geral, como “concurso” ou “aula”. Se procura um concurso específico, ele estará aqui quando a busca de concursos entrar no ar (fase 2).
            </p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <h2 className="font-bold">
              {results.length} {results.length === 1 ? "resultado" : "resultados"} para “{q}”
            </h2>
            <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {results.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="group block py-5">
                    <span className="text-sm text-[var(--muted)]">
                      {r.category}
                      {!r.available && " · em construção"}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-lg font-bold group-hover:underline">
                      {r.title} <Icon name="arrow" className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 block text-[var(--muted)]">{r.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
