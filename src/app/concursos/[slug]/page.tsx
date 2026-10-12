import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AREAS_CARGO,
  ESCOLARIDADES,
  ESFERAS,
  MODALIDADES,
  REGIMES,
  TIPOS_SELECAO,
  formatBRL,
  formatData,
} from "@/lib/concursos";
import { obterConcurso, situacaoDe } from "@/lib/concursos-query";
import { getUser } from "@/lib/supabase/server";
import { SituacaoBadge } from "@/components/situacao-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { Icon } from "@/components/icon";

type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const c = await obterConcurso((await params).slug);
  if (!c) return { title: "Concurso não encontrado" };
  return {
    title: c.titulo,
    description: `${c.orgao} — ${c.municipio ? `${c.municipio}/` : ""}${c.uf}. Cargos: ${c.concurso_cargos.map((k) => k.cargo).join(", ")}.`,
    alternates: { canonical: `/concursos/${c.slug}` },
  };
}

export default async function ConcursoPage({ params }: { params: P }) {
  const { slug } = await params;
  const c = await obterConcurso(slug);
  if (!c) notFound();

  const situacao = situacaoDe(c);
  const { supabase, user } = await getUser();
  let saved = false;
  if (supabase && user) {
    const { data } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("item_type", "concurso").eq("item_id", c.id).maybeSingle();
    saved = !!data;
  }

  const datas: [string, string | null][] = [
    ["Publicação do edital", formatData(c.data_publicacao)],
    ["Início das inscrições", formatData(c.inscricao_inicio)],
    ["Fim das inscrições", formatData(c.inscricao_fim)],
    ["Data da prova", formatData(c.data_prova)],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: c.titulo,
    dateModified: c.updated_at,
    about: { "@type": "GovernmentOrganization", name: c.orgao },
    isBasedOn: c.edital_url ?? c.fonte_url,
  };

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav aria-label="Trilha" className="text-sm text-[var(--muted)]">
        <Link href="/concursos" className="hover:underline">Concursos</Link> / {c.uf}
      </nav>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <SituacaoBadge situacao={situacao} />
          <span className="text-sm text-[var(--muted)]">
            {TIPOS_SELECAO[c.tipo_selecao as keyof typeof TIPOS_SELECAO]} · {ESFERAS[c.esfera as keyof typeof ESFERAS]}
          </span>
        </div>
        <h1 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">{c.titulo}</h1>
        <p className="mt-2 text-lg text-[var(--muted)]">
          {c.orgao} — {c.municipio ? `${c.municipio}/` : ""}{c.uf}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {c.edital_url && (
            <a href={c.edital_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-2.5 font-bold text-[var(--action-text)]">
              <Icon name="document" className="h-4 w-4" /> Abrir edital oficial
            </a>
          )}
          {c.inscricao_url && (
            <a href={c.inscricao_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-5 py-2.5 font-bold">
              Página de inscrição
            </a>
          )}
          <FavoriteButton itemType="concurso" itemId={c.id} initialSaved={saved} signedIn={!!user} />
        </div>
      </header>

      {situacao === "verificacao_pendente" && (
        <div role="note" className="mt-8 flex gap-3 rounded-[var(--radius-card)] border border-dashed border-[#d08a00] p-5">
          <Icon name="alert" className="h-5 w-5 shrink-0 text-[#d08a00]" />
          <p>
            A última conferência deste concurso tem mais de 7 dias. Os prazos podem ter mudado: confirme no edital oficial antes de se inscrever.
          </p>
        </div>
      )}

      <section aria-labelledby="datas" className="mt-10">
        <h2 id="datas" className="text-xl font-bold">Datas</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-4">
          {datas.map(([r, v]) => (
            <div key={r} className="rounded-[var(--radius-control)] border border-[var(--line)] p-4">
              <dt className="text-sm text-[var(--muted)]">{r}</dt>
              <dd className="mt-1 font-bold">{v ?? "Não informado"}</dd>
            </div>
          ))}
        </dl>
        <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-3">
          <div><dt className="text-sm text-[var(--muted)]">Banca</dt><dd className="font-bold">{c.banca ?? "Não informada"}</dd></div>
          <div><dt className="text-sm text-[var(--muted)]">Taxa de inscrição</dt><dd className="font-bold">{formatBRL(c.taxa_inscricao) ?? "Não informada"}</dd></div>
          <div><dt className="text-sm text-[var(--muted)]">Prova</dt><dd className="font-bold">{c.modalidade ? MODALIDADES[c.modalidade as keyof typeof MODALIDADES] : "Não informado"}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="cargos" className="mt-12">
        <h2 id="cargos" className="text-xl font-bold">Cargos</h2>
        <div className="mt-4 space-y-4">
          {c.concurso_cargos.map((k, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
              <h3 className="text-lg font-bold">{k.cargo}</h3>
              <p className="text-sm text-[var(--muted)]">
                {AREAS_CARGO[k.area as keyof typeof AREAS_CARGO]} · {ESCOLARIDADES[k.escolaridade as keyof typeof ESCOLARIDADES]}
              </p>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-[0.97rem] sm:grid-cols-4">
                <div><dt className="text-sm text-[var(--muted)]">Vagas</dt><dd className="font-bold">{k.vagas ?? "—"}{k.cadastro_reserva ? " + cadastro reserva" : ""}</dd></div>
                <div><dt className="text-sm text-[var(--muted)]">Remuneração</dt><dd className="font-bold">{formatBRL(k.remuneracao) ?? "—"}</dd></div>
                <div><dt className="text-sm text-[var(--muted)]">Carga horária</dt><dd className="font-bold">{k.carga_horaria ?? "—"}</dd></div>
                <div><dt className="text-sm text-[var(--muted)]">Regime</dt><dd className="font-bold">{k.regime ? REGIMES[k.regime as keyof typeof REGIMES] : "—"}</dd></div>
              </dl>
              {k.formacao_exigida && <p className="mt-3"><strong>Formação exigida:</strong> {k.formacao_exigida}</p>}
              {k.requisitos && <p className="mt-1"><strong>Requisitos:</strong> {k.requisitos}</p>}
            </div>
          ))}
        </div>
      </section>

      {c.conteudo_programatico && (
        <section aria-labelledby="conteudo" className="mt-12">
          <h2 id="conteudo" className="text-xl font-bold">Conteúdo programático</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Transcrito do edital. Em caso de divergência, vale o edital.</p>
          <div className="mt-4 whitespace-pre-line rounded-[var(--radius-card)] bg-[var(--surface)] p-5 text-[0.97rem]">{c.conteudo_programatico}</div>
        </section>
      )}

      {c.observacoes && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Observações</h2>
          <p className="mt-2 whitespace-pre-line">{c.observacoes}</p>
        </section>
      )}

      <section aria-labelledby="fonte" className="mt-12 border-t border-[var(--line)] pt-8">
        <h2 id="fonte" className="text-xl font-bold">Fonte e verificações</h2>
        <p className="mt-2">
          Fonte: <a href={c.fonte_url} target="_blank" rel="noopener noreferrer" className="font-bold underline">{c.fonte_nome}</a>
        </p>
        <ul className="mt-3 space-y-1 text-[0.95rem] text-[var(--muted)]">
          {c.concurso_verificacoes.map((v, i) => (
            <li key={i}>
              Conferido em{" "}
              {new Date(v.verificado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
              {v.observacao ? ` — ${v.observacao}` : ""}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Encontrou algo diferente do edital? O edital oficial sempre prevalece. Avise pelo suporte para corrigirmos.
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </article>
  );
}
