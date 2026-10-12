import Link from "next/link";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";

async function marcarTodas() {
  "use server";
  const { supabase, user } = await requireUser("/painel/notificacoes");
  await supabase.from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("user_id", user.id).is("lida_em", null);
  revalidatePath("/", "layout");
}

async function apagar(fd: FormData) {
  "use server";
  const { supabase } = await requireUser("/painel/notificacoes");
  const id = z.coerce.number().int().positive().parse(fd.get("id"));
  await supabase.from("notificacoes").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export default async function NotificacoesPage() {
  const { supabase } = await requireUser("/painel/notificacoes");
  const { data } = await supabase.from("notificacoes").select("id,titulo,corpo,link,lida_em,created_at").order("created_at", { ascending: false }).limit(100);
  const itens = data ?? [];
  const naoLidas = itens.filter((n) => !n.lida_em).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Notificações</h1>
        {naoLidas > 0 && (
          <form action={marcarTodas}>
            <button type="submit" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold">Marcar todas como lidas</button>
          </form>
        )}
      </div>
      <p className="text-[var(--muted)]">
        Avisos de prazos dos concursos que você acompanha e das sessões de estudo do dia.{" "}
        <Link href="/painel/preferencias" className="font-bold text-[var(--action)] underline">Escolher o que receber</Link>
      </p>
      {itens.length === 0 ? (
        <p className="text-[var(--muted)]">Nenhuma notificação por enquanto.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {itens.map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-4">
              <span aria-hidden="true" className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${n.lida_em ? "bg-transparent" : "bg-[var(--action)]"}`} />
              <div className="min-w-0 flex-1">
                {n.link ? <Link href={n.link} className="font-bold hover:underline">{n.titulo}</Link> : <p className="font-bold">{n.titulo}</p>}
                {!n.lida_em && <span className="sr-only"> (não lida)</span>}
                {n.corpo && <p className="text-[var(--muted)]">{n.corpo}</p>}
                <p className="text-sm text-[var(--muted)]">{new Date(n.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
              </div>
              <form action={apagar}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" aria-label={`Apagar notificação: ${n.titulo}`} className="rounded-lg px-2 py-1 text-[var(--muted)] hover:text-[var(--color-danger)]">✕</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
