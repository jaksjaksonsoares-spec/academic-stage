import { requireAdmin } from "@/lib/session";
import { FormMessage } from "@/components/ui";
import { definirPlanoOrganizacao } from "../actions";

type Org = { id: string; nome: string; tipo: string; uf: string | null; municipio: string | null; plano_ativo: boolean; created_at: string; org_membros: { count: number }[] };

export default async function OrganizacoesAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string; erro?: string }> }) {
  const { supabase } = await requireAdmin("/admin/organizacoes");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100).toLowerCase();
  const [{ data: orgsRaw }, { data: interesses }] = await Promise.all([
    supabase.from("organizacoes").select("id,nome,tipo,uf,municipio,plano_ativo,created_at,org_membros(count)").order("created_at", { ascending: false }).limit(500),
    supabase.from("interesse_planos").select("plano"),
  ]);
  const orgs = ((orgsRaw ?? []) as unknown as Org[]).filter((o) => !q || o.nome.toLowerCase().includes(q) || (o.municipio ?? "").toLowerCase().includes(q));
  const contagem = (p: string) => (interesses ?? []).filter((i) => i.plano === p).length;
  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <div className="space-y-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Organizações e planos</h1>
      <p className="max-w-2xl text-[var(--muted)]">
        Ativar o plano institucional amplia os limites para todos os membros da organização. Não há cobrança automática: ative apenas com contrato ou parceria formalizada.
        Toda alteração fica registrada na auditoria.
      </p>
      {sp.ok && <FormMessage status="success" message="Plano da organização atualizado." />}
      {sp.erro && <FormMessage status="error" message={sp.erro === "confirmacao" ? "Marque a confirmação para desativar." : "Não foi possível alterar."} />}

      <section aria-labelledby="interesse" className="grid gap-3 sm:grid-cols-2">
        <h2 id="interesse" className="sr-only">Lista de interesse</h2>
        <div className="rounded-[var(--radius-card)] border border-[var(--line)] p-4"><p className="text-sm text-[var(--muted)]">Interesse no Profissional</p><p className="text-3xl font-extrabold">{contagem("profissional")}</p></div>
        <div className="rounded-[var(--radius-card)] border border-[var(--line)] p-4"><p className="text-sm text-[var(--muted)]">Interesse no Institucional</p><p className="text-3xl font-extrabold">{contagem("institucional")}</p></div>
      </section>

      <form method="get" className="flex max-w-md gap-2" role="search">
        <label htmlFor="q" className="sr-only">Buscar organização</label>
        <input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Nome ou município" className="field py-2" />
        <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 font-bold text-[var(--action-text)]">Buscar</button>
      </form>

      {orgs.length === 0 ? <p className="text-[var(--muted)]">Nenhuma organização.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b-2 border-[var(--text)] text-sm">
              <tr><th className="py-2 pr-4">Organização</th><th className="py-2 pr-4">Membros</th><th className="py-2 pr-4">Criada em</th><th className="py-2 pr-4">Plano</th><th className="py-2">Alterar</th></tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-b border-[var(--line)] align-top">
                  <td className="py-3 pr-4"><span className="font-bold">{o.nome}</span><span className="block text-sm text-[var(--muted)]">{o.tipo}{o.municipio ? ` · ${o.municipio}` : ""}{o.uf ? `/${o.uf}` : ""}</span></td>
                  <td className="py-3 pr-4 text-sm">{o.org_membros?.[0]?.count ?? 0}</td>
                  <td className="py-3 pr-4 text-sm">{fmt(o.created_at)}</td>
                  <td className="py-3 pr-4 text-sm font-bold">{o.plano_ativo ? "Institucional ativo" : "Gratuito"}</td>
                  <td className="py-3 text-sm">
                    {o.plano_ativo ? (
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded-lg border border-[var(--line)] px-2 py-1 font-bold text-[var(--color-danger)]">Desativar</summary>
                        <form action={definirPlanoOrganizacao} className="absolute right-0 z-10 mt-1 w-64 space-y-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lift)]">
                          <input type="hidden" name="org" value={o.id} /><input type="hidden" name="ativo" value="0" />
                          <label className="flex items-center gap-2"><input type="checkbox" name="confirmar" className="h-4 w-4" /> Confirmo: os membros voltam aos limites gratuitos</label>
                          <button type="submit" className="w-full rounded-lg bg-[var(--color-danger)] px-2 py-1 font-bold text-white">Desativar</button>
                        </form>
                      </details>
                    ) : (
                      <form action={definirPlanoOrganizacao}>
                        <input type="hidden" name="org" value={o.id} /><input type="hidden" name="ativo" value="1" />
                        <button type="submit" className="rounded-lg border border-[var(--line)] px-2 py-1 font-bold">Ativar institucional</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
