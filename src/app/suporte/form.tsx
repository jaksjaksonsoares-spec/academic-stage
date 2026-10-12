"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CATEGORIAS_SUPORTE } from "@/lib/suporte-dados";
import { Field, FormMessage, SubmitButton, describedBy } from "@/components/ui";
import { enviarSolicitacao, type SuporteState } from "./actions";

const inicial: SuporteState = { status: "idle" };

export function SuporteForm({ token, nome, email, logado }: { token: string; nome: string; email: string; logado: boolean }) {
  const [state, action] = useActionState(enviarSolicitacao, inicial);
  const f = state.fields ?? {};

  if (state.status === "success" && state.protocolo) {
    return (
      <div role="status" className="space-y-4 rounded-[var(--radius-card)] border-l-4 border-[var(--color-success)] bg-[var(--surface)] p-6">
        <p className="text-sm text-[var(--muted)]">Protocolo</p>
        <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-wide">{state.protocolo}</p>
        <p>Sua solicitação foi registrada. Guarde o número do protocolo.</p>
        <ul className="list-disc space-y-1 pl-5 text-[0.97rem]">
          <li>
            {state.emailUsuario === "enviado"
              ? "Enviamos uma confirmação para o seu e-mail."
              : state.emailUsuario === "nao_configurado"
                ? "O envio de e-mails ainda não está ativado: você não receberá confirmação por e-mail, mas a solicitação está registrada."
                : "Não conseguimos enviar a confirmação por e-mail agora, mas a solicitação está registrada."}
          </li>
          {state.emailAdmin !== "enviado" && <li>A equipe verá sua solicitação no painel de atendimento.</li>}
        </ul>
        {logado && <Link href="/suporte/solicitacoes" className="inline-block font-bold text-[var(--action)] underline">Acompanhar minhas solicitações</Link>}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" encType="multipart/form-data" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <input type="hidden" name="token" value={token} />
      {/* Campo invisível para robôs: pessoas não o veem nem preenchem. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label>Site<input type="text" name="site" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome" name="nome" error={f.nome}>
          <input {...describedBy("nome", f.nome)} defaultValue={nome} required maxLength={120} autoComplete="name" className="field" />
        </Field>
        <Field label="E-mail para resposta" name="email" error={f.email}>
          <input {...describedBy("email", f.email)} type="email" defaultValue={email} required maxLength={254} autoComplete="email" className="field" />
        </Field>
      </div>
      <Field label="Categoria" name="categoria" error={f.categoria}>
        <select {...describedBy("categoria", f.categoria)} required defaultValue="" className="field">
          <option value="" disabled>Escolha</option>
          {Object.entries(CATEGORIAS_SUPORTE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <Field label="Assunto" name="assunto" error={f.assunto}>
        <input {...describedBy("assunto", f.assunto)} required maxLength={160} className="field" />
      </Field>
      <Field label="Descrição" name="descricao" error={f.descricao} hint="Conte o que aconteceu ou o que você precisa. Não inclua dados de estudantes.">
        <textarea {...describedBy("descricao", f.descricao, "x")} required rows={6} maxLength={5000} className="field" />
      </Field>
      <Field label="Anexos (opcional)" name="anexos" error={f.anexos} hint="Até 3 arquivos PDF, PNG ou JPG, somando no máximo 4 MB.">
        <input {...describedBy("anexos", f.anexos, "x")} type="file" multiple accept="application/pdf,image/png,image/jpeg" className="field py-2" />
      </Field>
      <div className="space-y-1">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consentimento" className="mt-1 h-5 w-5 accent-[var(--action)]" aria-invalid={f.consentimento ? true : undefined} />
          <span className="text-[0.97rem]">
            Concordo que meu nome, e-mail e a mensagem sejam usados para responder a esta solicitação, conforme a{" "}
            <Link href="/privacidade" target="_blank" className="font-bold underline">Política de Privacidade</Link>. Guardamos as solicitações por até 2 anos.
          </span>
        </label>
        {f.consentimento && <p className="text-sm font-bold text-[var(--color-danger)]">{f.consentimento}</p>}
      </div>
      <SubmitButton pendingText="Enviando…">Enviar solicitação</SubmitButton>
    </form>
  );
}
