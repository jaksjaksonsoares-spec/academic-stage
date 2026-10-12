import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { CATEGORIAS_SUPORTE, STATUS_SUPORTE } from "@/lib/suporte";

export const metadata: Metadata = { title: "Minhas solicitações", robots: { index: false } };

export default async function MinhasSolicitacoesPage() {
  const { supabase } = await requireUser("/suporte/solicitacoes");
  const { data } = await supabase
    .from("suporte_solicitacoes")
    .select("id,protocolo,categoria,assunto,status,resposta,respondida_em,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/suporte" className="text-sm text-[var(--muted)] hover:underline">Suporte</Link>
      <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Minhas solicitações</h1>
      {(data ?? []).length === 0 ? (
        <p className="mt-6 text-[var(--muted)]">Nenhuma solicitação enviada com esta conta.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {(data ?? []).map((s) => (
            <li key={s.id} className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-sm font-bold">{s.protocolo}</span>
                <span className="rounded-full bg-[color-mix(in_srgb,var(--action)_12%,transparent)] px-3 py-0.5 text-sm font-bold text-[var(--action)]">
                  {STATUS_SUPORTE[s.status as keyof typeof STATUS_SUPORTE]}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold">{s.assunto}</h2>
              <p className="text-sm text-[var(--muted)]">
                {CATEGORIAS_SUPORTE[s.categoria as keyof typeof CATEGORIAS_SUPORTE]} · enviada em{" "}
                {new Date(s.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
              </p>
              {s.resposta && (
                <div className="mt-3 rounded-[var(--radius-control)] bg-[var(--bg)] p-4">
                  <p className="text-sm font-bold">Resposta{s.respondida_em ? ` em ${new Date(s.respondida_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}</p>
                  <p className="mt-1 whitespace-pre-line">{s.resposta}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
