"use client";

import { useActionState, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { iniciarMfa, verificarMfa, type MfaInicio } from "./actions";

function CodigoForm({ factorId, next, botao }: { factorId: string; next: string; botao: string }) {
  const [state, action] = useActionState(verificarMfa, undefined);
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && <FormMessage status="error" message={state.message} />}
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block font-bold">Código de 6 números</span>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus className="field text-center font-mono text-2xl tracking-[0.4em]" />
      </label>
      <SubmitButton pendingText="Verificando…">{botao}</SubmitButton>
    </form>
  );
}

export function MfaCodigo({ factorId, next }: { factorId: string; next: string }) {
  return <CodigoForm factorId={factorId} next={next} botao="Verificar" />;
}

export function MfaCadastro({ next }: { next: string }) {
  const [inicio, setInicio] = useState<MfaInicio | null>(null);
  const [pending, start] = useTransition();

  if (!inicio || !inicio.ok) {
    return (
      <div className="space-y-4">
        {inicio && !inicio.ok && <FormMessage status="error" message={inicio.message} />}
        <p>Você ainda não cadastrou o segundo fator. Leva um minuto.</p>
        <button type="button" disabled={pending} onClick={() => start(async () => setInicio(await iniciarMfa()))} className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] disabled:opacity-60">
          {pending ? "Preparando…" : "Cadastrar aplicativo autenticador"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="list-decimal space-y-2 pl-5">
        <li>Abra o aplicativo autenticador no celular e escolha adicionar conta.</li>
        <li>Escaneie o código abaixo (ou digite a chave manualmente).</li>
        <li>Digite o código de 6 números que o aplicativo mostrar.</li>
      </ol>
      <div className="w-fit rounded-[var(--radius-card)] bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={inicio.qr} alt="Código QR para cadastrar o AcademiC Stage no aplicativo autenticador" width={200} height={200} />
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-bold">Não consigo escanear</summary>
        <p className="mt-2 text-sm">Chave: <code className="break-all font-mono">{inicio.secret}</code></p>
      </details>
      <CodigoForm factorId={inicio.factorId} next={next} botao="Ativar verificação em dois fatores" />
    </div>
  );
}
