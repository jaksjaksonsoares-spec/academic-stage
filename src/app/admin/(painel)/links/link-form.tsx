"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { FormMessage, SubmitButton } from "@/components/ui";
import { salvarLink } from "../actions";

const CATEGORIAS = { legislacao: "Legislação", concursos: "Concursos", planejamento: "Planejamento", avaliacao: "Avaliação", formacao: "Formação", inclusao: "Inclusão", pesquisa: "Pesquisa", tecnologia: "Tecnologia" };

type L = { id: number; titulo: string; url: string; descricao: string; orgao: string; categoria: string; ativo: boolean };

export function LinkForm({ link }: { link?: L }) {
  const [state, action] = useActionState(salvarLink, initialFormState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage status={state.status} message={state.message} /></div>
      {link && <input type="hidden" name="id" value={link.id} />}
      <label className="block text-sm font-bold">Título<input name="titulo" required maxLength={120} defaultValue={link?.titulo} className="field mt-1 py-2 font-normal" /></label>
      <label className="block text-sm font-bold">Endereço (https)<input name="url" type="url" required maxLength={1000} defaultValue={link?.url} className="field mt-1 py-2 font-normal" /></label>
      <label className="block text-sm font-bold">Órgão<input name="orgao" required maxLength={120} defaultValue={link?.orgao} className="field mt-1 py-2 font-normal" /></label>
      <label className="block text-sm font-bold">Categoria
        <select name="categoria" defaultValue={link?.categoria ?? "legislacao"} className="field mt-1 py-2 font-normal">
          {Object.entries(CATEGORIAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="block text-sm font-bold sm:col-span-2">Para que serve<textarea name="descricao" required rows={2} maxLength={400} defaultValue={link?.descricao} className="field mt-1 font-normal" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={link ? link.ativo : true} className="h-4 w-4" /> Visível na página pública</label>
      <div className="sm:col-span-2"><SubmitButton pendingText="Salvando…">{link ? "Salvar alterações" : "Adicionar link"}</SubmitButton></div>
    </form>
  );
}
