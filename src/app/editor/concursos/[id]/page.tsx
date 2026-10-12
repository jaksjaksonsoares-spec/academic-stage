import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireEditor } from "@/lib/session";
import { situacaoDe, type ConcursoRow } from "@/lib/concursos-query";
import { SituacaoBadge } from "@/components/situacao-badge";
import { FormMessage } from "@/components/ui";
import { ConcursoForm, VerificacaoForm } from "../form";
import { definirPublicacao, excluirConcurso } from "../actions";

export const metadata: Metadata = { title: "Editar concurso", robots: { index: false } };

const AVISOS: Record<string, { status: "success" | "error"; message: string }> = {
  criado: { status: "success", message: "Rascunho criado. Agora confira na fonte oficial e registre a verificação para poder publicar." },
  publicado: { status: "success", message: "Publicado. O concurso já aparece na busca." },
  despublicado: { status: "success", message: "Voltou para rascunho e saiu da busca pública." },
  publicacao: { status: "error", message: "Não foi possível publicar. Registre uma verificação antes." },
  confirmacao: { status: "error", message: "Para excluir, digite EXCLUIR no campo de confirmação." },
};

type Verif = { verificado_em: string; fonte_url: string; observacao: string | null };

export default async function EditarConcursoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase } = await requireEditor(`/editor/concursos/${id}`);
  const sp = await searchParams;

  const { data } = await supabase
    .from("concursos")
    .select("*, concurso_cargos(*), concurso_verificacoes(verificado_em,fonte_url,observacao)")
    .eq("id", id)
    .order("verificado_em", { referencedTable: "concurso_verificacoes", ascending: false })
    .maybeSingle();
  if (!data) notFound();
  const c = data as ConcursoRow & { concurso_verificacoes: Verif[] };

  const aviso = AVISOS[sp.criado ? "criado" : sp.publicado ? "publicado" : sp.despublicado ? "despublicado" : sp.erro ?? ""];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/editor/concursos" className="text-sm text-[var(--muted)] hover:underline">Voltar para a lista</Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(1.7rem,3.5vw,2.25rem)] font-extrabold">{c.titulo}</h1>
        <SituacaoBadge situacao={situacaoDe(c)} />
      </div>
      {aviso && <div className="mt-6"><FormMessage status={aviso.status} message={aviso.message} /></div>}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_320px]">
        <ConcursoForm concurso={c} />

        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
            <h2 className="text-lg font-bold">Publicação</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {c.publicado ? "Visível na busca pública." : c.ultima_verificacao_em ? "Pronto para publicar." : "Registre uma verificação para poder publicar."}
            </p>
            <form action={definirPublicacao} className="mt-3">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="publicar" value={c.publicado ? "0" : "1"} />
              <button type="submit" disabled={!c.publicado && !c.ultima_verificacao_em} className="w-full rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2.5 font-bold text-[var(--action-text)] disabled:opacity-50">
                {c.publicado ? "Voltar para rascunho" : "Publicar"}
              </button>
            </form>
            {c.publicado && <Link href={`/concursos/${c.slug}`} className="mt-3 inline-block text-sm font-bold text-[var(--action)] underline">Ver página pública</Link>}
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
            <h2 className="text-lg font-bold">Verificações</h2>
            <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
              Registre sempre que conferir o concurso na fonte oficial. Sem verificação nos últimos 7 dias, ele não aparece como “inscrições abertas”.
            </p>
            <VerificacaoForm id={c.id} fonteUrl={c.edital_url ?? c.fonte_url} />
            <ul className="mt-5 space-y-2 text-sm">
              {c.concurso_verificacoes.length === 0 && <li className="text-[var(--muted)]">Nenhuma verificação ainda.</li>}
              {c.concurso_verificacoes.map((v, i) => (
                <li key={i} className="border-t border-[var(--line)] pt-2">
                  <strong>{new Date(v.verificado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</strong>
                  {v.observacao && <span className="block text-[var(--muted)]">{v.observacao}</span>}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-danger)_45%,transparent)] p-5">
            <h2 className="text-lg font-bold text-[var(--color-danger)]">Excluir</h2>
            <form action={excluirConcurso} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={c.id} />
              <label htmlFor="confirmar" className="block text-sm">Digite EXCLUIR para confirmar</label>
              <input id="confirmar" name="confirmar" autoComplete="off" className="field py-2" />
              <button type="submit" className="w-full rounded-[var(--radius-control)] bg-[var(--color-danger)] px-4 py-2.5 font-bold text-white">Excluir concurso</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
