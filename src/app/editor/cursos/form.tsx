"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { MODALIDADES_CURSO, TIPOS_CURSO } from "@/lib/cursos";
import { UFS } from "@/lib/validation";
import { FormMessage, SubmitButton } from "@/components/ui";
import { salvarCurso } from "./actions";

export type CursoEdit = Record<string, string | number | boolean | null>;

export function CursoForm({ curso }: { curso?: CursoEdit }) {
  const [state, action] = useActionState(salvarCurso, initialFormState);
  const f = state.fields ?? {};
  const v = (k: string) => (curso?.[k] ?? "") as string;
  const In = ({ name, label, type = "text", req, span }: { name: string; label: string; type?: string; req?: boolean; span?: boolean }) => (
    <label className={`block text-sm font-bold ${span ? "sm:col-span-2" : ""}`}>
      {label}{req && " *"}
      <input name={name} type={type} required={req} defaultValue={v(name)} aria-invalid={f[name] ? true : undefined} className="field mt-1 py-2 font-normal" />
      {f[name] && <span className="mt-1 block text-[var(--color-danger)]">{f[name]}</span>}
    </label>
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage status={state.status} message={state.message} /></div>
      {curso && <input type="hidden" name="id" value={String(curso.id)} />}
      <In name="titulo" label="Título" req span />
      <In name="instituicao" label="Instituição responsável" req />
      <label className="block text-sm font-bold">Tipo
        <select name="tipo" defaultValue={v("tipo") || "livre"} className="field mt-1 py-2 font-normal">{Object.entries(TIPOS_CURSO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </label>
      <label className="block text-sm font-bold">Modalidade
        <select name="modalidade" defaultValue={v("modalidade") || "ead"} className="field mt-1 py-2 font-normal">{Object.entries(MODALIDADES_CURSO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </label>
      <label className="block text-sm font-bold">Estado (se presencial)
        <select name="uf" defaultValue={v("uf")} className="field mt-1 py-2 font-normal"><option value="">—</option>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
      </label>
      <label className="block text-sm font-bold">Gratuito?
        <select name="gratuito" defaultValue={curso ? (curso.gratuito ? "sim" : "nao") : "sim"} className="field mt-1 py-2 font-normal"><option value="sim">Sim</option><option value="nao">Não</option></select>
      </label>
      <In name="custo" label="Custo (se pago)" />
      <In name="carga_horaria" label="Carga horária (horas)" type="number" />
      <In name="duracao" label="Duração" />
      <In name="inscricao_fim" label="Inscrições até" type="date" />
      <In name="inicio" label="Início" type="date" />
      <In name="publico" label="Público" span />
      <label className="block text-sm font-bold sm:col-span-2">Requisitos<textarea name="requisitos" rows={2} maxLength={2000} defaultValue={v("requisitos")} className="field mt-1 font-normal" /></label>
      <In name="certificacao" label="Certificação (como descrita pela instituição)" span />
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="reconhecimento_conferido" defaultChecked={!!curso?.reconhecimento_conferido} className="h-4 w-4" /> Conferi o reconhecimento oficial</label>
      <In name="reconhecimento_fonte" label="Onde conferi (e-MEC, Sucupira…)" type="url" />
      <In name="link_oficial" label="Página oficial do curso" type="url" req />
      <In name="fonte_nome" label="Nome da fonte" req />
      <div className="sm:col-span-2"><SubmitButton pendingText="Salvando…">{curso ? "Salvar alterações" : "Criar rascunho"}</SubmitButton></div>
    </form>
  );
}
