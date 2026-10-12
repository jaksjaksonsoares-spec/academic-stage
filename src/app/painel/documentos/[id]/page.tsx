import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { lerConteudo, type TipoDocumento } from "@/lib/documentos";
import { DocumentoEditor } from "./editor";

export const metadata: Metadata = { title: "Editar documento", robots: { index: false } };

export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase } = await requireUser(`/painel/documentos/${id}`);

  const [{ data: doc }, { data: turmas }] = await Promise.all([
    supabase.from("documentos").select("id,tipo,titulo,turma_id,conteudo,updated_at").eq("id", id).maybeSingle(),
    supabase.from("turmas").select("id,nome").order("nome"),
  ]);
  if (!doc) notFound();

  const tipo = doc.tipo as TipoDocumento;
  return (
    <DocumentoEditor
      doc={{ id: doc.id, tipo, titulo: doc.titulo, turma_id: doc.turma_id, updated_at: doc.updated_at }}
      conteudoInicial={lerConteudo(tipo, doc.conteudo)}
      turmas={turmas ?? []}
    />
  );
}
