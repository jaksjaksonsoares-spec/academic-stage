"use client";

import { DIFICULDADES, TIPOS_QUESTAO, novaQuestao, novoId, totalPontos, type Questao } from "@/lib/documentos";

type Props = { questoes: Questao[]; onChange: (q: Questao[]) => void; mostrarPontos: boolean; max: number };

const btn = "rounded-lg px-2.5 py-1.5 text-sm font-bold hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40";

export function QuestoesEditor({ questoes, onChange, mostrarPontos, max }: Props) {
  const update = (i: number, q: Questao) => onChange(questoes.map((x, j) => (j === i ? q : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= questoes.length) return;
    const c = [...questoes];
    [c[i], c[j]] = [c[j], c[i]];
    onChange(c);
  };

  const dist = (["facil", "media", "dificil"] as const).map((d) => [d, questoes.filter((q) => q.dificuldade === d).length] as const);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-[var(--muted)]">
        <span><strong className="text-[var(--text)]">{questoes.length}</strong> {questoes.length === 1 ? "questão" : "questões"}</span>
        {mostrarPontos && <span>Total: <strong className="text-[var(--text)]">{totalPontos(questoes).toLocaleString("pt-BR")}</strong> pontos</span>}
        <span>{dist.map(([d, n]) => `${DIFICULDADES[d]}: ${n}`).join(" · ")}</span>
      </div>

      {questoes.map((q, i) => (
        <fieldset key={q.id} className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <legend className="sr-only">Questão {i + 1}</legend>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-xl font-extrabold">{i + 1}</span>
            <span className="text-sm text-[var(--muted)]">{TIPOS_QUESTAO[q.tipo]}</span>
            <div className="ml-auto flex flex-wrap gap-1">
              <button type="button" className={btn} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir questão ${i + 1}`}>↑</button>
              <button type="button" className={btn} onClick={() => move(i, 1)} disabled={i === questoes.length - 1} aria-label={`Descer questão ${i + 1}`}>↓</button>
              <button type="button" className={btn} disabled={questoes.length >= max} onClick={() => onChange([...questoes.slice(0, i + 1), clonar(q), ...questoes.slice(i + 1)])}>Duplicar</button>
              <button type="button" className={`${btn} text-[var(--color-danger)]`} onClick={() => onChange(questoes.filter((_, j) => j !== i))}>Remover</button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-bold">Enunciado</span>
            <textarea rows={3} value={q.enunciado} maxLength={4000} onChange={(e) => update(i, { ...q, enunciado: e.target.value })} className="field" />
          </label>

          {q.tipo === "multipla" && (
            <fieldset className="mt-3 space-y-2">
              <legend className="mb-1 text-sm font-bold">Alternativas — marque a correta</legend>
              {q.alternativas.map((a, k) => (
                <div key={a.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correta-${q.id}`}
                    checked={q.correta === a.id}
                    onChange={() => update(i, { ...q, correta: a.id })}
                    aria-label={`Alternativa ${String.fromCharCode(97 + k)} é a correta`}
                    className="h-5 w-5 accent-[var(--action)]"
                  />
                  <span className="w-5 font-bold">{String.fromCharCode(97 + k)})</span>
                  <input value={a.texto} maxLength={1000} onChange={(e) => update(i, { ...q, alternativas: q.alternativas.map((x) => (x.id === a.id ? { ...x, texto: e.target.value } : x)) })} className="field py-2" aria-label={`Texto da alternativa ${String.fromCharCode(97 + k)}`} />
                  {q.alternativas.length > 2 && (
                    <button type="button" className={btn} aria-label={`Remover alternativa ${String.fromCharCode(97 + k)}`} onClick={() => update(i, { ...q, alternativas: q.alternativas.filter((x) => x.id !== a.id), correta: q.correta === a.id ? null : q.correta })}>×</button>
                  )}
                </div>
              ))}
              {q.alternativas.length < 6 && (
                <button type="button" className="text-sm font-bold text-[var(--action)]" onClick={() => update(i, { ...q, alternativas: [...q.alternativas, { id: novoId(), texto: "" }] })}>+ Alternativa</button>
              )}
            </fieldset>
          )}

          {q.tipo === "vf" && (
            <fieldset className="mt-3 space-y-2">
              <legend className="mb-1 text-sm font-bold">Afirmações</legend>
              {q.itens.map((it) => (
                <div key={it.id} className="flex items-center gap-2">
                  <select value={it.verdadeiro ? "V" : "F"} onChange={(e) => update(i, { ...q, itens: q.itens.map((x) => (x.id === it.id ? { ...x, verdadeiro: e.target.value === "V" } : x)) })} className="field w-20 py-2" aria-label="Resposta">
                    <option value="V">V</option><option value="F">F</option>
                  </select>
                  <input value={it.texto} maxLength={1000} onChange={(e) => update(i, { ...q, itens: q.itens.map((x) => (x.id === it.id ? { ...x, texto: e.target.value } : x)) })} className="field py-2" aria-label="Texto da afirmação" />
                  {q.itens.length > 1 && <button type="button" className={btn} aria-label="Remover afirmação" onClick={() => update(i, { ...q, itens: q.itens.filter((x) => x.id !== it.id) })}>×</button>}
                </div>
              ))}
              {q.itens.length < 10 && <button type="button" className="text-sm font-bold text-[var(--action)]" onClick={() => update(i, { ...q, itens: [...q.itens, { id: novoId(), texto: "", verdadeiro: true }] })}>+ Afirmação</button>}
            </fieldset>
          )}

          {q.tipo === "associacao" && (
            <fieldset className="mt-3 space-y-2">
              <legend className="mb-1 text-sm font-bold">Pares corretos (a coluna da direita é embaralhada na impressão)</legend>
              {q.pares.map((p, k) => (
                <div key={p.id} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                  <span className="w-5 font-bold">{k + 1}</span>
                  <input value={p.esquerda} maxLength={300} placeholder="Coluna A" onChange={(e) => update(i, { ...q, pares: q.pares.map((x) => (x.id === p.id ? { ...x, esquerda: e.target.value } : x)) })} className="field py-2" aria-label={`Item ${k + 1}, coluna A`} />
                  <input value={p.direita} maxLength={300} placeholder="Coluna B" onChange={(e) => update(i, { ...q, pares: q.pares.map((x) => (x.id === p.id ? { ...x, direita: e.target.value } : x)) })} className="field py-2" aria-label={`Item ${k + 1}, coluna B`} />
                  {q.pares.length > 2 ? <button type="button" className={btn} aria-label="Remover par" onClick={() => update(i, { ...q, pares: q.pares.filter((x) => x.id !== p.id) })}>×</button> : <span />}
                </div>
              ))}
              {q.pares.length < 10 && <button type="button" className="text-sm font-bold text-[var(--action)]" onClick={() => update(i, { ...q, pares: [...q.pares, { id: novoId(), esquerda: "", direita: "" }] })}>+ Par</button>}
            </fieldset>
          )}

          {q.tipo === "discursiva" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
              <label>
                <span className="mb-1 block text-sm font-bold">Linhas</span>
                <input type="number" min={1} max={40} value={q.linhas} onChange={(e) => update(i, { ...q, linhas: clamp(Number(e.target.value), 1, 40) })} className="field py-2" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-bold">Critérios de correção</span>
                <textarea rows={2} value={q.criterios} maxLength={2000} onChange={(e) => update(i, { ...q, criterios: e.target.value })} className="field" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-bold">Resposta esperada (vai só no gabarito)</span>
                <textarea rows={2} value={q.respostaEsperada} maxLength={4000} onChange={(e) => update(i, { ...q, respostaEsperada: e.target.value })} className="field" />
              </label>
            </div>
          )}

          <div className="mt-3 grid gap-3 sm:grid-cols-[120px_160px_1fr]">
            {mostrarPontos ? (
              <label>
                <span className="mb-1 block text-sm font-bold">Pontos</span>
                <input type="number" min={0} max={100} step={0.25} value={q.pontos} onChange={(e) => update(i, { ...q, pontos: clamp(Number(e.target.value), 0, 100) })} className="field py-2" />
              </label>
            ) : <span className="hidden sm:block" />}
            <label>
              <span className="mb-1 block text-sm font-bold">Dificuldade</span>
              <select value={q.dificuldade} onChange={(e) => update(i, { ...q, dificuldade: e.target.value as Questao["dificuldade"] })} className="field py-2">
                {Object.entries(DIFICULDADES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-bold">Comentário da resolução (gabarito)</span>
              <input value={q.comentario} maxLength={2000} onChange={(e) => update(i, { ...q, comentario: e.target.value })} className="field py-2" />
            </label>
          </div>
        </fieldset>
      ))}

      {questoes.length < max ? (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIPOS_QUESTAO) as Questao["tipo"][]).map((t) => (
            <button key={t} type="button" onClick={() => onChange([...questoes, novaQuestao(t)])} className="rounded-[var(--radius-control)] border-[1.5px] border-dashed border-[var(--line)] px-4 py-2 font-bold hover:border-[var(--action)] hover:text-[var(--action)]">
              + {TIPOS_QUESTAO[t]}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Limite de {max} questões atingido.</p>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

function clonar(q: Questao): Questao {
  const id = novoId();
  switch (q.tipo) {
    case "multipla": {
      const alternativas = q.alternativas.map((a) => ({ ...a, id: novoId() }));
      const idx = q.alternativas.findIndex((a) => a.id === q.correta);
      return { ...q, id, alternativas, correta: idx >= 0 ? alternativas[idx].id : null };
    }
    case "vf": return { ...q, id, itens: q.itens.map((x) => ({ ...x, id: novoId() })) };
    case "associacao": return { ...q, id, pares: q.pares.map((x) => ({ ...x, id: novoId() })) };
    case "discursiva": return { ...q, id };
  }
}
