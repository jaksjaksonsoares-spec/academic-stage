import { requireAdmin } from "@/lib/session";
import { FormMessage } from "@/components/ui";
import { excluirLink } from "../actions";
import { LinkForm } from "./link-form";

type L = { id: number; titulo: string; url: string; descricao: string; orgao: string; categoria: string; ativo: boolean; ultimo_status: number | null; ultima_verificacao_em: string | null; falhas_consecutivas: number };

export default async function AdminLinksPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { supabase } = await requireAdmin("/admin/links");
  const sp = await searchParams;
  const { data } = await supabase.from("links_uteis").select("*").order("falhas_consecutivas", { ascending: false }).order("titulo");
  const links = (data ?? []) as L[];

  return (
    <div className="space-y-8">
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Links úteis</h1>
      {sp.ok && <FormMessage status="success" message="Link excluído." />}
      {sp.erro && <FormMessage status="error" message="Marque a confirmação para excluir." />}

      <section aria-labelledby="novo">
        <h2 id="novo" className="mb-3 text-xl font-bold">Novo link</h2>
        <LinkForm />
      </section>

      <section aria-labelledby="todos">
        <h2 id="todos" className="text-xl font-bold">Cadastrados ({links.length})</h2>
        <ul className="mt-3 space-y-3">
          {links.map((l) => (
            <li key={l.id} className="rounded-[var(--radius-card)] border border-[var(--line)] p-4">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span><strong>{l.titulo}</strong>{!l.ativo && <span className="ml-2 text-sm font-bold text-[var(--color-danger)]">oculto</span>}<span className="block text-sm text-[var(--muted)]">{l.url}</span></span>
                  <span className={`text-sm ${l.falhas_consecutivas ? "font-bold text-[var(--color-danger)]" : "text-[var(--muted)]"}`}>
                    {l.ultima_verificacao_em ? `${l.falhas_consecutivas ? `${l.falhas_consecutivas} falha(s) seguidas` : "no ar"} · status ${l.ultimo_status ?? "sem resposta"}` : "não verificado"}
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                  <LinkForm link={l} />
                  <form action={excluirLink} className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-3">
                    <input type="hidden" name="id" value={l.id} />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmar" className="h-4 w-4" /> Confirmo a exclusão</label>
                    <button type="submit" className="text-sm font-bold text-[var(--color-danger)] underline">Excluir link</button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
