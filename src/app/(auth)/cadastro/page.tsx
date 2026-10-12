import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Criar conta", alternates: { canonical: "/cadastro" } };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-[2.25rem] font-extrabold">Criar conta</h1>
      <p className="mt-2 mb-8 text-[var(--muted)]">
        Só pedimos o essencial. Etapa de ensino, região e interesses você completa depois, se quiser.
      </p>
      <SignUpForm />
      <p className="mt-8 text-center text-[var(--muted)]">
        Já tem conta? <Link href="/entrar" className="font-bold text-[var(--action)] underline-offset-4 hover:underline">Entrar</Link>
      </p>
    </>
  );
}
