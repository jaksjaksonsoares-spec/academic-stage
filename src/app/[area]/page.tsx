import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AREAS, PHASE_LABEL, getArea } from "@/lib/areas";
import { Icon } from "@/components/icon";

export const dynamicParams = false;

// Áreas disponíveis têm página própria; esta rota atende só as em construção.
export function generateStaticParams() {
  return AREAS.filter((a) => a.status === "em-construcao").map((a) => ({ area: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const area = getArea((await params).area);
  if (!area) return {};
  return {
    title: area.title,
    description: area.description,
    alternates: { canonical: `/${area.slug}` },
    // Páginas em construção não devem ser indexadas como conteúdo.
    robots: area.status === "disponivel" ? undefined : { index: false, follow: true },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const area = getArea((await params).area);
  if (!area || area.status === "disponivel") notFound();

  const related = AREAS.filter((a) => a.group === area.group && a.slug !== area.slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <nav aria-label="Trilha" className="text-sm text-[var(--muted)]">
        <Link href="/" className="hover:underline">Início</Link> / <span>{area.group}</span>
      </nav>

      <div className="mt-8 flex items-start gap-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-ink)] text-[var(--color-spot)]">
          <Icon name={area.icon} className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">{area.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-[var(--muted)]">{area.description}</p>
        </div>
      </div>

      <section
        aria-labelledby="status-titulo"
        className="mt-12 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"
      >
        <div className="flex items-center gap-3">
          <Icon name="info" className="h-6 w-6 text-[var(--action)]" />
          <h2 id="status-titulo" className="text-xl font-bold">
            Em construção — {PHASE_LABEL[area.phase]}
          </h2>
        </div>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Esta ferramenta ainda não está disponível. Preferimos mostrar isso com clareza a exibir botões que não funcionam.
          Crie sua conta e marque esta área como interesse no seu perfil: ela aparecerá em destaque no seu painel quando entrar no ar.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cadastro" className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] hover:brightness-110">
            Criar conta gratuita
          </Link>
          <Link href="/#roteiro" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-5 py-3 font-bold hover:border-[var(--muted)]">
            Ver o roteiro completo
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="rel-titulo" className="mt-12">
          <h2 id="rel-titulo" className="text-xl font-bold">Também em {area.group}</h2>
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {related.map((a) => (
              <li key={a.slug}>
                <Link href={`/${a.slug}`} className="flex items-center gap-3 py-4 hover:underline">
                  <Icon name={a.icon} className="h-5 w-5 text-[var(--action)]" />
                  <span className="flex-1 font-bold">{a.title}</span>
                  <span className="text-sm text-[var(--muted)]">Fase {a.phase}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
