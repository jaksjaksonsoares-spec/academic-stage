import type { Metadata } from "next";
import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { LICENCAS, TIPOS_RECURSO, lerFiltrosBiblioteca, termoBusca, type FiltrosBiblioteca, type Licenca } from "@/lib/biblioteca";
import { ETAPAS } from "@/lib/validation";
import { Icon } from "@/components/icon";

export const metadata: Metadata = {
  title: "Biblioteca de recursos educacionais",
  description: "Planos, atividades, provas, sequências didáticas e materiais com licença aberta e fonte identificada, revisados antes de publicar.",
  alternates: { canonical: "/biblioteca" },
};

const POR_PAGINA = 24;
type Row = { id: string; titulo: string; descricao: string; tipo: string; etapas: string[]; componente: string | null; licenca: Licenca; origem: string; autor_nome: string | null; fonte_nome: string | null; link_url: string | null; copias: number };

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = lerFiltrosBiblioteca(await searchParams);
  const supabase = await createClient();
  const { user } = await getUser();

  let rows: Row[] = [];
  let total = 0;
  if (supabase) {
    let q = supabase
      .from("recursos")
      .select("id,titulo,descricao,tipo,etapas,componente,licenca,origem,autor_nome,fonte_nome,link_url,copias", { count: "exact" })
      .eq("status", "publicado")
      .eq("visibilidade", "publica");
    if (f.q) {
      const t = termoBusca(f.q);
      if (t) q = q.or(`titulo.ilike.*${t}*,descricao.ilike.*${t}*,componente.ilike.*${t}*`);
    }
    if (f.tipo) q = q.eq("tipo", f.tipo);
    if (f.etapa) q = q.contains("etapas", [f.etapa]);
    if (f.componente) {
      const t = termoBusca(f.componente);
      if (t) q = q.ilike("componente", `%${t}%`);
    }
    if (f.licenca) q = q.eq("licenca", f.licenca);
    if (f.origem) q = q.eq("origem", f.origem);
    const from = (f.pagina - 1) * POR_PAGINA;
    const { data, count } = await q.order("created_at", { ascending: false }).range(from, from + POR_PAGINA - 1);
    rows = (data ?? []) as Row[];
    total = count ?? 0;
  }
  const temFiltro = Object.entries(f).some(([k, v]) => k !== "pagina" && v !== undefined);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Biblioteca de recursos</h1>
          <p className="mt-3 text-lg text-[var(--muted)]">
            Materiais de professores e de fontes oficiais, com licença de uso e autoria identificadas. Tudo o que é compartilhado passa por revisão antes de aparecer aqui.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user && <Link href="/biblioteca/minhas" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2.5 font-bold">Meus materiais e coleções</Link>}
          <Link href={user ? "/biblioteca/compartilhar" : "/entrar?next=/biblioteca/compartilhar"} className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2.5 font-bold text-[var(--action-text)]">Compartilhar um material</Link>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[260px_1fr]">
        <form action="/biblioteca" method="get" className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Filtros da biblioteca">
          <label className="block space-y-1"><span className="block text-sm font-bold">Buscar</span><input name="q" type="search" defaultValue={f.q} maxLength={100} className="field py-2" /></label>
          <Sel name="tipo" label="Tipo" value={f.tipo} options={TIPOS_RECURSO} />
          <Sel name="etapa" label="Etapa" value={f.etapa} options={Object.fromEntries(ETAPAS.map((e) => [e.value, e.label]))} />
          <label className="block space-y-1"><span className="block text-sm font-bold">Componente</span><input name="componente" defaultValue={f.componente} maxLength={80} className="field py-2" /></label>
          <Sel name="licenca" label="Licença" value={f.licenca} options={Object.fromEntries(Object.entries(LICENCAS).map(([k, v]) => [k, v.nome]))} />
          <Sel name="origem" label="Origem" value={f.origem} options={{ curadoria: "Curadoria da plataforma", comunidade: "Compartilhado por professores" }} />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2.5 font-bold text-[var(--action-text)]">Filtrar</button>
            <Link href="/biblioteca" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2.5 font-bold">Limpar</Link>
          </div>
        </form>

        <section aria-live="polite">
          {!supabase && <p className="text-[var(--muted)]">A biblioteca aparece aqui depois que o banco de dados for conectado.</p>}
          {supabase && <p className="mb-4 font-bold">{total} {total === 1 ? "material" : "materiais"}{temFiltro ? " com esses filtros" : ""}</p>}
          {supabase && rows.length === 0 && (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--line)] p-8">
              <h2 className="text-lg font-bold">{temFiltro ? "Nada encontrado com esses filtros" : "A biblioteca está começando"}</h2>
              <p className="mt-2 text-[var(--muted)]">{temFiltro ? "Tente outro termo ou remova filtros." : "Compartilhe um plano, atividade ou prova que você criou — depois da revisão, ele fica disponível para todos."}</p>
            </div>
          )}
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/biblioteca/${r.id}`} className="lift flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-5">
                  <span className="text-sm font-bold text-[var(--action)]">{TIPOS_RECURSO[r.tipo as keyof typeof TIPOS_RECURSO]}</span>
                  <span className="mt-1 text-lg font-bold">{r.titulo}</span>
                  <span className="mt-1 line-clamp-3 text-[0.97rem] text-[var(--muted)]">{r.descricao}</span>
                  <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-sm text-[var(--muted)]">
                    <span>{r.origem === "curadoria" ? r.fonte_nome ?? "Curadoria" : r.autor_nome ?? "Professor(a)"}</span>
                    <span>{LICENCAS[r.licenca].nome}</span>
                    {r.link_url && <span className="inline-flex items-center gap-1"><Icon name="link" className="h-3.5 w-3.5" /> site externo</span>}
                    {r.copias > 0 && <span>{r.copias} {r.copias === 1 ? "cópia" : "cópias"}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {paginas > 1 && <Paginacao f={f} paginas={paginas} />}
        </section>
      </div>
    </div>
  );
}

function Sel({ name, label, value, options }: { name: string; label: string; value?: string; options: Record<string, string> }) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-bold">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="field py-2">
        <option value="">Todos</option>
        {Object.entries(options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Paginacao({ f, paginas }: { f: FiltrosBiblioteca; paginas: number }) {
  const href = (p: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v !== undefined && k !== "pagina") s.set(k, String(v));
    s.set("pagina", String(p));
    return `/biblioteca?${s}`;
  };
  return (
    <nav aria-label="Páginas" className="mt-8 flex items-center justify-between">
      {f.pagina > 1 ? <Link href={href(f.pagina - 1)} className="font-bold text-[var(--action)]">Anterior</Link> : <span />}
      <span className="text-[var(--muted)]">Página {f.pagina} de {paginas}</span>
      {f.pagina < paginas ? <Link href={href(f.pagina + 1)} className="font-bold text-[var(--action)]">Próxima</Link> : <span />}
    </nav>
  );
}
