import { SITUACOES, type Situacao } from "@/lib/concursos";

const TONES = {
  open: "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)] dark:text-[#5fe0b4]",
  soon: "bg-[color-mix(in_srgb,var(--color-violet)_14%,transparent)] text-[var(--color-violet)] dark:text-[#b4a3ff]",
  neutral: "bg-[color-mix(in_srgb,var(--muted)_14%,transparent)] text-[var(--text)]",
  warn: "bg-[color-mix(in_srgb,#d08a00_16%,transparent)] text-[#8a5a00] dark:text-[#f0c060]",
  closed: "bg-[color-mix(in_srgb,var(--muted)_10%,transparent)] text-[var(--muted)]",
};

export function SituacaoBadge({ situacao }: { situacao: Situacao }) {
  const s = SITUACOES[situacao];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold ${TONES[s.tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {s.label}
    </span>
  );
}
