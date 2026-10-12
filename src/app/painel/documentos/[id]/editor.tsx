"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { checarCodigoBncc, compativelComTurma } from "@/lib/bncc";
import { LETRAS, TIPOS_DOCUMENTO, novoId, pendencias, type Atividade, type Avaliacao, type Plano, type TipoDocumento } from "@/lib/documentos";
import { AtividadeView, AvaliacaoView, GabaritoView, PlanoView } from "@/components/documento-render";
import { Icon } from "@/components/icon";
import { salvarDocumento } from "../actions";
import { QuestoesEditor } from "./questoes-editor";

type Turma = { id: string; nome: string };
type Doc = { id: string; tipo: TipoDocumento; titulo: string; turma_id: string | null; updated_at: string };
type Conteudo = Plano | Atividade | Avaliacao;

const label = "mb-1 block text-sm font-bold";

export function DocumentoEditor({ doc, conteudoInicial, turmas }: { doc: Doc; conteudoInicial: Conteudo; turmas: Turma[] }) {
  const [titulo, setTitulo] = useState(doc.titulo);
  const [turmaId, setTurmaId] = useState(doc.turma_id ?? "");
  const [conteudo, setConteudo] = useState<Conteudo>(conteudoInicial);
  const [dirty, setDirty] = useState(false);
  const [aba, setAba] = useState<"editar" | "ver">("editar");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setDirty(true);
  }, [titulo, turmaId, conteudo]);

  const salvar = useCallback(() => {
    start(async () => {
      const r = await salvarDocumento({ id: doc.id, tipo: doc.tipo, titulo, turmaId: turmaId || null, conteudo });
      setStatus({ ok: r.ok, message: r.ok ? `Salvo às ${new Date(r.savedAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : r.message });
      if (r.ok) setDirty(false);
    });
  }, [doc.id, doc.tipo, titulo, turmaId, conteudo]);

  // Ctrl/Cmd+S salva; aviso ao sair com alterações não salvas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); salvar(); }
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onLeave); };
  }, [salvar, dirty]);

  const set = <T extends Conteudo>(patch: Partial<T>) => setConteudo((c) => ({ ...c, ...patch }) as Conteudo);
  const versoes = doc.tipo === "avaliacao" ? (conteudo as Avaliacao).versoes : 1;

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/painel/documentos" className="text-sm text-[var(--muted)] hover:underline">Documentos</Link>
          <span className="text-sm text-[var(--muted)]">/ {TIPOS_DOCUMENTO[doc.tipo].label}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span role="status" aria-live="polite" className={`text-sm ${status && !status.ok ? "font-bold text-[var(--color-danger)]" : "text-[var(--muted)]"}`}>
              {pending ? "Salvando…" : dirty ? "Alterações não salvas" : status?.message ?? ""}
            </span>
            <button type="button" onClick={salvar} disabled={pending} className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2 font-bold text-[var(--action-text)] disabled:opacity-60">
              Salvar
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
        <label>
          <span className={label}>Título</span>
          <input value={titulo} maxLength={160} onChange={(e) => setTitulo(e.target.value)} className="field text-lg font-bold" />
        </label>
        <label>
          <span className={label}>Turma</span>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="field">
            <option value="">Sem turma</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </label>
      </div>

      <div role="tablist" aria-label="Modo" className="mt-6 flex gap-1 border-b border-[var(--line)]">
        {(["editar", "ver"] as const).map((a) => (
          <button key={a} role="tab" type="button" aria-selected={aba === a} onClick={() => setAba(a)} className={`-mb-px border-b-2 px-4 py-2.5 font-bold ${aba === a ? "border-[var(--action)] text-[var(--text)]" : "border-transparent text-[var(--muted)]"}`}>
            {a === "editar" ? "Editar" : "Pré-visualizar"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {aba === "editar" ? (
          <>
            {doc.tipo === "plano" && <PlanoForm p={conteudo as Plano} set={set} />}
            {doc.tipo === "atividade" && <AtividadeForm a={conteudo as Atividade} set={set} />}
            {doc.tipo === "avaliacao" && <AvaliacaoForm a={conteudo as Avaliacao} set={set} />}
          </>
        ) : (
          <div className="space-y-8">
            {doc.tipo === "plano" && <PlanoView titulo={titulo} p={conteudo as Plano} />}
            {doc.tipo === "atividade" && <AtividadeView titulo={titulo} a={conteudo as Atividade} docId={doc.id} versao={0} comGabarito />}
            {doc.tipo === "avaliacao" && (
              <>
                <AvaliacaoView titulo={titulo} a={conteudo as Avaliacao} docId={doc.id} versao={0} />
                <GabaritoView questoes={(conteudo as Avaliacao).questoes} salt={`${doc.id}:0`} titulo="Gabarito (versão A)" />
              </>
            )}
          </div>
        )}
      </div>

      <section aria-labelledby="exportar" className="mt-12 rounded-[var(--radius-card)] border border-[var(--line)] p-5">
        <h2 id="exportar" className="text-lg font-bold">Exportar</h2>
        {dirty && <p className="mt-1 text-sm font-bold text-[#8a5a00] dark:text-[#f0c060]">Salve antes de exportar: a exportação usa a versão salva.</p>}
        <div className="mt-3 flex flex-wrap gap-3">
          {Array.from({ length: versoes }, (_, v) => (
            <span key={v} className="flex flex-wrap gap-2">
              <a href={`/painel/documentos/${doc.id}/imprimir?versao=${v}`} target="_blank" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold hover:border-[var(--muted)]">
                <Icon name="document" className="h-4 w-4" /> PDF{versoes > 1 ? ` versão ${LETRAS[v]}` : ""}
              </a>
              <a href={`/api/documentos/${doc.id}/docx?versao=${v}`} className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold hover:border-[var(--muted)]">
                <Icon name="download" className="h-4 w-4" /> Word{versoes > 1 ? ` versão ${LETRAS[v]}` : ""}
              </a>
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          O PDF abre uma página pronta para impressão — escolha “Salvar como PDF” no destino da impressora.
          {doc.tipo !== "plano" && " O gabarito vai em página separada."}
        </p>
      </section>
    </div>
  );
}

/* ── Plano ─────────────────────────────────────────────────────────── */

function Area({ titulo, valor, onChange, rows = 3, hint, max = 3000 }: { titulo: string; valor: string; onChange: (v: string) => void; rows?: number; hint?: string; max?: number }) {
  return (
    <label className="block">
      <span className={label}>{titulo}</span>
      {hint && <span className="mb-1 block text-xs text-[var(--muted)]">{hint}</span>}
      <textarea rows={rows} value={valor} maxLength={max} onChange={(e) => onChange(e.target.value)} className="field" />
    </label>
  );
}

function PlanoForm({ p, set }: { p: Plano; set: (x: Partial<Plano>) => void }) {
  const anosMax = p.etapa === "EM" ? 3 : 9;
  return (
    <div className="space-y-8">
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-lg font-bold">1. Identificação</legend>
        <label><span className={label}>Tipo de planejamento</span>
          <select value={p.periodicidade} onChange={(e) => set({ periodicidade: e.target.value as Plano["periodicidade"] })} className="field">
            <option value="aula">Aula</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option><option value="sequencia">Sequência didática</option>
          </select>
        </label>
        <label><span className={label}>Etapa</span>
          <select value={p.etapa} onChange={(e) => set({ etapa: e.target.value as Plano["etapa"], ano: null })} className="field">
            <option value="">Escolha</option><option value="EI">Educação Infantil</option><option value="EF">Ensino Fundamental</option><option value="EM">Ensino Médio</option>
          </select>
        </label>
        {p.etapa !== "EI" && (
          <label><span className={label}>{p.etapa === "EM" ? "Série" : "Ano"}</span>
            <select value={p.ano ?? ""} onChange={(e) => set({ ano: e.target.value ? Number(e.target.value) : null })} className="field">
              <option value="">—</option>
              {Array.from({ length: anosMax }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}{p.etapa === "EM" ? "ª série" : "º ano"}</option>)}
            </select>
          </label>
        )}
        <label><span className={label}>Componente curricular</span><input value={p.componente} maxLength={80} onChange={(e) => set({ componente: e.target.value })} className="field" /></label>
        <label><span className={label}>Duração</span><input value={p.duracao} maxLength={80} onChange={(e) => set({ duracao: e.target.value })} className="field" placeholder="Ex.: 2 aulas de 50 min" /></label>
        <label><span className={label}>Metodologia</span><input value={p.metodologia} maxLength={200} onChange={(e) => set({ metodologia: e.target.value })} className="field" placeholder="Ex.: aprendizagem baseada em projetos" /></label>
        <label className="sm:col-span-3"><span className={label}>Tema</span><input value={p.tema} maxLength={200} onChange={(e) => set({ tema: e.target.value })} className="field" /></label>
      </fieldset>

      <Area titulo="2. Objetivos de aprendizagem" valor={p.objetivos} onChange={(v) => set({ objetivos: v })} />

      <HabilidadesEditor p={p} set={set} />

      <Area titulo="4. Conhecimentos prévios" valor={p.conhecimentosPrevios} onChange={(v) => set({ conhecimentosPrevios: v })} max={2000} />
      <Area titulo="5. Materiais necessários" valor={p.materiais} onChange={(v) => set({ materiais: v })} max={2000} />

      <fieldset>
        <legend className="mb-2 text-lg font-bold">6. Desenvolvimento passo a passo</legend>
        <div className="space-y-3">
          {p.desenvolvimento.map((e, i) => (
            <div key={e.id} className="rounded-[var(--radius-card)] border border-[var(--line)] p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                <label><span className={label}>Etapa {i + 1}</span><input value={e.titulo} maxLength={120} onChange={(ev) => set({ desenvolvimento: p.desenvolvimento.map((x) => (x.id === e.id ? { ...x, titulo: ev.target.value } : x)) })} className="field py-2" placeholder="Ex.: Acolhida e problematização" /></label>
                <label><span className={label}>Tempo</span><input value={e.duracao} maxLength={40} onChange={(ev) => set({ desenvolvimento: p.desenvolvimento.map((x) => (x.id === e.id ? { ...x, duracao: ev.target.value } : x)) })} className="field py-2" placeholder="15 min" /></label>
                <button type="button" className="self-end pb-2 text-sm font-bold text-[var(--color-danger)]" onClick={() => set({ desenvolvimento: p.desenvolvimento.filter((x) => x.id !== e.id) })}>Remover</button>
              </div>
              <textarea rows={3} value={e.descricao} maxLength={3000} aria-label={`Descrição da etapa ${i + 1}`} onChange={(ev) => set({ desenvolvimento: p.desenvolvimento.map((x) => (x.id === e.id ? { ...x, descricao: ev.target.value } : x)) })} className="field mt-3" />
            </div>
          ))}
        </div>
        {p.desenvolvimento.length < 20 && (
          <button type="button" className="mt-3 font-bold text-[var(--action)]" onClick={() => set({ desenvolvimento: [...p.desenvolvimento, { id: novoId(), titulo: "", duracao: "", descricao: "" }] })}>+ Etapa</button>
        )}
      </fieldset>

      <Area titulo="7. Estratégias de mediação" valor={p.mediacao} onChange={(v) => set({ mediacao: v })} />
      <Area titulo="8. Atividades propostas" valor={p.atividades} onChange={(v) => set({ atividades: v })} />
      <Area titulo="9. Avaliação da aprendizagem" valor={p.avaliacao} onChange={(v) => set({ avaliacao: v })} />
      <Area titulo="10. Critérios de acompanhamento" valor={p.acompanhamento} onChange={(v) => set({ acompanhamento: v })} max={2000} />
      <Area titulo="11. Possíveis intervenções pedagógicas" valor={p.intervencoes} onChange={(v) => set({ intervencoes: v })} max={2000} />
      <Area titulo="Contexto e perfil geral da turma" valor={p.contextoTurma} onChange={(v) => set({ contextoTurma: v })} max={1500} hint="Descreva a turma de forma geral. Não inclua nomes nem dados de estudantes." />
      <Area titulo="Necessidades de acessibilidade" valor={p.acessibilidade} onChange={(v) => set({ acessibilidade: v })} max={1500} hint="Descreva barreiras e apoios, sem diagnósticos ou identificação de estudantes." />
      <Area titulo="12. Referências" valor={p.referencias} onChange={(v) => set({ referencias: v })} />
    </div>
  );
}

function HabilidadesEditor({ p, set }: { p: Plano; set: (x: Partial<Plano>) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-lg font-bold">3. Habilidades da BNCC</legend>
      <p className="mb-3 max-w-2xl text-sm text-[var(--muted)]">
        Copie o código e a descrição do{" "}
        <a href="https://basenacionalcomum.mec.gov.br/" target="_blank" rel="noopener noreferrer" className="font-bold underline">documento oficial da BNCC</a>.
        Conferimos o formato do código e se ele combina com a etapa e o ano; não sugerimos nem completamos habilidades.
      </p>
      <div className="space-y-3">
        {p.habilidades.map((h, i) => {
          const check = h.codigo.trim() ? checarCodigoBncc(h.codigo) : null;
          const aviso = check && !check.ok ? check.motivo : check ? compativelComTurma(check, p.etapa || null, p.ano) : null;
          return (
            <div key={i} className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
              <div>
                <input value={h.codigo} maxLength={20} placeholder="EF67LP01" aria-label={`Código da habilidade ${i + 1}`} aria-invalid={aviso ? true : undefined}
                  onChange={(e) => set({ habilidades: p.habilidades.map((x, j) => (j === i ? { ...x, codigo: e.target.value.toUpperCase() } : x)) })}
                  className="field py-2 font-mono" />
                {check?.ok && !aviso && <span className="text-xs font-bold text-[var(--color-success)]">Formato válido</span>}
                {aviso && <span className="text-xs font-bold text-[var(--color-danger)]">{aviso}</span>}
              </div>
              <textarea rows={2} value={h.descricao} maxLength={1000} placeholder="Descrição copiada da BNCC" aria-label={`Descrição da habilidade ${i + 1}`}
                onChange={(e) => set({ habilidades: p.habilidades.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)) })} className="field" />
              <button type="button" className="self-start pt-2 text-sm font-bold text-[var(--color-danger)]" onClick={() => set({ habilidades: p.habilidades.filter((_, j) => j !== i) })}>Remover</button>
            </div>
          );
        })}
      </div>
      {p.habilidades.length < 20 && (
        <button type="button" className="mt-3 font-bold text-[var(--action)]" onClick={() => set({ habilidades: [...p.habilidades, { codigo: "", descricao: "" }] })}>+ Habilidade</button>
      )}
    </fieldset>
  );
}

/* ── Atividade ─────────────────────────────────────────────────────── */

function AtividadeForm({ a, set }: { a: Atividade; set: (x: Partial<Atividade>) => void }) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <label><span className={label}>Formato</span>
          <select value={a.formato} onChange={(e) => set({ formato: e.target.value as Atividade["formato"] })} className="field">
            <option value="questoes">Questões (fixação, interpretação, revisão…)</option>
            <option value="caca-palavras">Caça-palavras</option>
            <option value="cruzadinha">Cruzadinha</option>
          </select>
        </label>
        <label><span className={label}>Componente</span><input value={a.componente} maxLength={80} onChange={(e) => set({ componente: e.target.value })} className="field" /></label>
        <label><span className={label}>Ano ou turma</span><input value={a.ano} maxLength={40} onChange={(e) => set({ ano: e.target.value })} className="field" /></label>
      </div>
      <Area titulo="Instruções para os estudantes" valor={a.instrucoes} onChange={(v) => set({ instrucoes: v })} max={2000} rows={2} />

      {a.formato === "questoes" && <QuestoesEditor questoes={a.questoes} onChange={(q) => set({ questoes: q })} mostrarPontos={false} max={60} />}

      {a.formato === "caca-palavras" && (
        <div className="space-y-4">
          <label className="block">
            <span className={label}>Palavras (uma por linha, até 30)</span>
            <textarea rows={8} value={a.palavras.join("\n")} onChange={(e) => set({ palavras: e.target.value.split("\n").map((s) => s.slice(0, 30)).slice(0, 30) })} className="field" />
          </label>
          <div className="flex flex-wrap items-end gap-6">
            <label><span className={label}>Tamanho da grade</span>
              <select value={a.tamanhoGrade} onChange={(e) => set({ tamanhoGrade: Number(e.target.value) })} className="field w-32">
                {[8, 10, 12, 14, 16, 18, 20].map((n) => <option key={n} value={n}>{n} × {n}</option>)}
              </select>
            </label>
            <fieldset>
              <legend className={label}>Direções</legend>
              <div className="flex flex-wrap gap-4">
                {(["horizontal", "vertical", "diagonal", "reversas"] as const).map((d) => (
                  <label key={d} className="flex items-center gap-2">
                    <input type="checkbox" checked={a.direcoes.includes(d)} onChange={(e) => set({ direcoes: e.target.checked ? [...a.direcoes, d] : a.direcoes.filter((x) => x !== d) })} className="h-5 w-5 accent-[var(--action)]" />
                    {d === "reversas" ? "De trás para frente" : d[0].toUpperCase() + d.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" onClick={() => set({ semente: a.semente + 1 })} className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold">Sortear outra grade</button>
          </div>
          <p className="text-sm text-[var(--muted)]">Acentos e espaços são removidos na grade. Veja o resultado em “Pré-visualizar”.</p>
        </div>
      )}

      {a.formato === "cruzadinha" && (
        <fieldset className="space-y-3">
          <legend className="mb-1 text-lg font-bold">Respostas e pistas</legend>
          {a.pistas.map((p, i) => (
            <div key={p.id} className="grid gap-2 sm:grid-cols-[200px_1fr_auto]">
              <input value={p.resposta} maxLength={30} placeholder="Resposta" aria-label={`Resposta ${i + 1}`} onChange={(e) => set({ pistas: a.pistas.map((x) => (x.id === p.id ? { ...x, resposta: e.target.value } : x)) })} className="field py-2" />
              <input value={p.pista} maxLength={300} placeholder="Pista" aria-label={`Pista ${i + 1}`} onChange={(e) => set({ pistas: a.pistas.map((x) => (x.id === p.id ? { ...x, pista: e.target.value } : x)) })} className="field py-2" />
              <button type="button" className="text-sm font-bold text-[var(--color-danger)]" onClick={() => set({ pistas: a.pistas.filter((x) => x.id !== p.id) })}>Remover</button>
            </div>
          ))}
          {a.pistas.length < 25 && <button type="button" className="font-bold text-[var(--action)]" onClick={() => set({ pistas: [...a.pistas, { id: novoId(), resposta: "", pista: "" }] })}>+ Palavra</button>}
          <p className="text-sm text-[var(--muted)]">Cada palavra precisa cruzar com outra por uma letra em comum. As que não cruzarem são avisadas na pré-visualização.</p>
        </fieldset>
      )}
    </div>
  );
}

/* ── Avaliação ─────────────────────────────────────────────────────── */

function AvaliacaoForm({ a, set }: { a: Avaliacao; set: (x: Partial<Avaliacao>) => void }) {
  const pend = pendencias(a.questoes);
  const lay = (patch: Partial<Avaliacao["layout"]>) => set({ layout: { ...a.layout, ...patch } });
  return (
    <div className="space-y-8">
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-lg font-bold">Cabeçalho</legend>
        <label className="sm:col-span-2"><span className={label}>Escola</span><input value={a.escola} maxLength={160} onChange={(e) => set({ escola: e.target.value })} className="field" /></label>
        <label><span className={label}>Componente</span><input value={a.componente} maxLength={80} onChange={(e) => set({ componente: e.target.value })} className="field" /></label>
        <label><span className={label}>Turma</span><input value={a.turma} maxLength={60} onChange={(e) => set({ turma: e.target.value })} className="field" /></label>
        <label><span className={label}>Professor(a)</span><input value={a.professor} maxLength={120} onChange={(e) => set({ professor: e.target.value })} className="field" /></label>
        <label><span className={label}>Período</span>
          <select value={a.periodo} onChange={(e) => set({ periodo: e.target.value as Avaliacao["periodo"] })} className="field">
            {["", "1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre", "1º trimestre", "2º trimestre", "3º trimestre", "Recuperação"].map((p) => <option key={p} value={p}>{p || "—"}</option>)}
          </select>
        </label>
        <label><span className={label}>Data</span><input value={a.data} maxLength={20} onChange={(e) => set({ data: e.target.value })} className="field" placeholder="__/__/____" /></label>
      </fieldset>

      <Area titulo="Instruções" valor={a.instrucoes} onChange={(v) => set({ instrucoes: v })} rows={3} hint="Ex.: Leia com atenção. Use caneta azul ou preta. Não é permitido o uso de calculadora." />

      <section>
        <h2 className="mb-3 text-lg font-bold">Questões</h2>
        <QuestoesEditor questoes={a.questoes} onChange={(q) => set({ questoes: q })} mostrarPontos max={80} />
        {pend.length > 0 && (
          <div role="note" className="mt-4 rounded-[var(--radius-control)] border border-dashed border-[#d08a00] p-4 text-sm">
            <strong>Antes de imprimir:</strong>
            <ul className="mt-1 list-disc pl-5">{pend.slice(0, 8).map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
      </section>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <legend className="mb-2 text-lg font-bold">Versões e aparência</legend>
        <label><span className={label}>Versões equivalentes</span>
          <select value={a.versoes} onChange={(e) => set({ versoes: Number(e.target.value) })} className="field">
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? "Só versão A" : `A até ${LETRAS[n - 1]}`}</option>)}
          </select>
        </label>
        <label><span className={label}>Fonte</span>
          <select value={a.layout.fonte} onChange={(e) => lay({ fonte: e.target.value as Avaliacao["layout"]["fonte"] })} className="field">
            <option value="sans">Sem serifa</option><option value="serif">Com serifa</option><option value="legivel">Alta legibilidade</option>
          </select>
        </label>
        <label><span className={label}>Tamanho</span>
          <select value={a.layout.tamanho} onChange={(e) => lay({ tamanho: e.target.value as Avaliacao["layout"]["tamanho"] })} className="field">
            {["12", "14", "16", "18"].map((t) => <option key={t} value={t}>{t} pt{t === "16" || t === "18" ? " (ampliada)" : ""}</option>)}
          </select>
        </label>
        <label><span className={label}>Espaçamento</span>
          <select value={a.layout.espacamento} onChange={(e) => lay({ espacamento: e.target.value as Avaliacao["layout"]["espacamento"] })} className="field">
            <option value="compacto">Compacto</option><option value="normal">Normal</option><option value="amplo">Amplo</option>
          </select>
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={a.embaralharAlternativas} onChange={(e) => set({ embaralharAlternativas: e.target.checked })} className="h-5 w-5 accent-[var(--action)]" />
          Embaralhar alternativas nas versões B, C e D
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={a.layout.economica} onChange={(e) => lay({ economica: e.target.checked })} className="h-5 w-5 accent-[var(--action)]" />
          Versão econômica em tinta
        </label>
      </fieldset>
    </div>
  );
}
