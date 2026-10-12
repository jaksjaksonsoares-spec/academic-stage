"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/form-state";
import { Field, FormMessage, SubmitButton, describedBy } from "@/components/ui";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

function PasswordInput({ name, error, hint, autoComplete }: { name: string; error?: string; hint?: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...describedBy(name, error, hint)}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        maxLength={128}
        className="field pr-20"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-sm font-bold text-[var(--action)]"
      >
        {show ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, initialFormState);
  const f = state.fields ?? {};

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <FormMessage status="success" message={state.message} />
        <p className="text-sm text-[var(--muted)]">Não chegou? Confira a caixa de spam ou aguarde alguns minutos antes de tentar de novo.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <Field label="Como quer ser chamado" name="displayName" error={f.displayName}>
        <input {...describedBy("displayName", f.displayName)} defaultValue={state.values?.displayName} autoComplete="nickname" required maxLength={80} className="field" />
      </Field>
      <Field label="E-mail" name="email" error={f.email}>
        <input {...describedBy("email", f.email)} type="email" defaultValue={state.values?.email} autoComplete="email" required maxLength={254} className="field" />
      </Field>
      <Field label="Senha" name="password" error={f.password} hint="Pelo menos 10 caracteres, com letras e números.">
        <PasswordInput name="password" error={f.password} hint="x" autoComplete="new-password" />
      </Field>
      <div className="space-y-1.5">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="acceptTerms" className="mt-1 h-5 w-5 accent-[var(--action)]" aria-invalid={f.acceptTerms ? true : undefined} aria-describedby={f.acceptTerms ? "acceptTerms-error" : undefined} />
          <span>
            Li e aceito os <Link href="/termos" target="_blank" className="font-bold underline">Termos de Uso</Link> e entendi a{" "}
            <Link href="/privacidade" target="_blank" className="font-bold underline">Política de Privacidade</Link>.
          </span>
        </label>
        {f.acceptTerms && <p id="acceptTerms-error" className="text-sm font-bold text-[var(--color-danger)]">{f.acceptTerms}</p>}
      </div>
      <SubmitButton pendingText="Criando conta…" className="w-full rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] hover:brightness-110 disabled:opacity-60">
        Criar conta
      </SubmitButton>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initialFormState);
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage status={state.status} message={state.message} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="E-mail" name="email" error={f.email}>
        <input {...describedBy("email", f.email)} type="email" defaultValue={state.values?.email} autoComplete="email" required className="field" />
      </Field>
      <Field label="Senha" name="password" error={f.password}>
        <PasswordInput name="password" error={f.password} autoComplete="current-password" />
      </Field>
      <div className="text-right">
        <Link href="/recuperar-senha" className="text-sm font-bold text-[var(--action)] underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <SubmitButton pendingText="Entrando…" className="w-full rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] hover:brightness-110 disabled:opacity-60">
        Entrar
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialFormState);
  const f = state.fields ?? {};
  if (state.status === "success") return <FormMessage status="success" message={state.message} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <Field label="E-mail da conta" name="email" error={f.email}>
        <input {...describedBy("email", f.email)} type="email" autoComplete="email" required className="field" />
      </Field>
      <SubmitButton pendingText="Enviando…" className="w-full rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] hover:brightness-110 disabled:opacity-60">
        Enviar link de recuperação
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initialFormState);
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <Field label="Nova senha" name="password" error={f.password} hint="Pelo menos 10 caracteres, com letras e números.">
        <PasswordInput name="password" error={f.password} hint="x" autoComplete="new-password" />
      </Field>
      <Field label="Repita a nova senha" name="confirm" error={f.confirm}>
        <PasswordInput name="confirm" error={f.confirm} autoComplete="new-password" />
      </Field>
      <SubmitButton pendingText="Salvando…" className="w-full rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] hover:brightness-110 disabled:opacity-60">
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
