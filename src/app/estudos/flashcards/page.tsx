import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { hojeSaoPaulo, formatData } from "@/lib/concursos";
import { excluirFlashcard } from "../actions";
import { NovoCartao, Revisao } from "./cartoes";

export const metadata: Metadata = { title: "Flashcards", robots: { index: false } };

export default async function FlashcardsPage() {
  const { supabase } = await requireUser("/estudos/flashcards");
  const hoje = hojeSaoPaulo();
  const { data } = await supabase.from("flashcards").select("id,materia,frente,verso,caixa,proxima_revisao,acertos,erros").order("proxima_revisao").limit(2000);
  const cartoes = data ?? [];
  const pendentes = cartoes.filter((c) => c.proxima_revisao <= hoje);
  const porCaixa = [1, 2, 3, 4, 5].map((n) => cartoes.filter((c) => c.caixa === n).length);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/estudos" className="text-sm text-[var(--muted)] hover:underline">Preparação para concursos</Link>
      <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.75rem)] font-extrabold">Flashcards</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Cada acerto leva o cartão para a caixa seguinte e espaça a revisão (1, 2, 4, 8 e 16 dias). Um erro devolve o cartão para a caixa 1.
      </p>

      <dl className="mt-6 flex flex-wrap gap-3" aria-label="Cartões por caixa">
        {porCaixa.map((n, i) => (
          <div key={i} className="rounded-[var(--radius-control)] border border-[var(--line)] px-4 py-2 text-center">
            <dt className="text-xs text-[var(--muted)]">Caixa {i + 1}</dt>
            <dd className="text-xl font-extrabold">{n}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="revisar" className="mt-10">
        <h2 id="revisar" className="text-2xl font-bold">Revisão de hoje</h2>
        {pendentes.length > 0 ? <Revisao cartoes={pendentes.map(({ id, frente, verso, materia }) => ({ id, frente, verso, materia }))} /> : <p className="mt-2 text-[var(--muted)]">Nenhum cartão para hoje.</p>}
      </section>

      <section aria-labelledby="novo" className="mt-12">
        <h2 id="novo" className="text-2xl font-bold">Novo cartão</h2>
        <NovoCartao />
      </section>

      {cartoes.length > 0 && (
        <section aria-labelledby="todos" className="mt-12">
          <h2 id="todos" className="text-2xl font-bold">Todos os cartões ({cartoes.length})</h2>
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {cartoes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{c.frente}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {c.materia ? `${c.materia} · ` : ""}caixa {c.caixa} · próxima em {formatData(c.proxima_revisao)} · {c.acertos} acertos, {c.erros} erros
                  </p>
                </div>
                <form action={excluirFlashcard}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="text-sm font-bold text-[var(--color-danger)]">Excluir</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
