import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/documentos";
import { CompartilharForm } from "./form";

export const metadata: Metadata = { title: "Compartilhar material", robots: { index: false } };

export default async function CompartilharPage({ searchParams }: { searchParams: Promise<{ documento?: string }> }) {
  const { supabase, user } = await requireUser("/biblioteca/compartilhar");
  const sp = await searchParams;
  const [{ data: docs }, { data: orgs }] = await Promise.all([
    supabase.from("documentos").select("id,tipo,titulo").order("updated_at", { ascending: false }).limit(300),
    supabase.from("org_membros").select("org_id, organizacoes(nome)").eq("user_id", user.id),
  ]);
  const organizacoes = ((orgs ?? []) as unknown as { org_id: string; organizacoes: { nome: string } | null }[]).map((o) => ({ id: o.org_id, nome: o.organizacoes?.nome ?? "Organização" }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/biblioteca" className="text-sm text-[var(--muted)] hover:underline">Biblioteca</Link>
      <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Compartilhar um material</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Escolha um documento seu. Uma cópia dele vai para a biblioteca com a licença que você escolher — o original continua só seu.
        Para todos: passa por revisão editorial. Para a sua organização: fica disponível na hora para os membros.
      </p>
      {(docs ?? []).length === 0 ? (
        <p className="mt-8">Você ainda não tem documentos. <Link href="/painel/documentos" className="font-bold text-[var(--action)] underline">Criar um documento</Link></p>
      ) : (
        <CompartilharForm
          documentos={(docs ?? []).map((d) => ({ id: d.id, titulo: d.titulo, tipo: d.tipo as TipoDocumento, rotulo: TIPOS_DOCUMENTO[d.tipo as TipoDocumento].label }))}
          selecionado={sp.documento}
          organizacoes={organizacoes}
        />
      )}
    </div>
  );
}
