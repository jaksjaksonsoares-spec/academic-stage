"use client";

import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/form-state";
import { AREAS_CARGO, ESCOLARIDADES, ESFERAS, FASES, MODALIDADES, REGIMES, TIPOS_SELECAO } from "@/lib/concursos";
import { UFS } from "@/lib/validation";
import type { ConcursoRow, CargoRow } from "@/lib/concursos-query";
import { FormMessage, SubmitButton } from "@/components/ui";
import { registrarVerificacao, salvarConcurso } from "./actions";

type Cargo = Omit<CargoRow, "vagas" | "remuneracao"> & { vagas: string; remuneracao: string };

const cargoVazio = (): Cargo => ({
  cargo: "", area: "professor", escolaridade: "superior", formacao_exigida: "", requisitos: "",
  vagas: "", cadastro_reserva: false, remuneracao: "", carga_horaria: "", regime: "",
});

function Input({ name, label, def, type = "text", error, hint, required }: { name: string; label: string; def?: string | number | null; type?: string; error?: string; hint?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-bold">{label}{required && " *"}</label>
      {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
      <input id={name} name={name} type={type} defaultValue={def ?? ""} required={required} aria-invalid={error ? true : undefined} className="field py-2" step={type === "number" ? "0.01" : undefined} />
      {error && <p className="text-sm font-bold text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

function Select({ name, label, def, options, error, vazio }: { name: string; label: string; def?: string | null; options: Record<string, string> | readonly string[]; error?: string; vazio?: string }) {
  const entries = Array.isArray(options) ? options.map((o) => [o, o]) : Object.entries(options);
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-bold">{label}</label>
      <select id={name} name={name} defaultValue={def ?? ""} className="field py-2" aria-invalid={error ? true : undefined}>
        {vazio !== undefined && <option value="">{vazio}</option>}
        {entries.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {error && <p className="text-sm font-bold text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

export function ConcursoForm({ concurso }: { concurso?: ConcursoRow }) {
  const [state, action] = useActionState(salvarConcurso, initialFormState);
  const [cargos, setCargos] = useState<Cargo[]>(
    concurso?.concurso_cargos.length
      ? concurso.concurso_cargos.map((k) => ({ ...k, vagas: k.vagas?.toString() ?? "", remuneracao: k.remuneracao?.toString() ?? "", formacao_exigida: k.formacao_exigida ?? "", requisitos: k.requisitos ?? "", carga_horaria: k.carga_horaria ?? "", regime: k.regime ?? "" }))
      : [cargoVazio()],
  );
  const f = state.fields ?? {};
  const c = concurso;
  const set = (i: number, patch: Partial<Cargo>) => setCargos((cs) => cs.map((k, j) => (j === i ? { ...k, ...patch } : k)));

  return (
    <form action={action} className="space-y-10">
      {c && <input type="hidden" name="id" value={c.id} />}
      <input type="hidden" name="cargos" value={JSON.stringify(cargos)} />
      <FormMessage status={state.status} message={state.message} />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-bold">Identificação</legend>
        <div className="sm:col-span-2"><Input name="titulo" label="Título" def={c?.titulo} error={f.titulo} required hint="Como aparece no edital. Ex.: Concurso Público nº 01/2026 — Magistério" /></div>
        <Input name="orgao" label="Órgão ou instituição" def={c?.orgao} error={f.orgao} required />
        <Select name="esfera" label="Esfera" def={c?.esfera ?? "municipal"} options={ESFERAS} />
        <Select name="uf" label="Estado" def={c?.uf} options={UFS} error={f.uf} vazio="Escolha" />
        <Input name="municipio" label="Município" def={c?.municipio} />
        <Select name="tipo_selecao" label="Tipo" def={c?.tipo_selecao ?? "concurso"} options={TIPOS_SELECAO} />
        <Select name="fase" label="Fase (segundo a fonte)" def={c?.fase ?? "previsto"} options={FASES} />
        <Input name="banca" label="Banca organizadora" def={c?.banca} />
        <Select name="modalidade" label="Modalidade da prova" def={c?.modalidade} options={MODALIDADES} vazio="Não informada" />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <legend className="mb-3 text-lg font-bold">Datas e taxa</legend>
        <Input name="data_publicacao" label="Publicação" type="date" def={c?.data_publicacao} />
        <Input name="inscricao_inicio" label="Início inscrições" type="date" def={c?.inscricao_inicio} />
        <Input name="inscricao_fim" label="Fim inscrições" type="date" def={c?.inscricao_fim} error={f.inscricao_fim} />
        <Input name="data_prova" label="Prova" type="date" def={c?.data_prova} />
        <Input name="taxa_inscricao" label="Taxa (R$)" type="number" def={c?.taxa_inscricao} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-bold">Links e fonte</legend>
        <Input name="edital_url" label="Link do edital oficial" type="url" def={c?.edital_url} error={f.edital_url} />
        <Input name="inscricao_url" label="Link de inscrição" type="url" def={c?.inscricao_url} error={f.inscricao_url} />
        <Input name="fonte_nome" label="Nome da fonte" def={c?.fonte_nome} error={f.fonte_nome} required hint="Ex.: Diário Oficial do Município" />
        <Input name="fonte_url" label="Link da fonte" type="url" def={c?.fonte_url} error={f.fonte_url} required />
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-bold">Cargos</legend>
        {f.cargos && <p className="mb-3 font-bold text-[var(--color-danger)]">{f.cargos}</p>}
        <div className="space-y-4">
          {cargos.map((k, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-[var(--line)] p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 sm:col-span-3">
                  <span className="block text-sm font-bold">Cargo {i + 1}</span>
                  <input value={k.cargo} onChange={(e) => set(i, { cargo: e.target.value })} className="field py-2" />
                </label>
                <label className="space-y-1"><span className="block text-sm font-bold">Área</span>
                  <select value={k.area} onChange={(e) => set(i, { area: e.target.value })} className="field py-2">
                    {Object.entries(AREAS_CARGO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="space-y-1"><span className="block text-sm font-bold">Escolaridade</span>
                  <select value={k.escolaridade} onChange={(e) => set(i, { escolaridade: e.target.value })} className="field py-2">
                    {Object.entries(ESCOLARIDADES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="space-y-1"><span className="block text-sm font-bold">Regime</span>
                  <select value={k.regime ?? ""} onChange={(e) => set(i, { regime: e.target.value })} className="field py-2">
                    <option value="">Não informado</option>
                    {Object.entries(REGIMES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="space-y-1"><span className="block text-sm font-bold">Vagas</span>
                  <input type="number" min={0} value={k.vagas} onChange={(e) => set(i, { vagas: e.target.value })} className="field py-2" />
                </label>
                <label className="space-y-1"><span className="block text-sm font-bold">Remuneração (R$)</span>
                  <input type="number" min={0} step="0.01" value={k.remuneracao} onChange={(e) => set(i, { remuneracao: e.target.value })} className="field py-2" />
                </label>
                <label className="space-y-1"><span className="block text-sm font-bold">Carga horária</span>
                  <input value={k.carga_horaria ?? ""} onChange={(e) => set(i, { carga_horaria: e.target.value })} className="field py-2" placeholder="Ex.: 24h semanais" />
                </label>
                <label className="space-y-1 sm:col-span-3"><span className="block text-sm font-bold">Formação exigida</span>
                  <input value={k.formacao_exigida ?? ""} onChange={(e) => set(i, { formacao_exigida: e.target.value })} className="field py-2" />
                </label>
                <label className="space-y-1 sm:col-span-3"><span className="block text-sm font-bold">Outros requisitos</span>
                  <textarea rows={2} value={k.requisitos ?? ""} onChange={(e) => set(i, { requisitos: e.target.value })} className="field py-2" />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={k.cadastro_reserva} onChange={(e) => set(i, { cadastro_reserva: e.target.checked })} className="h-5 w-5 accent-[var(--action)]" />
                  Cadastro reserva
                </label>
              </div>
              {cargos.length > 1 && (
                <button type="button" onClick={() => setCargos((cs) => cs.filter((_, j) => j !== i))} className="mt-3 text-sm font-bold text-[var(--color-danger)]">
                  Remover cargo {i + 1}
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setCargos((cs) => [...cs, cargoVazio()])} className="mt-3 font-bold text-[var(--action)]">
          + Adicionar cargo
        </button>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-bold">Conteúdo e observações</legend>
        <div className="space-y-1">
          <label htmlFor="conteudo_programatico" className="block text-sm font-bold">Conteúdo programático</label>
          <p className="text-xs text-[var(--muted)]">Transcreva do edital. Não resuma nem complete de memória.</p>
          <textarea id="conteudo_programatico" name="conteudo_programatico" rows={8} defaultValue={c?.conteudo_programatico ?? ""} className="field" />
        </div>
        <div className="space-y-1">
          <label htmlFor="observacoes" className="block text-sm font-bold">Observações</label>
          <textarea id="observacoes" name="observacoes" rows={3} defaultValue={c?.observacoes ?? ""} className="field" />
        </div>
      </fieldset>

      <SubmitButton pendingText="Salvando…">{c ? "Salvar alterações" : "Criar rascunho"}</SubmitButton>
    </form>
  );
}

export function VerificacaoForm({ id, fonteUrl }: { id: string; fonteUrl: string }) {
  const [state, action] = useActionState(registrarVerificacao, initialFormState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage status={state.status} message={state.message} />
      <div className="space-y-1">
        <label htmlFor="v-fonte" className="block text-sm font-bold">Link conferido agora</label>
        <input id="v-fonte" name="fonte_url" type="url" required defaultValue={fonteUrl} className="field py-2" />
        {state.fields?.fonte_url && <p className="text-sm font-bold text-[var(--color-danger)]">{state.fields.fonte_url}</p>}
      </div>
      <div className="space-y-1">
        <label htmlFor="v-obs" className="block text-sm font-bold">O que foi conferido (opcional)</label>
        <input id="v-obs" name="observacao" maxLength={1000} className="field py-2" placeholder="Ex.: prazo prorrogado pela retificação 02" />
      </div>
      <SubmitButton pendingText="Registrando…">Registrar verificação</SubmitButton>
    </form>
  );
}
