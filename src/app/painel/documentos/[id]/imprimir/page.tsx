import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { LETRAS, lerConteudo, type Atividade, type Avaliacao, type Plano, type TipoDocumento, gerarVersao } from "@/lib/documentos";
import { AtividadeView, AvaliacaoView, GabaritoView, PlanoView } from "@/components/documento-render";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Imprimir", robots: { index: false } };

export default async function ImprimirPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ versao?: string; gabarito?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const { supabase } = await requireUser(`/painel/documentos/${id}`);
  const { data: doc } = await supabase.from("documentos").select("id,tipo,titulo,conteudo").eq("id", id).maybeSingle();
  if (!doc) notFound();

  const tipo = doc.tipo as TipoDocumento;
  const comGabarito = sp.gabarito !== "0";
  const versaoMax = tipo === "avaliacao" ? lerConteudo("avaliacao", doc.conteudo).versoes - 1 : 3;
  const versao = Math.min(Math.max(0, Number.parseInt(sp.versao ?? "0", 10) || 0), versaoMax);

  return (
    <div className="print-wrap mx-auto max-w-[210mm] space-y-8">
      <div className="no-print flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--line)] p-4">
        <Link href={`/painel/documentos/${doc.id}`} className="text-sm text-[var(--muted)] hover:underline">Voltar ao editor</Link>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {tipo !== "plano" && (
            <Link href={`?versao=${versao}&gabarito=${comGabarito ? 0 : 1}`} className="text-sm font-bold text-[var(--action)] underline">
              {comGabarito ? "Imprimir sem gabarito" : "Incluir gabarito"}
            </Link>
          )}
          <PrintButton />
        </div>
        <p className="w-full text-sm text-[var(--muted)]">Para gerar o PDF, escolha “Salvar como PDF” como destino da impressão.</p>
      </div>

      {tipo === "plano" && <PlanoView titulo={doc.titulo} p={lerConteudo("plano", doc.conteudo) as Plano} />}
      {tipo === "atividade" && <AtividadeView titulo={doc.titulo} a={lerConteudo("atividade", doc.conteudo) as Atividade} docId={doc.id} versao={versao} comGabarito={comGabarito} />}
      {tipo === "avaliacao" && (() => {
        const a = lerConteudo("avaliacao", doc.conteudo) as Avaliacao;
        return (
          <>
            <AvaliacaoView titulo={doc.titulo} a={a} docId={doc.id} versao={versao} />
            {comGabarito && (
              <div className="doc-quebra">
                <GabaritoView
                  questoes={gerarVersao(a.questoes, doc.id, versao, a.embaralharAlternativas)}
                  salt={`${doc.id}:${versao}`}
                  titulo={`Gabarito — ${doc.titulo}${a.versoes > 1 ? ` (versão ${LETRAS[versao]})` : ""}`}
                />
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
