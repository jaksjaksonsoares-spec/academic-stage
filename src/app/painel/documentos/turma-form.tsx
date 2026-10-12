"use client";

import { useActionState, useEffect, useRef } from "react";
import { initialFormState } from "@/lib/form-state";
import { FormMessage, SubmitButton } from "@/components/ui";
import { criarTurma } from "./actions";

export function TurmaForm() {
  const [state, action] = useActionState(criarTurma, initialFormState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-2 rounded-[var(--radius-card)] border border-[var(--line)] p-4">
      <p className="font-bold">Nova turma</p>
      <FormMessage status={state.status} message={state.message} />
      <label className="block text-sm">
        Nome <input name="nome" required maxLength={80} placeholder="Ex.: 7º ano B" className="field mt-1 py-2" />
      </label>
      <label className="block text-sm">
        Etapa (opcional) <input name="etapa" maxLength={40} className="field mt-1 py-2" />
      </label>
      <label className="block text-sm">
        Componente (opcional) <input name="componente" maxLength={60} className="field mt-1 py-2" />
      </label>
      <SubmitButton pendingText="Criando…" className="w-full rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold">Criar turma</SubmitButton>
    </form>
  );
}
