import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "Suporte", alternates: { canonical: "/suporte" } };

const FAQ = [
  { q: "Não recebi o e-mail de confirmação.", a: "Confira a caixa de spam e promoções. O link pode levar alguns minutos para chegar. Se expirou, tente entrar: a mensagem mostrará como pedir outro." },
  { q: "Esqueci minha senha.", a: "Use “Esqueci minha senha” na tela de entrar. O link de recuperação é de uso único e expira em pouco tempo." },
  { q: "Como apago minha conta e meus dados?", a: "Em Meu painel → Conta e privacidade. A exclusão é imediata e apaga todos os dados ligados à conta. Antes, você pode baixar uma cópia." },
  { q: "Quando chegam a busca de concursos e o planejamento de aulas?", a: "Na fase 2. Marque esses interesses no seu perfil para vê-los em destaque no painel assim que entrarem no ar." },
];

export default function SuportePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-extrabold">Suporte</h1>

      <section role="note" className="mt-8 flex gap-4 rounded-[var(--radius-card)] border border-dashed border-[var(--line)] p-6">
        <Icon name="info" className="h-6 w-6 shrink-0 text-[var(--action)]" />
        <div>
          <h2 className="text-lg font-bold">Formulário de atendimento em configuração</h2>
          <p className="mt-1 text-[var(--muted)]">
            O formulário com número de protocolo e confirmação por e-mail entra no ar na fase 4, quando o serviço de envio de e-mails
            for conectado. Até lá, as respostas abaixo cobrem as dúvidas mais comuns.
          </p>
        </div>
      </section>

      <section aria-labelledby="faq" className="mt-12">
        <h2 id="faq" className="text-2xl font-bold">Perguntas frequentes</h2>
        <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="cursor-pointer list-none font-bold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span aria-hidden="true" className="text-xl text-[var(--action)] transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-[var(--muted)]">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-10 text-[var(--muted)]">
        Pedidos sobre seus dados pessoais: você já pode baixá-los ou excluí-los em{" "}
        <Link href="/painel/conta" className="font-bold underline">Conta e privacidade</Link>.
      </p>
    </div>
  );
}
