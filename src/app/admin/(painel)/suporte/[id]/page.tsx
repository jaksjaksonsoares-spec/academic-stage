import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { CATEGORIAS_SUPORTE } from "@/lib/suporte-dados";
import { RespostaForm } from "./resposta-form";

type Anexo = { path: string; nome: string; tipo: string; tamanho: number };

const ENVIO: Record<string, string> = { enviado: "enviado", falhou: "falhou", nao_configurado: "e-mail não configurado" };

export default async function SolicitacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase } = await requireAdmin(`/admin/suporte/${id}`);
  const { data: s } = await supabase.from("suporte_solicitacoes").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const anexos = (s.anexos ?? []) as Anexo[];

  return (
    <div className="space-y-8">
      <Link href="/admin/suporte" className="text-sm text-[var(--muted)] hover:underline">Atendimento</Link>
      <header>
        <p className="font-mono text-sm font-bold">{s.protocolo}</p>
        <h1 className="mt-1 text-[clamp(1.7rem,3.5vw,2.25rem)] font-extrabold">{s.assunto}</h1>
        <p className="mt-1 text-[var(--muted)]">
          {CATEGORIAS_SUPORTE[s.categoria as keyof typeof CATEGORIAS_SUPORTE]} · {s.nome} &lt;{s.email}&gt; · {s.user_id ? "usuário com conta" : "visitante"} ·{" "}
          {new Date(s.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Aviso à equipe: {ENVIO[s.email_admin_status]} · Confirmação ao solicitante: {ENVIO[s.email_usuario_status]}
        </p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="sr-only">Mensagem</h2>
        <p className="whitespace-pre-line">{s.descricao}</p>
        {anexos.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {anexos.map((a) => (
              <li key={a.path}>
                <a href={`/admin/suporte/${s.id}/anexo?path=${encodeURIComponent(a.path)}`} className="inline-block rounded-[var(--radius-control)] border border-[var(--line)] px-3 py-1.5 text-sm font-bold" rel="noopener">
                  {a.nome} ({Math.ceil(a.tamanho / 1024)} KB)
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {s.resposta && s.respondida_em && (
        <section className="rounded-[var(--radius-card)] bg-[var(--bg)] p-5">
          <h2 className="text-sm font-bold">Resposta enviada em {new Date(s.respondida_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</h2>
          <p className="mt-1 whitespace-pre-line">{s.resposta}</p>
        </section>
      )}

      <RespostaForm id={s.id} status={s.status} resposta={s.respondida_em ? "" : s.resposta ?? ""} />
    </div>
  );
}
