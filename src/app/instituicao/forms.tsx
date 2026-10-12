"use client";

import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/form-state";
import { UFS } from "@/lib/validation";
import { FormMessage, SubmitButton } from "@/components/ui";
import { criarConvite, criarOrganizacao, type ConviteState } from "./actions";

export function NovaOrganizacao() {
  const [state, action] = useActionState(criarOrganizacao, initialFormState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage status={state.status} message={state.message} /></div>
      <label className="block text-sm font-bold sm:col-span-2">Nome<input name="nome" required maxLength={160} placeholder="Ex.: Escola Municipal Paulo Freire" className="field mt-1 font-normal" /></label>
      <label className="block text-sm font-bold">Tipo<select name="tipo" className="field mt-1 font-normal"><option value="escola">Escola</option><option value="rede">Rede de ensino</option><option value="instituicao">Outra instituição</option></select></label>
      <label className="block text-sm font-bold">Estado<select name="uf" className="field mt-1 font-normal"><option value="">—</option>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
      <label className="block text-sm font-bold sm:col-span-2">Município<input name="municipio" maxLength={120} className="field mt-1 font-normal" /></label>
      <div><SubmitButton pendingText="Criando…">Criar organização</SubmitButton></div>
    </form>
  );
}

const inicial: ConviteState = { status: "idle" };

export function NovoConvite({ org }: { org: string }) {
  const [state, action] = useActionState(criarConvite, inicial);
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="org" value={org} />
        <label className="block text-sm font-bold">Entra como<select name="papel" className="field mt-1 py-2 font-normal"><option value="membro">Membro</option><option value="gestor">Gestor(a)</option></select></label>
        <label className="block text-sm font-bold">Válido por<select name="dias" defaultValue="7" className="field mt-1 py-2 font-normal"><option value="1">1 dia</option><option value="7">7 dias</option><option value="30">30 dias</option></select></label>
        <SubmitButton pendingText="Gerando…" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2.5 font-bold text-[var(--action-text)]">Gerar link de convite</SubmitButton>
      </form>
      {state.status === "error" && <FormMessage status="error" message={state.message} />}
      {state.link && (
        <div role="status" className="rounded-[var(--radius-control)] border border-[var(--action)] p-4">
          <p className="text-sm font-bold">{state.message}</p>
          <div className="mt-2 flex gap-2">
            <input readOnly value={state.link} className="field py-2 font-mono text-sm" aria-label="Link de convite" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(state.link!); setCopiado(true); }} className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 font-bold">{copiado ? "Copiado" : "Copiar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
