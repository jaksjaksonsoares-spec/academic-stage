"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { FormMessage, SubmitButton } from "@/components/ui";
import { salvarLimites } from "../actions";

type Limites = Record<"gratuito" | "profissional" | "institucional", { assistente: number; edital: number }>;
const PLANOS = { gratuito: "Gratuito", profissional: "Profissional", institucional: "Institucional" } as const;

export function LimitesForm({ limites }: { limites: Limites }) {
  const [state, action] = useActionState(salvarLimites, initialFormState);
  return (
    <form action={action} className="mt-4 max-w-xl space-y-4">
      <FormMessage status={state.status} message={state.message} />
      <table className="w-full text-left">
        <thead className="border-b-2 border-[var(--text)] text-sm"><tr><th className="py-2">Plano</th><th className="py-2">Mensagens ao assistente</th><th className="py-2">Editais com IA</th></tr></thead>
        <tbody>
          {(Object.keys(PLANOS) as (keyof typeof PLANOS)[]).map((p) => (
            <tr key={p} className="border-b border-[var(--line)]">
              <th scope="row" className="py-2 pr-3 font-bold">{PLANOS[p]}</th>
              <td className="py-2 pr-3"><input aria-label={`${PLANOS[p]}: mensagens por dia`} name={`${p}_assistente`} type="number" min={0} max={5000} defaultValue={limites[p].assistente} className="field w-28 py-1.5" /></td>
              <td className="py-2"><input aria-label={`${PLANOS[p]}: editais por dia`} name={`${p}_edital`} type="number" min={0} max={5000} defaultValue={limites[p].edital} className="field w-28 py-1.5" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <SubmitButton pendingText="Salvando…">Salvar limites</SubmitButton>
    </form>
  );
}
