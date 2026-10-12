"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initialFormState } from "@/lib/form-state";
import { FormMessage, SubmitButton } from "@/components/ui";
import { criarFlashcard, responderFlashcard } from "../actions";

export function NovoCartao() {
  const [state, action] = useActionState(criarFlashcard, initialFormState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.status === "success") ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage status={state.status} message={state.message} /></div>
      <label className="block"><span className="mb-1 block font-bold">Frente (pergunta)</span><textarea name="frente" rows={3} required maxLength={1000} className="field" /></label>
      <label className="block"><span className="mb-1 block font-bold">Verso (resposta)</span><textarea name="verso" rows={3} required maxLength={2000} className="field" /></label>
      <label className="block"><span className="mb-1 block font-bold">Matéria (opcional)</span><input name="materia" maxLength={120} className="field" /></label>
      <div className="self-end"><SubmitButton pendingText="Salvando…">Criar cartão</SubmitButton></div>
    </form>
  );
}

type Cartao = { id: number; frente: string; verso: string; materia: string };

export function Revisao({ cartoes }: { cartoes: Cartao[] }) {
  const [i, setI] = useState(0);
  const [virado, setVirado] = useState(false);
  const [placar, setPlacar] = useState({ acertos: 0, erros: 0 });
  const [erro, setErro] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const atual = cartoes[i];

  if (!atual) {
    return (
      <div role="status" className="mt-4 rounded-[var(--radius-card)] border border-[var(--line)] p-6">
        <p className="text-lg font-bold">Revisão concluída: {placar.acertos} acertos e {placar.erros} erros.</p>
        <button type="button" onClick={() => router.refresh()} className="mt-3 font-bold text-[var(--action)] underline">Atualizar lista</button>
      </div>
    );
  }

  const responder = (acertou: boolean) =>
    start(async () => {
      const r = await responderFlashcard({ id: atual.id, acertou });
      if (!r.ok) return setErro(true);
      setErro(false);
      setPlacar((p) => (acertou ? { ...p, acertos: p.acertos + 1 } : { ...p, erros: p.erros + 1 }));
      setVirado(false);
      setI((n) => n + 1);
    });

  return (
    <div className="mt-4 max-w-xl">
      <p className="text-sm text-[var(--muted)]">Cartão {i + 1} de {cartoes.length}{atual.materia ? ` · ${atual.materia}` : ""}</p>
      <button
        type="button"
        onClick={() => setVirado((v) => !v)}
        aria-label={virado ? "Mostrar a pergunta" : "Mostrar a resposta"}
        className="mt-2 block min-h-48 w-full rounded-[var(--radius-card)] bg-[var(--color-ink)] p-6 text-left text-white shadow-[var(--shadow-float)]"
      >
        <span className="block text-sm text-[var(--color-spot)]">{virado ? "Resposta" : "Pergunta"}</span>
        <span className="mt-2 block whitespace-pre-line text-xl">{virado ? atual.verso : atual.frente}</span>
        {!virado && <span className="mt-6 block text-sm text-[#a3afcc]">Toque para ver a resposta</span>}
      </button>
      {erro && <p role="alert" className="mt-2 font-bold text-[var(--color-danger)]">Não foi possível salvar a resposta. Tente de novo.</p>}
      {virado && (
        <div className="mt-4 flex gap-3">
          <button type="button" disabled={pending} onClick={() => responder(false)} className="flex-1 rounded-[var(--radius-control)] border-[1.5px] border-[var(--color-danger)] px-4 py-3 font-bold text-[var(--color-danger)] disabled:opacity-60">Errei</button>
          <button type="button" disabled={pending} onClick={() => responder(true)} className="flex-1 rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-3 font-bold text-[var(--action-text)] disabled:opacity-60">Acertei</button>
        </div>
      )}
    </div>
  );
}
