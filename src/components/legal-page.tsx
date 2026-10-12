import { Icon } from "./icon";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-extrabold">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Versão {updated}</p>
      <div role="note" className="mt-6 flex gap-3 rounded-[var(--radius-control)] border border-dashed border-[var(--line)] p-4 text-sm">
        <Icon name="info" className="h-5 w-5 shrink-0 text-[var(--action)]" />
        <p>
          Versão inicial, pendente de revisão jurídica. Os trechos entre colchetes precisam ser preenchidos pelo responsável pela
          plataforma antes da publicação.
        </p>
      </div>
      <div className="prose-legal mt-8">{children}</div>
    </article>
  );
}
