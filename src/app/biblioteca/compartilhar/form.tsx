"use client";

import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/form-state";
import { LICENCAS, LICENCAS_AUTOR, TIPOS_RECURSO, tipoRecursoDeDocumento } from "@/lib/biblioteca";
import type { TipoDocumento } from "@/lib/documentos";
import { ETAPAS } from "@/lib/validation";
import { FormMessage, SubmitButton } from "@/components/ui";
import { compartilharDocumento } from "../actions";

type Doc = { id: string; titulo: string; tipo: TipoDocumento; rotulo: string };

export function CompartilharForm({ documentos, selecionado, organizacoes }: { documentos: Doc[]; selecionado?: string; organizacoes: { id: string; nome: string }[] }) {
  const [state, action] = useActionState(compartilharDocumento, initialFormState);
  const inicial = documentos.find((d) => d.id === selecionado) ?? documentos[0];
  const [doc, setDoc] = useState<Doc>(inicial);
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [tipo, setTipo] = useState<string>(tipoRecursoDeDocumento(inicial.tipo));
  const [licenca, setLicenca] = useState<string>("cc-by-4.0");

  return (
    <form action={action} className="mt-8 space-y-6">
      <FormMessage status={state.status} message={state.message} />
      <label className="block">
        <span className="mb-1 block font-bold">Documento</span>
        <select name="documento_id" value={doc.id} onChange={(e) => { const d = documentos.find((x) => x.id === e.target.value)!; setDoc(d); setTitulo(d.titulo); setTipo(tipoRecursoDeDocumento(d.tipo)); }} className="field">
          {documentos.map((d) => <option key={d.id} value={d.id}>{d.titulo} — {d.rotulo}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block font-bold">Título na biblioteca</span><input name="titulo" required maxLength={160} value={titulo} onChange={(e) => setTitulo(e.target.value)} className="field" /></label>
        <label className="block"><span className="mb-1 block font-bold">Tipo</span>
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="field">
            {Object.entries(TIPOS_RECURSO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      <label className="block"><span className="mb-1 block font-bold">Descrição</span>
        <textarea name="descricao" required rows={4} maxLength={1500} placeholder="Para que serve, como usar, tempo previsto…" className="field" />
      </label>
      <fieldset>
        <legend className="mb-2 font-bold">Etapas</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ETAPAS.map((e) => (
            <label key={e.value} className="flex items-center gap-2 text-[0.97rem]"><input type="checkbox" name="etapas" value={e.value} className="h-4 w-4 accent-[var(--action)]" />{e.label}</label>
          ))}
        </div>
      </fieldset>
      <label className="block max-w-sm"><span className="mb-1 block font-bold">Componente curricular (opcional)</span><input name="componente" maxLength={80} className="field" /></label>

      <fieldset>
        <legend className="mb-2 font-bold">Licença</legend>
        <div className="space-y-2">
          {LICENCAS_AUTOR.map((l) => (
            <label key={l} className="flex items-start gap-3 rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] p-3 has-[:checked]:border-[var(--action)]">
              <input type="radio" name="licenca" value={l} checked={licenca === l} onChange={() => setLicenca(l)} className="mt-1 h-5 w-5 accent-[var(--action)]" />
              <span><strong>{LICENCAS[l].nome}</strong> — {LICENCAS[l].resumo}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block max-w-sm">
        <span className="mb-1 block font-bold">Para quem</span>
        <select name="destino" defaultValue="publica" className="field">
          <option value="publica">Todos (com revisão editorial)</option>
          {organizacoes.map((o) => <option key={o.id} value={`org:${o.id}`}>Só para {o.nome}</option>)}
        </select>
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="declaracao" className="mt-1 h-5 w-5 accent-[var(--action)]" />
        <span className="text-[0.97rem]">
          Declaro que sou autor(a) deste material ou tenho autorização para compartilhá-lo, que ele não reproduz conteúdo protegido de terceiros (livros didáticos, provas de bancas, imagens sem licença) e que não contém dados de estudantes.
        </span>
      </label>
      <SubmitButton pendingText="Enviando…">Compartilhar</SubmitButton>
    </form>
  );
}
