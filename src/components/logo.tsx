import Link from "next/link";

/** Marca: um palco visto de cima — o arco do refletor sobre a plataforma. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0a1a3f" />
      <path d="M7 22h18" stroke="#19d3c5" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 22l6-13 6 13" fill="rgb(25 211 197 / 0.22)" />
      <circle cx="16" cy="8.5" r="2.2" fill="#19d3c5" />
    </svg>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="AcademiC Stage — página inicial">
      <LogoMark />
      <span
        className={`font-[family-name:var(--font-display)] text-[1.15rem] font-bold tracking-tight ${
          inverted ? "text-white" : "text-[var(--text)]"
        }`}
      >
        AcademiC Stage
      </span>
    </Link>
  );
}
