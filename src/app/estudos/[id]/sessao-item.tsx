"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarSessao } from "../actions";

export type SessaoView = {
  id: number;
  topico: string;
  materia: string;
  tipo: "estudo" | "revisao" | "revisao_geral";
  minutos_planejados: number;
  concluida: boolean;
  minutos_estudados: number | null;
  dificuldade: number | null;
};

const TIPO = { estudo: "Estudo", revisao: "Revisão", revisao_geral: "Revisão geral" };
const DIF = { 1: "Fácil", 2: "Médio", 3: "Difícil" } as const;

export function SessaoItem({ s }: { s: SessaoView }) {
  const [estado, setEstado] = useState(s);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const salvar = (patch: Partial<SessaoView>) => {
    const novo = { ...estado, ...patch };
    setEstado(novo);
    setErro(false);
    start(async () => {
      const r = await atualizarSessao({ id: novo.id, concluida: novo.concluida, minutos: novo.minutos_estudados, dificuldade: novo.dificuldade });
      if (!r.ok) { setEstado(estado); setErro(true); } else router.refresh();
    });
  };

  return (
    <li className="rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={estado.concluida}
          disabled={pending}
          onChange={(e) => {
            salvar({ concluida: e.target.checked, minutos_estudados: e.target.checked ? estado.minutos_estudados ?? estado.minutos_planejados : null });
            if (e.target.checked) setAberto(true);
          }}
          aria-label={`Marcar “${estado.topico}” como concluída`}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--action)]"
        />
        <div className="min-w-0 flex-1">
          <p className={`text-[0.97rem] ${estado.concluida ? "text-[var(--muted)] line-through" : "font-bold"}`}>{estado.topico}</p>
          <p className="text-xs text-[var(--muted)]">
            {TIPO[estado.tipo]} · {estado.materia} · {estado.concluida && estado.minutos_estudados != null ? `${estado.minutos_estudados} de ${estado.minutos_planejados}` : estado.minutos_planejados} min
            {estado.dificuldade ? ` · ${DIF[estado.dificuldade as 1 | 2 | 3]}` : ""}
          </p>
          {erro && <p role="alert" className="text-xs font-bold text-[var(--color-danger)]">Não foi possível salvar. Tente de novo.</p>}
        </div>
        {estado.concluida && (
          <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className="text-xs font-bold text-[var(--action)]">
            {aberto ? "Fechar" : "Detalhes"}
          </button>
        )}
      </div>
      {aberto && estado.concluida && (
        <div className="mt-3 flex flex-wrap items-end gap-4 border-t border-[var(--line)] pt-3">
          <label className="text-sm">
            Minutos estudados
            <input type="number" min={0} max={720} defaultValue={estado.minutos_estudados ?? estado.minutos_planejados} onBlur={(e) => salvar({ minutos_estudados: Math.min(720, Math.max(0, Number(e.target.value) || 0)) })} className="field mt-1 w-28 py-1.5" />
          </label>
          <fieldset className="text-sm">
            <legend>Como foi?</legend>
            <div className="mt-1 flex gap-1">
              {([1, 2, 3] as const).map((d) => (
                <button key={d} type="button" aria-pressed={estado.dificuldade === d} onClick={() => salvar({ dificuldade: d })} className={`rounded-lg border px-2.5 py-1 ${estado.dificuldade === d ? "border-[var(--action)] font-bold text-[var(--action)]" : "border-[var(--line)]"}`}>
                  {DIF[d]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </li>
  );
}
