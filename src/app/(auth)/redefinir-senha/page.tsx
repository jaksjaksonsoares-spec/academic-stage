import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { ResetPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

export default async function ResetPasswordPage() {
  const { user } = await getUser();

  return (
    <>
      <h1 className="text-[2.25rem] font-extrabold">Criar nova senha</h1>
      {user ? (
        <>
          <p className="mt-2 mb-8 text-[var(--muted)]">Depois de salvar, as sessões abertas em outros dispositivos serão encerradas.</p>
          <ResetPasswordForm />
        </>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-[var(--muted)]">
            Para criar uma nova senha, abra o link que enviamos por e-mail. Se ele expirou, peça outro.
          </p>
          <Link href="/recuperar-senha" className="inline-block rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)]">
            Pedir novo link
          </Link>
        </div>
      )}
    </>
  );
}
