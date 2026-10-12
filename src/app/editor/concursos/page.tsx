import type { Metadata } from "next";
import Link from "next/link";
import { requireEditor } from "@/lib/session";
import { situacaoDe, type ConcursoRow } from "@/lib/concursos-query";
import { formatData } from "@/lib/concursos";
import { SituacaoBadge } from "@/components/situacao-badge";
import { FormMessage } from "@/components/ui";

export const metadata: Metadata = { title: "Editor de concursos", robots: { index: false } };

export default async function EditorConcursosPage({ searchParams }: { searchParams: Promise<{ excluido?: string }> }) {
  const { supabase } = await requireEditor();
  const sp = await searchParams;
  const { data } = await supabase
    .from("concursos")
    .select("id,slug,titulo,orgao,uf,fase,publicado,inscricao_inicio,inscricao_fim,ultima_verificacao_em,updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Pick<ConcursoRow, "id" | "slug" | "titulo" | "orgao" | "uf" | "fase" | "publicado" | "inscricao_inicio" | "inscricao_fim" | "ultima_verificacao_em" | "updated_at">[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] font-extrabold">Editor de concursos</h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Fluxo: criar rascunho → conferir na fonte oficial e registrar a verificação → publicar. Rascunhos não aparecem ao público.
          </p>
        </div>
        <Link href="/editor/concursos/novo" className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)]">
          Novo concurso
        </Link>
      </div>

      {sp.excluido && <div className="mt-6"><FormMessage status="success" message="Concurso excluído." /></div>}

      {rows.length === 0 ? (
        <p className="mt-10 text-[var(--muted)]">Nenhum concurso cadastrado ainda.</p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b-2 border-[var(--text)] text-sm">
              <tr>
                <th className="py-2 pr-4">Concurso</th>
                <th className="py-2 pr-4">Situação pública</th>
                <th className="py-2 pr-4">Inscrições até</th>
                <th className="py-2 pr-4">Última verificação</th>
                <th className="py-2">Publicado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)]">
                  <td className="py-3 pr-4">
                    <Link href={`/editor/concursos/${c.id}`} className="font-bold hover:underline">{c.titulo}</Link>
                    <div className="text-sm text-[var(--muted)]">{c.orgao} — {c.uf}</div>
                  </td>
                  <td className="py-3 pr-4"><SituacaoBadge situacao={situacaoDe(c)} /></td>
                  <td className="py-3 pr-4">{formatData(c.inscricao_fim) ?? "—"}</td>
                  <td className="py-3 pr-4">
                    {c.ultima_verificacao_em
                      ? new Date(c.ultima_verificacao_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
                      : <span className="font-bold text-[var(--color-danger)]">Nunca</span>}
                  </td>
                  <td className="py-3">{c.publicado ? "Sim" : "Rascunho"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
