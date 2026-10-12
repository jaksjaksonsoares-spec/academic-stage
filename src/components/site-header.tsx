import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { AREAS, AREA_GROUPS } from "@/lib/areas";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";
import { Icon } from "./icon";
import { signOut } from "@/app/(auth)/actions";

export async function SiteHeader() {
  const { supabase, user } = await getUser();
  const { count: naoLidas } = supabase && user
    ? await supabase.from("notificacoes").select("id", { count: "exact", head: true }).is("lida_em", null)
    : { count: 0 };
  const groups = AREA_GROUPS.map((g) => ({ group: g, items: AREAS.filter((a) => a.group === g) }));

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Áreas da plataforma" className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-1">
            {groups.map(({ group, items }) => (
              <li key={group} className="group relative">
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 font-bold text-[var(--muted)] transition-colors hover:text-[var(--text)] group-focus-within:text-[var(--text)]"
                  aria-haspopup="true"
                >
                  {group}
                </button>
                <div className="invisible absolute left-0 top-full w-80 pt-2 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <ul className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-lift)]">
                    {items.map((a) => (
                      <li key={a.slug}>
                        <Link href={`/${a.slug}`} className="flex gap-3 rounded-lg p-3 hover:bg-[var(--bg)]">
                          <Icon name={a.icon} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--action)]" />
                          <span>
                            <span className="block font-bold">{a.title}</span>
                            <span className="block text-sm text-[var(--muted)]">
                              {a.status === "disponivel" ? a.description : `Em construção — chega na fase ${a.phase}`}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/busca"
            aria-label="Buscar na plataforma"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Icon name="search" />
          </Link>
          <ThemeToggle />
          {user && (
            <Link
              href="/painel/notificacoes"
              aria-label={naoLidas ? `Notificações: ${naoLidas} não lidas` : "Notificações"}
              className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {!!naoLidas && (
                <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-[var(--color-danger)] px-1 text-[0.65rem] font-bold leading-4 text-white">
                  {naoLidas > 9 ? "9+" : naoLidas}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/painel" className="rounded-lg px-3 py-2 font-bold hover:bg-black/5 dark:hover:bg-white/10">
                Meu painel
              </Link>
              <form action={signOut}>
                <button type="submit" className="rounded-lg px-3 py-2 text-[var(--muted)] hover:text-[var(--text)]">
                  Sair
                </button>
              </form>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/entrar" className="rounded-lg px-3 py-2 font-bold hover:bg-black/5 dark:hover:bg-white/10">
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2 font-bold text-[var(--action-text)] hover:brightness-110"
              >
                Criar conta
              </Link>
            </div>
          )}

          <MobileMenu groups={groups.map((g) => ({ group: g.group, items: g.items.map(({ slug, title, icon, status, phase }) => ({ slug, title, icon, status, phase })) }))} signedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
