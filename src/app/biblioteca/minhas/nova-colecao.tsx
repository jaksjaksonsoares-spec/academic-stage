"use client";

import { useActionState, useEffect, useRef } from "react";
import { initialFormState } from "@/lib/form-state";
import { FormMessage, SubmitButton } from "@/components/ui";
import { criarColecao } from "../actions";

export function NovaColecao() {
  const [state, action] = useActionState(criarColecao, initialFormState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.status === "success") ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="mt-3 flex max-w-md flex-wrap items-end gap-2">
      <label className="flex-1"><span className="mb-1 block text-sm font-bold">Nova coleção</span><input name="nome" required maxLength={80} placeholder="Ex.: Revisão do 3º bimestre" className="field py-2" /></label>
      <SubmitButton pendingText="Criando…" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2.5 font-bold">Criar</SubmitButton>
      <div className="w-full"><FormMessage status={state.status} message={state.message} /></div>
    </form>
  );
}
