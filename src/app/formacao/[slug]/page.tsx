import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { LINKS_CONFERENCIA, MODALIDADES_CURSO, TIPOS_CURSO } from "@/lib/cursos";
import { formatData } from "@/lib/concursos";
import { FavoriteButton } from "@/components/favorite-button";
import { Icon } from "@/components/icon";

async function carregar(slug: string) {
  const supabase = await createClient();
  if (!supabase || !/^[a-z0-9-]{3,120}$/.test(slug)) return null;
  return (await supabase.from("cursos").select("*").eq("slug", slug).eq("publicado", true).maybeSingle()).data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await carregar((await params).slug);
  return c ? { title: c.titulo, description: `${c.instituicao} — ${TIPOS_CURSO[c.tipo as keyof typeof TIPOS_CURSO]}`, alternates: { canonical: `/formacao/${c.slug}` } } : { title: "Curso não encontrado" };
}

export default async function CursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await carregar((await params).slug);
  if (!c) notFound();
  const { supabase, user } = await getUser();
  const salvo = supabase && user ? !!(await supabase.from("favorites").select("id").eq("user_id", user.id).eq("item_type", "curso").eq("item_id", c.id).maybeSingle()).data : false;
  const stricto = c.tipo === "mestrado" || c.tipo === "doutorado" || c.tipo === "lato_sensu";

  const dados: [string, string | null][] = [
    ["Modalidade", MODALIDADES_CURSO[c.modalidade as keyof typeof MODALIDADES_CURSO]],
    ["Custo", c.gratuito ? "Gratuito" : c.custo],
    ["Carga horária", c.carga_horaria ? `${c.carga_horaria} horas` : null],
    ["Duração", c.duracao],
    ["Inscrições até", formatData(c.inscricao_fim)],
    ["Início", formatData(c.inicio)],
  ];

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/formacao" className="text-sm text-[var(--muted)] hover:underline">Formação continuada</Link>
      <p className="mt-4 font-bold text-[var(--action)]">{TIPOS_CURSO[c.tipo as keyof typeof TIPOS_CURSO]}</p>
      <h1 className="mt-1 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">{c.titulo}</h1>
      <p className="mt-2 text-lg text-[var(--muted)]">{c.instituicao}{c.uf ? ` — ${c.uf}` : ""}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={c.link_oficial} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-2.5 font-bold text-[var(--action-text)]"><Icon name="link" className="h-4 w-4" /> Página oficial</a>
        <FavoriteButton itemType="curso" itemId={c.id} initialSaved={salvo} signedIn={!!user} label="Salvar" savedLabel="Salvo" />
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        {dados.map(([r, v]) => <div key={r} className="rounded-[var(--radius-control)] border border-[var(--line)] p-4"><dt className="text-sm text-[var(--muted)]">{r}</dt><dd className="mt-1 font-bold">{v ?? "Não informado"}</dd></div>)}
      </dl>

      {c.publico && <section className="mt-8"><h2 className="text-xl font-bold">Público</h2><p className="mt-1">{c.publico}</p></section>}
      {c.requisitos && <section className="mt-6"><h2 className="text-xl font-bold">Requisitos</h2><p className="mt-1 whitespace-pre-line">{c.requisitos}</p></section>}

      <section aria-labelledby="cert" className="mt-8 rounded-[var(--radius-card)] border border-[var(--line)] p-5">
        <h2 id="cert" className="text-xl font-bold">Certificação</h2>
        <p className="mt-1">{c.certificacao ?? "A instituição não informou detalhes sobre o certificado."}</p>
        {c.reconhecimento_conferido ? (
          <p className="mt-3 font-bold text-[var(--color-success)]">
            Reconhecimento conferido pela equipe {c.reconhecimento_fonte && <a href={c.reconhecimento_fonte} target="_blank" rel="noopener noreferrer" className="underline">nesta fonte</a>}.
          </p>
        ) : (
          <p className="mt-3 text-[var(--muted)]">
            Ainda não conferimos o reconhecimento oficial deste curso.{stricto && " Antes de se matricular, confira o credenciamento da instituição e do curso:"}
          </p>
        )}
        {stricto && !c.reconhecimento_conferido && <ul className="mt-2 list-disc pl-5 text-sm">{LINKS_CONFERENCIA.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="underline">{l.nome}</a></li>)}</ul>}
      </section>

      <p className="mt-8 text-sm text-[var(--muted)]">
        Fonte: {c.fonte_nome}{c.ultima_verificacao_em && ` · conferido em ${new Date(c.ultima_verificacao_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}. A página oficial da instituição sempre prevalece.
      </p>
    </article>
  );
}
