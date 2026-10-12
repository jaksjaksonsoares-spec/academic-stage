import { requireAdmin } from "@/lib/session";

export default async function ErrosPage() {
  const { supabase } = await requireAdmin("/admin/erros");
  const { data } = await supabase.from("erros_app").select("id,rota,mensagem,digest,created_at").order("created_at", { ascending: false }).limit(200);
  return (
    <div className="space-y-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Falhas técnicas</h1>
      <p className="max-w-2xl text-[var(--muted)]">Erros do servidor dos últimos 30 dias, sem dados pessoais. O código “digest” é o mesmo mostrado nos registros da hospedagem.</p>
      {(data ?? []).length === 0 ? (
        <p className="font-bold text-[var(--color-success)]">Nenhuma falha registrada.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {(data ?? []).map((e) => (
            <li key={e.id} className="py-3">
              <p className="font-mono text-sm">{e.rota ?? "—"}</p>
              <p className="font-bold">{e.mensagem}</p>
              <p className="text-sm text-[var(--muted)]">
                {new Date(e.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}{e.digest ? ` · digest ${e.digest}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
