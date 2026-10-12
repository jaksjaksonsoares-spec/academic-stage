import type { Metadata } from "next";
import Link from "next/link";
import { requireEditor } from "@/lib/session";
import { LICENCAS, MOTIVOS_DENUNCIA, TIPOS_RECURSO, type Licenca } from "@/lib/biblioteca";
import { FormMessage } from "@/components/ui";
import { moderarRecurso, resolverDenuncia } from "./actions";
import { CuradoriaForm } from "./curadoria-form";

export const metadata: Metadata = { title: "Revisão da biblioteca", robots: { index: false } };

const CRITERIOS = [
  "É material pedagógico útil e com objetivo claro.",
  "Não reproduz conteúdo protegido de terceiros (livros, provas de bancas, imagens sem licença).",
  "Não contém nomes, fotos ou dados de estudantes.",
  "Não tem erros conceituais evidentes nem códigos da BNCC incompatíveis.",
  "A licença escolhida é coerente com o material.",
];

export default async function EditorBibliotecaPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { supabase } = await requireEditor("/editor/biblioteca");
  const sp = await searchParams;
  const [{ data: fila }, { data: denuncias }] = await Promise.all([
    supabase.from("recursos").select("id,titulo,descricao,tipo,licenca,autor_nome,created_at").eq("status", "em_revisao").eq("visibilidade", "publica").order("created_at").limit(100),
    supabase.from("recurso_denuncias").select("id,motivo,detalhe,created_at,recurso_id,recursos(titulo)").eq("resolvida", false).order("created_at").limit(100),
  ]);
  type Den = { id: number; motivo: string; detalhe: string | null; created_at: string; recurso_id: string; recursos: { titulo: string } | null };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] font-extrabold">Revisão da biblioteca</h1>
      {sp.ok && <div className="mt-6"><FormMessage status="success" message="Decisão registrada." /></div>}
      {sp.erro && <div className="mt-6"><FormMessage status="error" message="Para recusar, escreva o motivo — ele é mostrado ao autor." /></div>}

      <details className="mt-6 rounded-[var(--radius-control)] border border-[var(--line)] p-4">
        <summary className="cursor-pointer font-bold">Critérios de revisão</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--muted)]">{CRITERIOS.map((c) => <li key={c}>{c}</li>)}</ul>
      </details>

      <section aria-labelledby="fila" className="mt-10">
        <h2 id="fila" className="text-2xl font-bold">Aguardando revisão ({(fila ?? []).length})</h2>
        {(fila ?? []).length === 0 ? <p className="mt-3 font-bold text-[var(--color-success)]">Nada pendente.</p> : (
          <ul className="mt-4 space-y-4">
            {(fila ?? []).map((r) => (
              <li key={r.id} className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
                <p className="text-sm font-bold text-[var(--action)]">{TIPOS_RECURSO[r.tipo as keyof typeof TIPOS_RECURSO]} · {LICENCAS[r.licenca as Licenca].nome}</p>
                <Link href={`/biblioteca/${r.id}`} target="_blank" className="text-lg font-bold underline">{r.titulo}</Link>
                <p className="text-sm text-[var(--muted)]">Por {r.autor_nome ?? "—"} · enviado em {new Date(r.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
                <p className="mt-2 line-clamp-3">{r.descricao}</p>
                <form action={moderarRecurso} className="mt-4 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="min-w-60 flex-1"><span className="mb-1 block text-sm font-bold">Motivo (obrigatório para recusar)</span><input name="motivo" maxLength={500} className="field py-2" /></label>
                  <button type="submit" name="decisao" value="aprovar" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2.5 font-bold text-[var(--action-text)]">Aprovar</button>
                  <button type="submit" name="decisao" value="recusar" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--color-danger)] px-4 py-2.5 font-bold text-[var(--color-danger)]">Recusar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="den" className="mt-12">
        <h2 id="den" className="text-2xl font-bold">Denúncias abertas ({(denuncias ?? []).length})</h2>
        {(denuncias ?? []).length === 0 ? <p className="mt-3 text-[var(--muted)]">Nenhuma.</p> : (
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {((denuncias ?? []) as unknown as Den[]).map((d) => (
              <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <Link href={`/biblioteca/${d.recurso_id}`} target="_blank" className="font-bold underline">{d.recursos?.titulo ?? "Material"}</Link>
                  <p className="text-sm"><strong>{MOTIVOS_DENUNCIA[d.motivo as keyof typeof MOTIVOS_DENUNCIA]}</strong>{d.detalhe ? ` — ${d.detalhe}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <form action={moderarRecurso}>
                    <input type="hidden" name="id" value={d.recurso_id} /><input type="hidden" name="motivo" value="Retirado após denúncia" />
                    <button type="submit" name="decisao" value="arquivar" className="rounded-lg border border-[var(--color-danger)] px-3 py-1.5 text-sm font-bold text-[var(--color-danger)]">Retirar material</button>
                  </form>
                  <form action={resolverDenuncia}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-bold">Marcar como resolvida</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cur" className="mt-12">
        <h2 id="cur" className="text-2xl font-bold">Curadoria: indicar recurso externo</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">Para fontes oficiais e materiais de acesso legal. A plataforma não hospeda o arquivo, só aponta para a origem.</p>
        <CuradoriaForm />
      </section>
    </div>
  );
}
