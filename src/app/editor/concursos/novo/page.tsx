import type { Metadata } from "next";
import Link from "next/link";
import { requireEditor } from "@/lib/session";
import { ConcursoForm } from "../form";

export const metadata: Metadata = { title: "Novo concurso", robots: { index: false } };

export default async function NovoConcursoPage() {
  await requireEditor("/editor/concursos/novo");
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/editor/concursos" className="text-sm text-[var(--muted)] hover:underline">Voltar para a lista</Link>
      <h1 className="mt-4 text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Novo concurso</h1>
      <p className="mt-2 mb-8 max-w-2xl text-[var(--muted)]">
        Preencha só o que estiver no edital ou na fonte oficial. Campo sem informação fica em branco e aparece como “Não informado”.
      </p>
      <ConcursoForm />
    </div>
  );
}
