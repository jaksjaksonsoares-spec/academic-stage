import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { MfaCadastro, MfaCodigo } from "./mfa-forms";

export const metadata: Metadata = { title: "Verificação em dois fatores", robots: { index: false } };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeRedirectPath(sp.next, "/admin");
  const { supabase } = await requireUser(`/admin/mfa?next=${encodeURIComponent(next)}`);
  const { data: papel } = await supabase.rpc("tem_papel_administrativo");
  if (papel !== true) notFound();

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect(next);

  const { data: fatores } = await supabase.auth.mfa.listFactors();
  const verificado = (fatores?.totp ?? []).find((f) => f.status === "verified");

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="text-[2.25rem] font-extrabold">Verificação em dois fatores</h1>
      <p className="mt-2 mb-8 text-[var(--muted)]">
        Funções administrativas exigem um código do aplicativo autenticador (Google Authenticator, Microsoft Authenticator, 1Password, Authy…), além da senha.
      </p>
      {verificado ? <MfaCodigo factorId={verificado.id} next={next} /> : <MfaCadastro next={next} />}
    </div>
  );
}
