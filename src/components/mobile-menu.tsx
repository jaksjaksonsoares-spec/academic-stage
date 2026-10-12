"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { IconName } from "@/lib/areas";
import { Icon } from "./icon";

type Item = { slug: string; title: string; icon: IconName; status: string; phase: number };

export function MobileMenu({ groups, signedIn }: { groups: { group: string; items: Item[] }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="menu-movel"
        aria-label="Abrir menu"
        className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
      >
        <Icon name="menu" />
      </button>

      {open && (
        <div id="menu-movel" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 overflow-y-auto bg-[var(--bg)]">
          <div className="flex h-16 items-center justify-between border-b border-[var(--line)] px-4">
            <span className="font-[family-name:var(--font-display)] text-lg font-bold">Menu</span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            >
              <Icon name="close" />
            </button>
          </div>

          <nav aria-label="Áreas da plataforma" className="space-y-6 px-4 py-6">
            {groups.map(({ group, items }) => (
              <section key={group}>
                <h2 className="mb-2 text-sm font-bold text-[var(--muted)]">{group}</h2>
                <ul className="space-y-1">
                  {items.map((a) => (
                    <li key={a.slug}>
                      <Link href={`/${a.slug}`} className="flex items-center gap-3 rounded-lg px-2 py-3 text-lg active:bg-black/5">
                        <Icon name={a.icon} className="h-5 w-5 text-[var(--action)]" />
                        <span className="flex-1">{a.title}</span>
                        {a.status !== "disponivel" && <span className="text-xs text-[var(--muted)]">Fase {a.phase}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div className="grid gap-3 border-t border-[var(--line)] pt-6">
              {signedIn ? (
                <Link href="/painel" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-3 text-center font-bold text-[var(--action-text)]">
                  Meu painel
                </Link>
              ) : (
                <>
                  <Link href="/cadastro" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-3 text-center font-bold text-[var(--action-text)]">
                    Criar conta
                  </Link>
                  <Link href="/entrar" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-3 text-center font-bold">
                    Entrar
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
