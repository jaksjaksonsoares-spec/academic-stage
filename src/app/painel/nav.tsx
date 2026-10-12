"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/painel", label: "Visão geral" },
  { href: "/painel/documentos", label: "Meus documentos" },
  { href: "/painel/perfil", label: "Perfil" },
  { href: "/painel/preferencias", label: "Interesses e notificações" },
  { href: "/painel/conta", label: "Conta e privacidade" },
];

export function PainelNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do painel" className="no-print -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1 lg:sticky lg:top-24 lg:flex-col">
        {LINKS.map((l) => {
          const active = l.href === "/painel" ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-2.5 font-bold transition-colors ${
                  active
                    ? "bg-[var(--color-ink)] text-white dark:bg-[var(--color-spot)] dark:text-[var(--color-midnight)]"
                    : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--text)] dark:hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
