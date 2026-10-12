import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { PlanoEstudoForm } from "../plano-form";

export const metadata: Metadata = { title: "Novo plano de estudos", robots: { index: false } };

export default async function NovoPlanoPage() {
  await requireUser("/estudos/novo");
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/estudos" className="text-sm text-[var(--muted)] hover:underline">Preparação para concursos</Link>
      <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Novo plano de estudos</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Tem o edital? <Link href="/editais" className="font-bold text-[var(--action)] underline">Analise-o primeiro</Link> e os conteúdos já vêm preenchidos.
      </p>
      <PlanoEstudoForm />
    </div>
  );
}
