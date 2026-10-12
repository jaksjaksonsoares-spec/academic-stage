"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-2.5 font-bold text-[var(--action-text)]">
      Imprimir ou salvar PDF
    </button>
  );
}
