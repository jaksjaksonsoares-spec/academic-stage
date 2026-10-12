import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { lerConteudo, type Avaliacao, type TipoDocumento } from "@/lib/documentos";
import { documentoParaDocx, nomeArquivo } from "@/lib/docx-export";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Documento inválido." }, { status: 400 });

  const { supabase, user } = await getUser();
  if (!supabase || !user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  // A RLS garante que só o dono encontra o documento.
  const { data: doc } = await supabase.from("documentos").select("id,tipo,titulo,conteudo").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

  const tipo = doc.tipo as TipoDocumento;
  const conteudo = lerConteudo(tipo, doc.conteudo);
  const maxVersao = tipo === "avaliacao" ? (conteudo as Avaliacao).versoes - 1 : 3;
  const versao = Math.min(Math.max(0, Number.parseInt(req.nextUrl.searchParams.get("versao") ?? "0", 10) || 0), maxVersao);

  try {
    const buffer = await documentoParaDocx({ tipo, titulo: doc.titulo, conteudo, docId: doc.id, versao });
    const comVersao = tipo === "avaliacao" && (conteudo as Avaliacao).versoes > 1;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${nomeArquivo(doc.titulo, versao, comVersao)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[docx]", e instanceof Error ? e.message : "erro");
    return NextResponse.json({ error: "Não foi possível gerar o arquivo." }, { status: 500 });
  }
}
