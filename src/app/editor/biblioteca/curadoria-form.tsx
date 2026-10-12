"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { LICENCAS, TIPOS_RECURSO } from "@/lib/biblioteca";
import { ETAPAS } from "@/lib/validation";
import { FormMessage, SubmitButton } from "@/components/ui";
import { adicionarCuradoria } from "./actions";

export function CuradoriaForm() {
  const [state, action] = useActionState(adicionarCuradoria, initialFormState);
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage status={state.status} message={state.message} /></div>
      <label className="block text-sm font-bold">Título<input name="titulo" required maxLength={160} className="field mt-1 font-normal" /></label>
      <label className="block text-sm font-bold">Endereço (https)<input name="link_url" type="url" required className="field mt-1 font-normal" /></label>
      <label className="block text-sm font-bold">Fonte (instituição)<input name="fonte_nome" required maxLength={200} className="field mt-1 font-normal" /></label>
      <label className="block text-sm font-bold">Tipo
        <select name="tipo" className="field mt-1 font-normal">{Object.entries(TIPOS_RECURSO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </label>
      <label className="block text-sm font-bold">Licença declarada pela fonte
        <select name="licenca" defaultValue="link-externo" className="field mt-1 font-normal">{Object.entries(LICENCAS).map(([v, l]) => <option key={v} value={v}>{l.nome}</option>)}</select>
      </label>
      <label className="block text-sm font-bold">Componente (opcional)<input name="componente" maxLength={80} className="field mt-1 font-normal" /></label>
      <label className="block text-sm font-bold sm:col-span-2">Descrição<textarea name="descricao" required rows={3} maxLength={1500} className="field mt-1 font-normal" /></label>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-sm font-bold">Etapas</legend>
        <div className="grid gap-1 sm:grid-cols-3">{ETAPAS.map((e) => <label key={e.value} className="flex items-center gap-2 text-sm"><input type="checkbox" name="etapas" value={e.value} className="h-4 w-4" />{e.label}</label>)}</div>
      </fieldset>
      <div className="sm:col-span-2"><SubmitButton pendingText="Publicando…">Publicar indicação</SubmitButton></div>
    </form>
  );
}
