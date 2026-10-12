import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GUIA_TIPOS, LINKS_CONFERENCIA, MODALIDADES_CURSO, TIPOS_CURSO } from "@/lib/cursos";
import { formatData, hojeSaoPaulo } from "@/lib/concursos";

export const metadata: Metadata = {
  title: "Formação continuada e carreira",
  description: "Cursos livres, extensão, especializações, mestrados, doutorados, eventos e bolsas para professores, com link oficial e data de verificação.",
  alternates: { canonical: "/formacao" },
};

type C = { id: string; slug: string; titulo: string; instituicao: string; tipo: string; modalidade: string; gratuito: boolean; carga_horaria: number | null; inscricao_fim: string | null; reconhecimento_conferido: boolean };

export default async function FormacaoPage({ searchParams }: { searchParams: Promise<{ tipo?: string; modalidade?: string; gratuito?: string; q?: string; abertos?: string }> }) {
  const sp = await searchParams;
  const tipo = Object.keys(TIPOS_CURSO).includes(sp.tipo ?? "") ? sp.tipo : undefined;
  const modalidade = Object.keys(MODALIDADES_CURSO).includes(sp.modalidade ?? "") ? sp.modalidade : undefined;
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().slice(0, 80);
  const supabase = await createClient();
  let cursos: C[] = [];
  if (supabase) {
    let query = supabase.from("cursos").select("id,slug,titulo,instituicao,tipo,modalidade,gratuito,carga_horaria,inscricao_fim,reconhecimento_conferido").eq("publicado", true);
    if (tipo) query = query.eq("tipo", tipo);
    if (modalidade) query = query.eq("modalidade", modalidade);
    if (sp.gratuito === "1") query = query.eq("gratuito", true);
    if (sp.abertos === "1") query = query.gte("inscricao_fim", hojeSaoPaulo());
    if (q) query = query.or(`titulo.ilike.*${q}*,instituicao.ilike.*${q}*`);
    const { data } = await query.order("inscricao_fim", { ascending: true, nullsFirst: false }).limit(200);
    cursos = (data ?? []) as C[];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Formação continuada e carreira</h1>
      <p className="mt-3 max-w-3xl text-lg text-[var(--muted)]">Cursos, pós-graduações, eventos e bolsas com link para a página oficial. Confira sempre prazos, custos e certificação na instituição.</p>

      <form method="get" className="mt-8 flex flex-wrap items-end gap-3" aria-label="Filtros">
        <label className="block text-sm font-bold">Buscar<input name="q" defaultValue={sp.q} maxLength={80} className="field mt-1 py-2 font-normal" /></label>
        <label className="block text-sm font-bold">Tipo<select name="tipo" defaultValue={tipo ?? ""} className="field mt-1 py-2 font-normal"><option value="">Todos</option>{Object.entries(TIPOS_CURSO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="block text-sm font-bold">Modalidade<select name="modalidade" defaultValue={modalidade ?? ""} className="field mt-1 py-2 font-normal"><option value="">Todas</option>{Object.entries(MODALIDADES_CURSO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="gratuito" value="1" defaultChecked={sp.gratuito === "1"} className="h-4 w-4" /> Só gratuitos</label>
        <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="abertos" value="1" defaultChecked={sp.abertos === "1"} className="h-4 w-4" /> Inscrições abertas</label>
        <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-2.5 font-bold text-[var(--action-text)]">Filtrar</button>
      </form>

      <section aria-label="Cursos" className="mt-8">
        {!supabase && <p className="text-[var(--muted)]">A lista aparece aqui depois que o banco de dados for conectado.</p>}
        {supabase && cursos.length === 0 && <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--line)] p-6 text-[var(--muted)]">Nenhum curso publicado com esses filtros. Os cursos entram depois de conferidos na página oficial da instituição.</p>}
        <ul className="grid gap-4 md:grid-cols-2">
          {cursos.map((c) => (
            <li key={c.id}>
              <Link href={`/formacao/${c.slug}`} className="lift block h-full rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-5">
                <span className="text-sm font-bold text-[var(--action)]">{TIPOS_CURSO[c.tipo as keyof typeof TIPOS_CURSO]}</span>
                <span className="mt-1 block text-lg font-bold">{c.titulo}</span>
                <span className="block text-[var(--muted)]">{c.instituicao}</span>
                <span className="mt-3 flex flex-wrap gap-x-3 text-sm text-[var(--muted)]">
                  <span>{MODALIDADES_CURSO[c.modalidade as keyof typeof MODALIDADES_CURSO]}</span>
                  <span>{c.gratuito ? "Gratuito" : "Pago"}</span>
                  {c.carga_horaria && <span>{c.carga_horaria} h</span>}
                  {c.inscricao_fim && <span>Inscrições até {formatData(c.inscricao_fim)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="guia" className="mt-14 rounded-[var(--radius-stage)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lift)] sm:p-8">
        <h2 id="guia" className="text-2xl font-bold">Qual é a diferença?</h2>
        <dl className="mt-4 grid gap-5 md:grid-cols-2">
          {GUIA_TIPOS.map((g) => <div key={g.titulo}><dt className="font-bold">{g.titulo}</dt><dd className="mt-1 text-[var(--muted)]">{g.texto}</dd></div>)}
        </dl>
        <p className="mt-6 text-sm">Onde conferir: {LINKS_CONFERENCIA.map((l, i) => <span key={l.url}>{i > 0 && " · "}<a href={l.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">{l.nome}</a></span>)}</p>
      </section>
    </div>
  );
}
