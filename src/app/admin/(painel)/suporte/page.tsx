import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { CATEGORIAS_SUPORTE, STATUS_SUPORTE } from "@/lib/suporte-dados";

export default async function AdminSuportePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await requireAdmin("/admin/suporte");
  const sp = await searchParams;
  const status = Object.keys(STATUS_SUPORTE).includes(sp.status ?? "") ? sp.status : undefined;
  let q = supabase.from("suporte_solicitacoes").select("id,protocolo,nome,categoria,assunto,status,email_admin_status,created_at").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  else q = q.in("status", ["aberta", "em_andamento"]);
  const { data } = await q;

  return (
    <div className="space-y-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Atendimento</h1>
      <nav aria-label="Filtrar" className="flex flex-wrap gap-2">
        <Link href="/admin/suporte" aria-current={!status ? "page" : undefined} className={`rounded-full border px-4 py-1.5 text-sm font-bold ${!status ? "border-[var(--action)] text-[var(--action)]" : "border-[var(--line)]"}`}>Pendentes</Link>
        {Object.entries(STATUS_SUPORTE).map(([k, v]) => (
          <Link key={k} href={`/admin/suporte?status=${k}`} aria-current={status === k ? "page" : undefined} className={`rounded-full border px-4 py-1.5 text-sm font-bold ${status === k ? "border-[var(--action)] text-[var(--action)]" : "border-[var(--line)]"}`}>{v}</Link>
        ))}
      </nav>
      {(data ?? []).length === 0 ? (
        <p className="text-[var(--muted)]">Nenhuma solicitação neste filtro.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b-2 border-[var(--text)] text-sm">
              <tr><th className="py-2 pr-4">Protocolo</th><th className="py-2 pr-4">Assunto</th><th className="py-2 pr-4">Categoria</th><th className="py-2 pr-4">Situação</th><th className="py-2">Recebida</th></tr>
            </thead>
            <tbody>
              {(data ?? []).map((s) => (
                <tr key={s.id} className="border-b border-[var(--line)]">
                  <td className="py-3 pr-4 font-mono text-sm"><Link href={`/admin/suporte/${s.id}`} className="font-bold underline">{s.protocolo}</Link></td>
                  <td className="py-3 pr-4"><span className="font-bold">{s.assunto}</span><span className="block text-sm text-[var(--muted)]">{s.nome}</span></td>
                  <td className="py-3 pr-4 text-sm">{CATEGORIAS_SUPORTE[s.categoria as keyof typeof CATEGORIAS_SUPORTE]}</td>
                  <td className="py-3 pr-4 text-sm">
                    {STATUS_SUPORTE[s.status as keyof typeof STATUS_SUPORTE]}
                    {s.email_admin_status !== "enviado" && <span className="block text-xs font-bold text-[var(--color-danger)]">sem aviso por e-mail</span>}
                  </td>
                  <td className="py-3 text-sm">{new Date(s.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
