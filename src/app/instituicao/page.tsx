import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { FormMessage } from "@/components/ui";
import { NovaOrganizacao } from "./forms";

export const metadata: Metadata = {
  title: "Escolas e redes",
  description: "Organize sua equipe: biblioteca compartilhada da escola, modelos institucionais e gestão de membros.",
  alternates: { canonical: "/instituicao" },
};

const AVISOS: Record<string, { s: "success" | "error"; m: string }> = {
  convite: { s: "error", m: "Este convite é inválido, expirou ou já atingiu o limite de usos. Peça um novo à gestão." },
  saiu: { s: "success", m: "Você saiu da organização." },
  excluida: { s: "success", m: "Organização excluída." },
};

export default async function InstituicaoPage({ searchParams }: { searchParams: Promise<{ erro?: string; saiu?: string; excluida?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  const aviso = AVISOS[sp.erro ?? (sp.saiu ? "saiu" : sp.excluida ? "excluida" : "")];
  type M = { papel: string; organizacoes: { id: string; nome: string; tipo: string; plano_ativo: boolean } | null };
  const minhas = supabase && user
    ? (((await supabase.from("org_membros").select("papel, organizacoes(id,nome,tipo,plano_ativo)").eq("user_id", user.id)).data ?? []) as unknown as M[])
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Escolas e redes</h1>
      <p className="mt-3 max-w-2xl text-lg text-[var(--muted)]">
        Reúna a equipe da escola ou da rede: materiais compartilhados só entre vocês, modelos institucionais e gestão de quem participa.
      </p>
      {aviso && <div className="mt-6"><FormMessage status={aviso.s} message={aviso.m} /></div>}

      {!user ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/cadastro" className="rounded-[var(--radius-control)] bg-[var(--action)] px-6 py-3 font-bold text-[var(--action-text)]">Criar conta gratuita</Link>
          <Link href="/entrar?next=/instituicao" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-6 py-3 font-bold">Já tenho conta</Link>
        </div>
      ) : (
        <>
          <section aria-labelledby="minhas" className="mt-10">
            <h2 id="minhas" className="text-2xl font-bold">Suas organizações</h2>
            {minhas.length === 0 ? <p className="mt-2 text-[var(--muted)]">Você ainda não participa de nenhuma. Crie uma abaixo ou peça um link de convite à gestão da sua escola.</p> : (
              <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {minhas.filter((m) => m.organizacoes).map((m) => (
                  <li key={m.organizacoes!.id}>
                    <Link href={`/instituicao/${m.organizacoes!.id}`} className="flex flex-wrap justify-between gap-2 py-4 hover:underline">
                      <span className="font-bold">{m.organizacoes!.nome}</span>
                      <span className="text-sm text-[var(--muted)]">{m.papel === "gestor" ? "Gestão" : "Membro"}{m.organizacoes!.plano_ativo ? " · plano institucional ativo" : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="nova" className="mt-12 rounded-[var(--radius-card)] border border-[var(--line)] p-6">
            <h2 id="nova" className="mb-4 text-xl font-bold">Criar organização</h2>
            <NovaOrganizacao />
            <p className="mt-4 text-sm text-[var(--muted)]">Criar é gratuito. O plano institucional (limites ampliados de IA e de documentos para todos os membros) é ativado pela equipe da plataforma — veja os <Link href="/planos" className="font-bold underline">planos</Link>.</p>
          </section>
        </>
      )}
    </div>
  );
}
