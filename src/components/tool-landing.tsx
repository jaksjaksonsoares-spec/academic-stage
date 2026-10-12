import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/documentos";
import { getArea } from "@/lib/areas";
import { criarDocumento } from "@/app/painel/documentos/actions";
import { Icon } from "./icon";

export async function ToolLanding({ tipo, recursos, aviso }: { tipo: TipoDocumento; recursos: string[]; aviso?: string }) {
  const area = getArea(TIPOS_DOCUMENTO[tipo].rota)!;
  const { supabase, user } = await getUser();
  const recentes =
    supabase && user
      ? ((await supabase.from("documentos").select("id,titulo,updated_at").eq("tipo", tipo).order("updated_at", { ascending: false }).limit(5)).data ?? [])
      : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="flex items-start gap-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-ink)] text-[var(--color-spot)]">
          <Icon name={area.icon} className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">{area.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-[var(--muted)]">{area.description}</p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        {user ? (
          <form action={criarDocumento}>
            <input type="hidden" name="tipo" value={tipo} />
            <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-6 py-3 font-bold text-[var(--action-text)]">{TIPOS_DOCUMENTO[tipo].novo}</button>
          </form>
        ) : (
          <>
            <Link href={`/cadastro`} className="rounded-[var(--radius-control)] bg-[var(--action)] px-6 py-3 font-bold text-[var(--action-text)]">Criar conta gratuita para começar</Link>
            <Link href={`/entrar?next=/${area.slug}`} className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-6 py-3 font-bold">Já tenho conta</Link>
          </>
        )}
      </div>
      {!user && <p className="mt-3 text-sm text-[var(--muted)]">A conta é necessária para salvar seus documentos com segurança.</p>}

      {recentes.length > 0 && (
        <section aria-labelledby="recentes" className="mt-12">
          <h2 id="recentes" className="text-xl font-bold">Seus últimos</h2>
          <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {recentes.map((d) => (
              <li key={d.id}>
                <Link href={`/painel/documentos/${d.id}`} className="flex justify-between gap-4 py-3 hover:underline">
                  <span className="font-bold">{d.titulo}</span>
                  <span className="text-sm text-[var(--muted)]">{new Date(d.updated_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={`/painel/documentos?tipo=${tipo}`} className="mt-3 inline-block font-bold text-[var(--action)] underline">Ver todos</Link>
        </section>
      )}

      <section aria-labelledby="recursos" className="mt-14">
        <h2 id="recursos" className="text-xl font-bold">O que dá para fazer</h2>
        <ul className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {recursos.map((r) => (
            <li key={r} className="flex gap-3">
              <Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-[var(--action)]" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        {aviso && <p className="mt-8 max-w-2xl rounded-[var(--radius-control)] border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">{aviso}</p>}
      </section>
    </div>
  );
}
