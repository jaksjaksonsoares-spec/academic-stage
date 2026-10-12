import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { formatData, hojeSaoPaulo } from "@/lib/concursos";

export default async function AdminConcursosPage() {
  const { supabase } = await requireAdmin("/admin/concursos");
  const hoje = hojeSaoPaulo();
  const limite = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: todos } = await supabase
    .from("concursos")
    .select("id,titulo,orgao,uf,inscricao_fim,ultima_verificacao_em")
    .eq("publicado", true)
    .eq("fase", "edital_publicado")
    .or(`inscricao_fim.is.null,inscricao_fim.gte.${hoje}`)
    .order("inscricao_fim", { ascending: true, nullsFirst: false })
    .limit(500);
  const data = (todos ?? []).filter((c) => !c.ultima_verificacao_em || Date.parse(c.ultima_verificacao_em) < Date.parse(limite));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Concursos</h1>
        <Link href="/editor/concursos" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2.5 font-bold text-[var(--action-text)]">Abrir editor de concursos</Link>
      </div>
      <section aria-labelledby="pendentes">
        <h2 id="pendentes" className="text-xl font-bold">Precisam de nova verificação</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Publicados, com inscrições ainda não encerradas e sem conferência nos últimos 7 dias. Para o público, aparecem como “aguardando nova verificação”.</p>
        {(data ?? []).length === 0 ? (
          <p className="mt-4 font-bold text-[var(--color-success)]">Tudo em dia.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {(data ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <Link href={`/editor/concursos/${c.id}`} className="font-bold underline">{c.titulo}</Link>
                  <span className="block text-sm text-[var(--muted)]">{c.orgao} — {c.uf} · inscrições até {formatData(c.inscricao_fim) ?? "—"}</span>
                </span>
                <span className="text-sm text-[var(--color-danger)]">
                  {c.ultima_verificacao_em ? `Última verificação em ${new Date(c.ultima_verificacao_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "Nunca verificado"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
