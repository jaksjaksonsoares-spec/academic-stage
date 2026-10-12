"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { toggleFavorite } from "@/app/favoritos/actions";
import { Icon } from "./icon";

export function FavoriteButton({
  itemType,
  itemId,
  initialSaved,
  signedIn,
  label = "Acompanhar",
  savedLabel = "Acompanhando",
}: {
  itemType: "concurso" | "link" | "material" | "curso";
  itemId: string;
  initialSaved: boolean;
  signedIn: boolean;
  label?: string;
  savedLabel?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pathname = usePathname();

  if (!signedIn) {
    return (
      <Link href={`/entrar?next=${encodeURIComponent(pathname)}`} className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold hover:border-[var(--muted)]">
        <Icon name="heart" className="h-4 w-4" /> Entre para {label.toLowerCase()}
      </Link>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        aria-pressed={saved}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setSaved((s) => !s); // otimista
            const r = await toggleFavorite({ itemType, itemId, path: pathname });
            if (!r.ok) {
              setSaved((s) => !s);
              setMessage(r.message ?? "Erro ao salvar.");
            } else {
              setSaved(!!r.saved);
              setMessage(null);
            }
          })
        }
        className={`inline-flex items-center gap-2 rounded-[var(--radius-control)] border-[1.5px] px-4 py-2 font-bold transition-colors disabled:opacity-70 ${
          saved ? "border-[var(--action)] bg-[color-mix(in_srgb,var(--action)_10%,transparent)] text-[var(--action)]" : "border-[var(--line)] hover:border-[var(--muted)]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.75}>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        </svg>
        {saved ? savedLabel : label}
      </button>
      {message && <span role="alert" className="text-sm text-[var(--color-danger)]">{message}</span>}
    </span>
  );
}
