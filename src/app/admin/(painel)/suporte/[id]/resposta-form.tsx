"use client";

import { useActionState } from "react";
import { STATUS_SUPORTE } from "@/lib/suporte-dados";
import { FormMessage } from "@/components/ui";
import { atualizarSolicitacao, type RespostaState } from "../../actions";

const inicial: RespostaState = { status: "idle" };

export function RespostaForm({ id, status, resposta }: { id: string; status: string; resposta: string }) {
  const [state, action, pending] = useActionState(atualizarSolicitacao, inicial);
  return (
    <form action={action} className="space-y-4">
      <FormMessage status={state.status} message={state.message} />
      <input type="hidden" name="id" value={id} />
      <label className="block max-w-xs">
        <span className="mb-1 block font-bold">Situação</span>
        <select name="status" defaultValue={status === "aberta" ? "em_andamento" : status} className="field">
          {Object.entries(STATUS_SUPORTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-bold">Resposta</span>
        <textarea name="resposta" rows={8} maxLength={10000} defaultValue={resposta} className="field" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="enviar" value="1" disabled={pending} className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] disabled:opacity-60">
          {pending ? "Enviando…" : "Enviar resposta por e-mail"}
        </button>
        <button type="submit" name="enviar" value="" disabled={pending} className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-5 py-3 font-bold disabled:opacity-60">
          Só salvar
        </button>
      </div>
      <p className="text-sm text-[var(--muted)]">Ao enviar, a situação é salva e a resposta só é registrada como enviada se o provedor confirmar.</p>
    </form>
  );
}
