"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/suporte", label: "Atendimento" },
  { href: "/admin/usuarios", label: "Usuários e papéis" },
  { href: "/admin/concursos", label: "Concursos" },
  { href: "/admin/links", label: "Links úteis" },
  { href: "/admin/erros", label: "Falhas técnicas" },
  { href: "/admin/auditoria", label: "Auditoria" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administração" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <p className="mb-2 hidden text-sm font-bold text-[var(--muted)] lg:block">Administração</p>
      <ul className="flex gap-1 lg:sticky lg:top-24 lg:flex-col">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-2.5 font-bold ${active ? "bg-[var(--color-ink)] text-white dark:bg-[var(--color-spot)] dark:text-[var(--color-midnight)]" : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--text)] dark:hover:bg-white/10"}`}
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
