import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { FormMessage } from "@/components/ui";
import { definirPapel, definirPlano } from "../actions";

type U = { id: string; email: string; display_name: string | null; plano: string | null; papeis: string[]; criado_em: string; ultimo_acesso: string | null; total: number };
const POR_PAGINA = 50;

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string; ok?: string; erro?: string }> }) {
  const { supabase, user } = await requireAdmin("/admin/usuarios");
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const q = (sp.q ?? "").slice(0, 100);
  const { data } = await supabase.rpc("admin_usuarios", { _busca: q || null, _limit: POR_PAGINA, _offset: (pagina - 1) * POR_PAGINA });
  const rows = (data ?? []) as U[];
  const total = rows[0]?.total ?? 0;
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

  return (
    <div className="space-y-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Usuários e papéis</h1>
      <p className="max-w-2xl text-[var(--muted)]">Editores cadastram e verificam concursos. Administradores acessam este painel. Os dois exigem verificação em dois fatores. O plano atribuído aqui não gera cobrança: use para pilotos e parcerias formalizadas.</p>
      {sp.ok && <FormMessage status="success" message={sp.ok === "plano" ? "Plano atualizado e registrado na auditoria." : "Papel atualizado e registrado na auditoria."} />}
      {sp.erro && <FormMessage status="error" message={sp.erro === "confirmacao" ? "Marque a confirmação para remover o papel." : sp.erro} />}

      <form method="get" className="flex max-w-md gap-2" role="search">
        <label htmlFor="q" className="sr-only">Buscar por e-mail ou nome</label>
        <input id="q" name="q" defaultValue={q} placeholder="E-mail ou nome" className="field py-2" />
        <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 font-bold text-[var(--action-text)]">Buscar</button>
      </form>
      <p className="text-sm text-[var(--muted)]">{total} {total === 1 ? "usuário" : "usuários"}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="border-b-2 border-[var(--text)] text-sm">
            <tr><th className="py-2 pr-4">Usuário</th><th className="py-2 pr-4">Cadastro</th><th className="py-2 pr-4">Último acesso</th><th className="py-2 pr-4">Plano</th><th className="py-2 pr-4">Papéis</th><th className="py-2">Alterar</th></tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-[var(--line)] align-top">
                <td className="py-3 pr-4"><span className="font-bold">{u.display_name || "—"}</span><span className="block text-sm text-[var(--muted)]">{u.email}</span></td>
                <td className="py-3 pr-4 text-sm">{fmt(u.criado_em)}</td>
                <td className="py-3 pr-4 text-sm">{fmt(u.ultimo_acesso)}</td>
                <td className="py-3 pr-4 text-sm">
                  <form action={definirPlano} className="flex gap-1">
                    <input type="hidden" name="usuario" value={u.id} />
                    <label className="sr-only" htmlFor={`plano-${u.id}`}>Plano de {u.email}</label>
                    <select id={`plano-${u.id}`} name="plano" defaultValue={u.plano ?? "gratuito"} className="field w-36 py-1 text-sm">
                      <option value="gratuito">Gratuito</option><option value="profissional">Profissional</option><option value="institucional">Institucional</option>
                    </select>
                    <button type="submit" className="rounded-lg border border-[var(--line)] px-2 font-bold">Salvar</button>
                  </form>
                </td>
                <td className="py-3 pr-4 text-sm">{u.papeis.filter((p) => p !== "usuario").join(", ") || "usuário"}</td>
                <td className="py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {(["editor", "admin"] as const).map((papel) => {
                      const tem = u.papeis.includes(papel);
                      const proprioAdmin = u.id === user.id && papel === "admin";
                      if (proprioAdmin) return <span key={papel} className="text-[var(--muted)]">admin (você)</span>;
                      return tem ? (
                        <details key={papel} className="relative">
                          <summary className="cursor-pointer list-none rounded-lg border border-[var(--line)] px-2 py-1 font-bold text-[var(--color-danger)]">Remover {papel}</summary>
                          <form action={definirPapel} className="absolute right-0 z-10 mt-1 w-60 space-y-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lift)]">
                            <input type="hidden" name="usuario" value={u.id} /><input type="hidden" name="papel" value={papel} /><input type="hidden" name="ativo" value="0" />
                            <label className="flex items-center gap-2"><input type="checkbox" name="confirmar" className="h-4 w-4" /> Confirmo a remoção</label>
                            <button type="submit" className="w-full rounded-lg bg-[var(--color-danger)] px-2 py-1 font-bold text-white">Remover</button>
                          </form>
                        </details>
                      ) : (
                        <form key={papel} action={definirPapel}>
                          <input type="hidden" name="usuario" value={u.id} /><input type="hidden" name="papel" value={papel} /><input type="hidden" name="ativo" value="1" />
                          <button type="submit" className="rounded-lg border border-[var(--line)] px-2 py-1 font-bold">Tornar {papel}</button>
                        </form>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > POR_PAGINA && (
        <nav aria-label="Páginas" className="flex justify-between">
          {pagina > 1 ? <Link href={`?q=${encodeURIComponent(q)}&pagina=${pagina - 1}`} className="font-bold text-[var(--action)]">Anterior</Link> : <span />}
          {pagina * POR_PAGINA < total ? <Link href={`?q=${encodeURIComponent(q)}&pagina=${pagina + 1}`} className="font-bold text-[var(--action)]">Próxima</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
