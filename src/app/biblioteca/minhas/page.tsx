import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { STATUS_RECURSO, TIPOS_RECURSO } from "@/lib/biblioteca";
import { FormMessage } from "@/components/ui";
import { excluirColecao, removerDaColecao, removerMeuRecurso } from "../actions";
import { NovaColecao } from "./nova-colecao";

export const metadata: Metadata = { title: "Meus materiais", robots: { index: false } };

const AVISOS: Record<string, string> = {
  revisao: "Material enviado. Ele aparece na biblioteca depois da revisão editorial.",
  org: "Material publicado para os membros da sua organização.",
};

export default async function MinhasPage({ searchParams }: { searchParams: Promise<{ enviado?: string; removido?: string }> }) {
  const { supabase, user } = await requireUser("/biblioteca/minhas");
  const sp = await searchParams;
  const [{ data: meus }, { data: colecoes }, { data: favs }] = await Promise.all([
    supabase.from("recursos").select("id,titulo,tipo,status,motivo_recusa,visibilidade,copias,created_at").eq("autor_id", user.id).order("created_at", { ascending: false }),
    supabase.from("colecoes").select("id,nome,colecao_itens(recurso_id, recursos(id,titulo,tipo))").order("nome"),
    supabase.from("favorites").select("item_id").eq("user_id", user.id).eq("item_type", "material"),
  ]);
  const favIds = (favs ?? []).map((f) => f.item_id).filter((x) => /^[0-9a-f-]{36}$/.test(x));
  const { data: salvos } = favIds.length ? await supabase.from("recursos").select("id,titulo,tipo").in("id", favIds) : { data: [] };
  type Col = { id: string; nome: string; colecao_itens: { recurso_id: string; recursos: { id: string; titulo: string; tipo: string } | null }[] };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/biblioteca" className="text-sm text-[var(--muted)] hover:underline">Biblioteca</Link>
      <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Meus materiais e coleções</h1>
      {sp.enviado && AVISOS[sp.enviado] && <div className="mt-6"><FormMessage status="success" message={AVISOS[sp.enviado]} /></div>}
      {sp.removido && <div className="mt-6"><FormMessage status="success" message="Material removido da biblioteca. Seu documento original continua em Meus documentos." /></div>}

      <section aria-labelledby="comp" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="comp" className="text-2xl font-bold">Compartilhados por mim</h2>
          <Link href="/biblioteca/compartilhar" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2 font-bold text-[var(--action-text)]">Compartilhar outro</Link>
        </div>
        {(meus ?? []).length === 0 ? (
          <p className="mt-3 text-[var(--muted)]">Você ainda não compartilhou materiais.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {(meus ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <Link href={`/biblioteca/${r.id}`} className="font-bold hover:underline">{r.titulo}</Link>
                  <p className="text-sm text-[var(--muted)]">
                    {TIPOS_RECURSO[r.tipo as keyof typeof TIPOS_RECURSO]} · {r.visibilidade === "organizacao" ? "organização" : "todos"} ·{" "}
                    <strong className={r.status === "recusado" ? "text-[var(--color-danger)]" : ""}>{STATUS_RECURSO[r.status as keyof typeof STATUS_RECURSO]}</strong>
                    {r.copias > 0 && ` · ${r.copias} cópias`}
                  </p>
                  {r.status === "recusado" && r.motivo_recusa && <p className="mt-1 text-sm">Motivo: {r.motivo_recusa}</p>}
                </div>
                <form action={removerMeuRecurso}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="text-sm font-bold text-[var(--color-danger)]">Remover da biblioteca</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="salvos" className="mt-12">
        <h2 id="salvos" className="text-2xl font-bold">Salvos</h2>
        {(salvos ?? []).length === 0 ? <p className="mt-3 text-[var(--muted)]">Use “Salvar” na página de um material.</p> : (
          <ul className="mt-3 space-y-1">{(salvos ?? []).map((r) => <li key={r.id}><Link href={`/biblioteca/${r.id}`} className="font-bold hover:underline">{r.titulo}</Link></li>)}</ul>
        )}
      </section>

      <section aria-labelledby="cols" className="mt-12">
        <h2 id="cols" className="text-2xl font-bold">Coleções</h2>
        <NovaColecao />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {((colecoes ?? []) as unknown as Col[]).map((c) => (
            <div key={c.id} className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold">{c.nome}</h3>
                <form action={excluirColecao}><input type="hidden" name="id" value={c.id} /><button type="submit" className="text-sm text-[var(--muted)] hover:text-[var(--color-danger)]">Excluir coleção</button></form>
              </div>
              {c.colecao_itens.length === 0 ? <p className="mt-2 text-sm text-[var(--muted)]">Vazia. Adicione materiais pela página de cada um.</p> : (
                <ul className="mt-2 space-y-1">
                  {c.colecao_itens.filter((i) => i.recursos).map((i) => (
                    <li key={i.recurso_id} className="flex items-center justify-between gap-2">
                      <Link href={`/biblioteca/${i.recurso_id}`} className="hover:underline">{i.recursos!.titulo}</Link>
                      <form action={removerDaColecao}><input type="hidden" name="colecao" value={c.id} /><input type="hidden" name="recurso" value={i.recurso_id} /><button type="submit" aria-label={`Tirar ${i.recursos!.titulo} da coleção`} className="text-[var(--muted)] hover:text-[var(--color-danger)]">✕</button></form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
