"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { ETAPAS, INTERESSES, UFS } from "@/lib/validation";
import type { NotificationPrefs, Profile } from "@/lib/session";
import { Field, FormMessage, SubmitButton, buttonPrimary, describedBy } from "@/components/ui";
import { deleteAccount, saveInterests, updateInterests, updateNotifications, updateProfile } from "./actions";

const checkCard =
  "flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-4 py-3 has-[:checked]:border-[var(--action)] has-[:checked]:bg-[color-mix(in_srgb,var(--action)_8%,var(--surface))] has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--color-spot)]";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, initialFormState);
  const f = state.fields ?? {};
  return (
    <form action={action} className="max-w-2xl space-y-6">
      <FormMessage status={state.status} message={state.message} />

      <Field label="Como quer ser chamado" name="displayName" error={f.displayName}>
        <input {...describedBy("displayName", f.displayName)} defaultValue={profile.display_name} required maxLength={80} className="field" autoComplete="nickname" />
      </Field>

      <fieldset>
        <legend className="font-bold">Etapas em que atua ou pretende atuar</legend>
        <p className="mb-3 text-sm text-[var(--muted)]">Opcional. Marque quantas quiser.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ETAPAS.map((e) => (
            <label key={e.value} className={checkCard}>
              <input type="checkbox" name="etapas" value={e.value} defaultChecked={profile.etapas.includes(e.value)} className="h-5 w-5 accent-[var(--action)]" />
              {e.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Componentes curriculares" name="componentes" hint="Opcional. Separe por vírgulas — ex.: Língua Inglesa, Arte" error={f.componentes}>
        <input {...describedBy("componentes", f.componentes, "x")} defaultValue={profile.componentes.join(", ")} maxLength={500} className="field" />
      </Field>

      <div className="grid gap-6 sm:grid-cols-[160px_1fr]">
        <Field label="Estado" name="uf" error={f.uf}>
          <select {...describedBy("uf", f.uf)} defaultValue={profile.uf ?? ""} className="field">
            <option value="">Não informar</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </Field>
        <Field label="Municípios de interesse" name="municipios" hint="Opcional. Até 10, separados por vírgulas." error={f.municipios}>
          <input {...describedBy("municipios", f.municipios, "x")} defaultValue={profile.municipios.join(", ")} maxLength={500} className="field" />
        </Field>
      </div>

      <Field label="Objetivos profissionais" name="objetivos" hint="Opcional. Ex.: passar no concurso da rede estadual, fazer mestrado." error={f.objetivos}>
        <textarea {...describedBy("objetivos", f.objetivos, "x")} defaultValue={profile.objetivos} maxLength={500} rows={3} className="field" />
      </Field>

      <SubmitButton pendingText="Salvando…">Salvar perfil</SubmitButton>
    </form>
  );
}

function InterestChecks({ selected }: { selected: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {INTERESSES.map((i) => (
        <label key={i.value} className={checkCard}>
          <input type="checkbox" name="interesses" value={i.value} defaultChecked={selected.includes(i.value)} className="h-5 w-5 accent-[var(--action)]" />
          {i.label}
        </label>
      ))}
    </div>
  );
}

export function OnboardingForm({ selected }: { selected: string[] }) {
  const [state, action] = useActionState(saveInterests, initialFormState);
  return (
    <form action={action} className="space-y-8">
      <FormMessage status={state.status} message={state.message} />
      <fieldset>
        <legend className="sr-only">Interesses</legend>
        <InterestChecks selected={selected} />
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Salvando…">Montar meu painel</SubmitButton>
        <button type="submit" name="intent" value="pular" formNoValidate className="rounded-[var(--radius-control)] px-5 py-3 font-bold text-[var(--muted)] hover:text-[var(--text)]">
          Pular por agora
        </button>
      </div>
    </form>
  );
}

export function InterestsForm({ selected }: { selected: string[] }) {
  const [state, action] = useActionState(updateInterests, initialFormState);
  return (
    <form action={action} className="space-y-5">
      <FormMessage status={state.status} message={state.message} />
      <fieldset>
        <legend className="sr-only">Interesses</legend>
        <InterestChecks selected={selected} />
      </fieldset>
      <SubmitButton pendingText="Salvando…">Salvar interesses</SubmitButton>
    </form>
  );
}

const TOPICS = [
  { value: "prazos", label: "Prazos de concursos que acompanho" },
  { value: "novos-concursos", label: "Novos concursos na minha região" },
  { value: "estudos", label: "Lembretes do plano de estudos" },
  { value: "novidades", label: "Novidades da plataforma" },
];

export function NotificationsForm({ prefs }: { prefs: NotificationPrefs }) {
  const [state, action] = useActionState(updateNotifications, initialFormState);
  return (
    <form action={action} className="max-w-2xl space-y-6">
      <FormMessage status={state.status} message={state.message} />

      <fieldset className="space-y-2">
        <legend className="mb-2 font-bold">Onde receber</legend>
        <label className={checkCard}>
          <input type="checkbox" name="inAppEnabled" defaultChecked={prefs.in_app_enabled} className="h-5 w-5 accent-[var(--action)]" />
          No painel do site
        </label>
        <label className={checkCard}>
          <input type="checkbox" name="emailEnabled" defaultChecked={prefs.email_enabled} className="h-5 w-5 accent-[var(--action)]" />
          Por e-mail
        </label>
        <p className="text-sm text-[var(--muted)]">O envio por e-mail começa quando o serviço de e-mail for ativado (fase 4). Sua escolha já fica salva.</p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-bold">Sobre o quê</legend>
        {TOPICS.map((t) => (
          <label key={t.value} className={checkCard}>
            <input type="checkbox" name="topics" value={t.value} defaultChecked={prefs.topics.includes(t.value)} className="h-5 w-5 accent-[var(--action)]" />
            {t.label}
          </label>
        ))}
      </fieldset>

      <Field label="Frequência" name="frequency">
        <select id="frequency" name="frequency" defaultValue={prefs.frequency} className="field max-w-xs">
          <option value="imediata">Assim que acontecer</option>
          <option value="diaria">Resumo diário</option>
          <option value="semanal">Resumo semanal</option>
        </select>
      </Field>

      <SubmitButton pendingText="Salvando…">Salvar notificações</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, initialFormState);
  const f = state.fields ?? {};
  return (
    <form action={action} className="max-w-md space-y-5">
      <FormMessage status={state.status} message={state.message} />
      <Field label="Digite EXCLUIR para confirmar" name="confirmation" error={f.confirmation}>
        <input {...describedBy("confirmation", f.confirmation)} autoComplete="off" required className="field" />
      </Field>
      <Field label="Sua senha" name="password" error={f.password}>
        <input {...describedBy("password", f.password)} type="password" autoComplete="current-password" required className="field" />
      </Field>
      <SubmitButton
        pendingText="Excluindo…"
        className={`${buttonPrimary} !bg-[var(--color-danger)] !text-white`}
      >
        Excluir minha conta definitivamente
      </SubmitButton>
    </form>
  );
}
