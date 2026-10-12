import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-[2.25rem] font-extrabold">Recuperar senha</h1>
      <p className="mt-2 mb-8 text-[var(--muted)]">Informe o e-mail da conta. Vamos enviar um link para você criar uma nova senha.</p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center">
        <Link href="/entrar" className="font-bold text-[var(--action)] underline-offset-4 hover:underline">Voltar para entrar</Link>
      </p>
    </>
  );
}
