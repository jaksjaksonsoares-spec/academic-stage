"use client";

import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/form-state";
import { FormMessage, SubmitButton } from "@/components/ui";
import { criarPlanoEstudo } from "./actions";

type Materia = { materia: string; texto: string };
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function PlanoEstudoForm({
  editalId,
  tituloInicial = "",
  materiasIniciais = [],
  sugestoesData = [],
}: {
  editalId?: string;
  tituloInicial?: string;
  materiasIniciais?: { materia: string; topicos: string[] }[];
  sugestoesData?: { data: string; contexto: string }[];
}) {
  const [state, action] = useActionState(criarPlanoEstudo, initialFormState);
  const [materias, setMaterias] = useState<Materia[]>(
    materiasIniciais.length ? materiasIniciais.map((m) => ({ materia: m.materia, texto: m.topicos.join("\n") })) : [{ materia: "", texto: "" }],
  );
  const [dataProva, setDataProva] = useState("");

  const payload = materias.map((m) => ({ materia: m.materia, topicos: m.texto.split("\n").map((t) => t.trim()).filter(Boolean) }));
  const total = payload.reduce((s, m) => s + m.topicos.length, 0);

  return (
    <form action={action} className="mt-6 space-y-8">
      <FormMessage status={state.status} message={state.message} />
      {editalId && <input type="hidden" name="edital_id" value={editalId} />}
      <input type="hidden" name="materias" value={JSON.stringify(payload)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold">Nome do plano</span>
          <input name="titulo" required maxLength={160} defaultValue={tituloInicial} className="field" />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Data da prova (opcional)</span>
          <input name="data_prova" type="date" value={dataProva} onChange={(e) => setDataProva(e.target.value)} className="field" />
        </label>
      </div>

      {sugestoesData.length > 0 && (
        <div>
          <p className="text-sm font-bold">Datas encontradas no edital — toque para usar como data da prova:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sugestoesData.slice(0, 12).map((d, i) => (
              <button key={i} type="button" title={d.contexto} onClick={() => setDataProva(d.data)} className={`rounded-full border px-3 py-1 text-sm ${dataProva === d.data ? "border-[var(--action)] font-bold text-[var(--action)]" : "border-[var(--line)]"}`}>
                {d.data.split("-").reverse().join("/")}
              </button>
            ))}
          </div>
        </div>
      )}

      <fieldset>
        <legend className="mb-2 font-bold">Dias de estudo</legend>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d, i) => (
            <label key={d} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-3 py-2 has-[:checked]:border-[var(--action)] has-[:checked]:font-bold">
              <input type="checkbox" name="dias_semana" value={i} defaultChecked={i >= 1 && i <= 5} className="h-4 w-4 accent-[var(--action)]" />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-bold">Minutos por dia</span>
          <input name="minutos_dia" type="number" min={15} max={720} step={5} defaultValue={90} className="field" />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Duração de cada sessão</span>
          <input name="minutos_sessao" type="number" min={10} max={240} step={5} defaultValue={45} className="field" />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Meta semanal (min, opcional)</span>
          <input name="meta_semanal_minutos" type="number" min={0} max={10080} step={30} className="field" />
        </label>
      </div>

      <fieldset>
        <legend className="mb-1 font-bold">Conteúdos ({total} tópicos)</legend>
        <p className="mb-3 text-sm text-[var(--muted)]">Um tópico por linha. As matérias são intercaladas e cada tópico ganha revisões depois de 1, 7 e 30 dias.</p>
        <div className="space-y-4">
          {materias.map((m, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-[var(--line)] p-4">
              <div className="flex gap-2">
                <input value={m.materia} maxLength={120} placeholder="Matéria (ex.: Conhecimentos Pedagógicos)" aria-label={`Matéria ${i + 1}`} onChange={(e) => setMaterias((ms) => ms.map((x, j) => (j === i ? { ...x, materia: e.target.value } : x)))} className="field py-2 font-bold" />
                {materias.length > 1 && <button type="button" onClick={() => setMaterias((ms) => ms.filter((_, j) => j !== i))} className="px-2 text-sm font-bold text-[var(--color-danger)]">Remover</button>}
              </div>
              <textarea rows={5} value={m.texto} aria-label={`Tópicos de ${m.materia || `matéria ${i + 1}`}`} onChange={(e) => setMaterias((ms) => ms.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} className="field mt-2" />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setMaterias((ms) => [...ms, { materia: "", texto: "" }])} className="mt-3 font-bold text-[var(--action)]">+ Matéria</button>
      </fieldset>

      <SubmitButton pendingText="Montando cronograma…">Criar plano de estudos</SubmitButton>
    </form>
  );
}
