"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Algo deu errado ao carregar esta página</h1>
      <p className="mt-3 text-[var(--muted)]">Pode ser uma falha temporária de conexão. Tente de novo; se continuar, volte mais tarde.</p>
      <button type="button" onClick={reset} className="mt-8 rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)]">
        Tentar novamente
      </button>
    </div>
  );
}
