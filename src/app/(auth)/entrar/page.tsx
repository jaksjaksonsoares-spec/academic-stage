import type { Metadata } from "next";
import Link from "next/link";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { FormMessage } from "@/components/ui";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Entrar", alternates: { canonical: "/entrar" } };

const NOTICES: Record<string, { status: "success" | "error"; message: string }> = {
  link: { status: "error", message: "O link expirou ou já foi usado. Entre com sua senha ou peça um novo link." },
  configuracao: { status: "error", message: "A autenticação ainda não foi configurada neste ambiente." },
  encerradas: { status: "success", message: "Você saiu de todos os dispositivos. Entre novamente para continuar." },
  excluida: { status: "success", message: "Sua conta e seus dados foram excluídos." },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string; sessoes?: string; conta?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ? safeRedirectPath(sp.next) : undefined;
  const notice = NOTICES[sp.erro ?? ""] ?? NOTICES[sp.sessoes ?? ""] ?? NOTICES[sp.conta ?? ""];

  return (
    <>
      <h1 className="text-[2.25rem] font-extrabold">Entrar</h1>
      <p className="mt-2 mb-8 text-[var(--muted)]">
        {next ? "Entre para continuar de onde parou." : "Bom te ver de novo."}
      </p>
      {notice && (
        <div className="mb-6">
          <FormMessage status={notice.status} message={notice.message} />
        </div>
      )}
      <SignInForm next={next} />
      <p className="mt-8 text-center text-[var(--muted)]">
        Ainda não tem conta? <Link href="/cadastro" className="font-bold text-[var(--action)] underline-offset-4 hover:underline">Criar conta</Link>
      </p>
    </>
  );
}
