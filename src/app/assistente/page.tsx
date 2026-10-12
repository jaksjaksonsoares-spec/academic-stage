import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { iaConfigurada } from "@/lib/ia";
import { consultarCota } from "@/lib/limites";
import { Icon } from "@/components/icon";
import { Chat } from "./chat";

export const metadata: Metadata = {
  title: "Assistente pedagógico",
  description: "IA para professores: planos de aula, atividades, rubricas, comunicados e cronogramas, separando fatos verificáveis de sugestões.",
  alternates: { canonical: "/assistente" },
};

export default async function AssistentePage() {
  const { supabase, user } = await getUser();
  const ativo = iaConfigurada();
  const cota = ativo && supabase && user ? await consultarCota(supabase, user.id, "assistente") : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex items-start gap-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-ink)] text-[var(--color-spot)]">
          <Icon name="spark" className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Assistente pedagógico</h1>
          <p className="mt-3 max-w-2xl text-lg text-[var(--muted)]">
            Peça planos de aula, atividades, rubricas, pautas e comunicados. O assistente pergunta o que faltar e separa fatos verificáveis de sugestões.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {!ativo ? (
          <div role="status" className="flex gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--line)] p-5">
            <Icon name="info" className="h-5 w-5 shrink-0 text-[var(--action)]" />
            <p><strong>Assistente pendente de configuração.</strong> Ele funciona depois que a chave da API de IA for cadastrada no servidor (veja o README).</p>
          </div>
        ) : !user ? (
          <div className="flex flex-wrap gap-3">
            <Link href="/cadastro" className="rounded-[var(--radius-control)] bg-[var(--action)] px-6 py-3 font-bold text-[var(--action-text)]">Criar conta gratuita</Link>
            <Link href="/entrar?next=/assistente" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-6 py-3 font-bold">Já tenho conta</Link>
          </div>
        ) : (
          <Chat restantesInicial={cota?.restantes ?? 0} limite={cota?.limite ?? 0} />
        )}
      </div>

      <section aria-labelledby="cuidados" className="mt-12 grid gap-6 rounded-[var(--radius-card)] bg-[var(--surface)] p-6 sm:grid-cols-3">
        <h2 id="cuidados" className="sr-only">Cuidados</h2>
        <div><p className="font-bold">Revise sempre</p><p className="mt-1 text-sm text-[var(--muted)]">Tudo o que a IA escreve é sugestão e pode conter erros. Confira leis, códigos da BNCC e referências nas fontes oficiais.</p></div>
        <div><p className="font-bold">Sem dados de estudantes</p><p className="mt-1 text-sm text-[var(--muted)]">Não inclua nomes, CPF, laudos ou diagnósticos. Descreva barreiras e necessidades de forma anônima. Mensagens com dados pessoais óbvios são bloqueadas.</p></div>
        <div><p className="font-bold">Conversa não fica guardada</p><p className="mt-1 text-sm text-[var(--muted)]">A conversa fica só nesta página. Salve as respostas úteis em “Meus documentos” para editar e exportar.</p></div>
      </section>
    </div>
  );
}
