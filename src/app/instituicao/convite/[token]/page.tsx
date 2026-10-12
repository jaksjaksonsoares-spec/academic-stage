import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { aceitarConvite } from "../../actions";

export const metadata: Metadata = { title: "Convite", robots: { index: false, follow: false } };

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) notFound();
  await requireUser(`/instituicao/convite/${token}`);
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-[2.25rem] font-extrabold">Convite para organização</h1>
      <p className="mt-3 text-[var(--muted)]">
        Ao entrar, os membros da organização verão seu nome de exibição, e a gestão verá também seu e-mail. Você terá acesso à biblioteca interna e poderá sair quando quiser.
      </p>
      <form action={aceitarConvite} className="mt-8">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-6 py-3 font-bold text-[var(--action-text)]">Entrar na organização</button>
      </form>
    </div>
  );
}
