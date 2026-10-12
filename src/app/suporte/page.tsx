import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { gerarTokenFormulario } from "@/lib/suporte";
import { SuporteForm } from "./form";

export const metadata: Metadata = {
  title: "Suporte",
  description: "Fale com a equipe do AcademiC Stage: dúvidas, problemas técnicos, concursos, privacidade e sugestões, com número de protocolo.",
  alternates: { canonical: "/suporte" },
};

const FAQ = [
  { q: "Não recebi o e-mail de confirmação da conta.", a: "Confira a caixa de spam e promoções. O link pode levar alguns minutos. Se expirou, tente entrar: a tela mostra como pedir outro." },
  { q: "Esqueci minha senha.", a: "Use “Esqueci minha senha” na tela de entrar. O link é de uso único e expira em pouco tempo." },
  { q: "Como apago minha conta e meus dados?", a: "Em Meu painel → Conta e privacidade. A exclusão é imediata e apaga todos os dados ligados à conta. Antes, você pode baixar uma cópia." },
  { q: "Um concurso está com informação diferente do edital.", a: "O edital oficial sempre prevalece. Envie o protocolo pela categoria “Concursos e editais” com o link da fonte, e a equipe confere e corrige." },
  { q: "A análise do edital não encontrou o conteúdo programático.", a: "PDFs digitalizados (fotos de páginas) não têm texto para ler. Nesses casos, copie os tópicos do anexo para o plano de estudos manualmente." },
  { q: "O assistente bloqueou minha mensagem.", a: "Mensagens com CPF, telefone, e-mail, data de nascimento ou matrícula são bloqueadas para proteger estudantes. Descreva a situação sem dados pessoais." },
  { q: "Como exporto uma prova para o Word?", a: "No editor do documento, salve as alterações e use “Word” na seção Exportar. Para PDF, use “PDF” e escolha “Salvar como PDF” na impressão." },
];

export default async function SuportePage() {
  const { supabase, user } = await getUser();
  let nome = "";
  if (supabase && user) {
    const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
    nome = data?.display_name ?? "";
  }
  const segredo = process.env.FORM_SECRET;
  const token = segredo ? gerarTokenFormulario(segredo) : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-extrabold">Suporte</h1>
      <p className="mt-3 max-w-2xl text-lg text-[var(--muted)]">Antes de escrever, veja se a resposta está nas perguntas frequentes. Toda solicitação recebe um número de protocolo.</p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="form-t">
          <h2 id="form-t" className="mb-5 text-2xl font-bold">Enviar solicitação</h2>
          <SuporteForm token={token} nome={nome} email={user?.email ?? ""} logado={!!user} />
          {user && <Link href="/suporte/solicitacoes" className="mt-6 inline-block font-bold text-[var(--action)] underline">Ver minhas solicitações</Link>}
        </section>

        <aside className="space-y-8">
          <section aria-labelledby="politica">
            <h2 id="politica" className="text-lg font-bold">Como funciona o atendimento</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.97rem] text-[var(--muted)]">
              <li>Respondemos por e-mail, em dias úteis, na ordem de chegada.</li>
              <li>Pedidos sobre dados pessoais (LGPD) têm prioridade e resposta em até 15 dias.</li>
              <li>Não pedimos senhas. Desconfie de mensagens que peçam.</li>
              <li>Para exportar ou excluir seus dados agora, use <Link href="/painel/conta" className="font-bold underline">Conta e privacidade</Link>.</li>
            </ul>
          </section>
          <section aria-labelledby="faq">
            <h2 id="faq" className="text-lg font-bold">Perguntas frequentes</h2>
            <div className="mt-2 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-bold">
                    {item.q}
                    <span aria-hidden="true" className="text-xl leading-none text-[var(--action)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-[0.95rem] text-[var(--muted)]">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
