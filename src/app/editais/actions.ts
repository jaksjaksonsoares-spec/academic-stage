"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { extrairTextoPorPagina, PdfInvalidoError } from "@/lib/pdf-text";
import { analisarPorPalavrasChave, type ResultadoEdital } from "@/lib/edital-analise";
import { analisarEditalComIA, iaConfigurada, IAError } from "@/lib/ia";
import { consultarCota, registrarUso } from "@/lib/limites";
import { baixarUrl, lerHtml, UrlRecusadaError } from "@/lib/url-segura";

export type AnaliseState = { status: "idle" | "error"; message?: string; pdfs?: { href: string; texto: string }[] };

const MAX_BYTES = 30 * 1024 * 1024;
const MAX_BYTES_IA = 20 * 1024 * 1024;
const MAX_PAGINAS_IA = 100;

type Supa = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function analisarBytes(supabase: Supa, userId: string, bytes: Uint8Array, titulo: string, querIA: boolean) {
  const paginas = await extrairTextoPorPagina(bytes);
  const resultado: ResultadoEdital = analisarPorPalavrasChave(paginas);
  let metodo: ResultadoEdital["metodo"] = "palavras-chave";

  if (querIA) {
    if (!iaConfigurada()) {
      resultado.avisos.unshift("A análise com IA ainda não está ativada nesta plataforma. Foi feita a leitura por palavras-chave.");
    } else if (bytes.byteLength > MAX_BYTES_IA || paginas.length > MAX_PAGINAS_IA) {
      resultado.avisos.unshift(`Para a análise com IA o PDF precisa ter até ${MAX_PAGINAS_IA} páginas e 20 MB. Foi feita a leitura por palavras-chave.`);
    } else {
      const cota = await consultarCota(supabase, userId, "edital");
      if (cota.restantes <= 0) {
        resultado.avisos.unshift(`Você usou as ${cota.limite} análises com IA de hoje. Foi feita a leitura por palavras-chave; amanhã a cota renova.`);
      } else {
        try {
          await registrarUso(supabase, "edital");
          const ia = await analisarEditalComIA(Buffer.from(bytes).toString("base64"), titulo);
          resultado.resumoIA = ia.secoes;
          resultado.metodo = metodo = "ia";
          if (ia.truncada) resultado.avisos.unshift("A resposta da IA ficou incompleta por ser longa. Confira as últimas seções no edital.");
          if (ia.secoes.length === 0) resultado.avisos.unshift("A IA não devolveu as seções esperadas. Use a leitura por palavras-chave abaixo.");
        } catch (e) {
          resultado.avisos.unshift(e instanceof IAError ? `${e.message} Foi feita a leitura por palavras-chave.` : "A análise com IA falhou. Foi feita a leitura por palavras-chave.");
        }
      }
    }
  }
  return { resultado, metodo, paginas: paginas.length };
}

async function salvar(supabase: Supa, dados: { titulo: string; origem: "pdf" | "url"; origem_url: string | null; paginas: number | null; metodo: string; resultado: ResultadoEdital }) {
  const { data, error } = await supabase.from("editais_analises").insert(dados).select("id").single();
  if (error || !data) return null;
  revalidatePath("/editais");
  return data.id as string;
}

const tituloSchema = z.string().trim().min(1).max(200);

/** O PDF já foi enviado pelo navegador para editais/<user_id>/... ; aqui é lido, analisado e apagado. */
export async function analisarArquivo(_prev: AnaliseState, fd: FormData): Promise<AnaliseState> {
  const { supabase, user } = await requireUser("/editais");
  const caminho = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/).safeParse(fd.get("caminho"));
  const titulo = tituloSchema.safeParse(fd.get("titulo"));
  if (!caminho.success || !caminho.data.startsWith(user.id + "/")) return { status: "error", message: "Arquivo inválido. Envie o PDF de novo." };
  const querIA = fd.get("metodo") === "ia";

  let id: string | null = null;
  try {
    const { data: blob, error } = await supabase.storage.from("editais").download(caminho.data);
    if (error || !blob) return { status: "error", message: "Não foi possível ler o arquivo enviado. Tente de novo." };
    if (blob.size > MAX_BYTES) return { status: "error", message: "O PDF passa de 30 MB." };
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const r = await analisarBytes(supabase, user.id, bytes, titulo.success ? titulo.data : "Edital", querIA);
    id = await salvar(supabase, { titulo: titulo.success ? titulo.data : "Edital", origem: "pdf", origem_url: null, paginas: r.paginas, metodo: r.metodo, resultado: r.resultado });
  } catch (e) {
    return { status: "error", message: e instanceof PdfInvalidoError ? e.message : "Não foi possível analisar o PDF." };
  } finally {
    // O PDF não é guardado.
    await supabase.storage.from("editais").remove([caminho.data]);
  }
  if (!id) return { status: "error", message: "A análise foi feita, mas não foi possível salvá-la." };
  redirect(`/editais/${id}`);
}

export async function analisarUrl(_prev: AnaliseState, fd: FormData): Promise<AnaliseState> {
  const { supabase, user } = await requireUser("/editais");
  const url = z.string().trim().max(2000).safeParse(fd.get("url"));
  if (!url.success || !url.data) return { status: "error", message: "Informe o endereço." };
  const querIA = fd.get("metodo") === "ia";

  let id: string | null = null;
  try {
    const r = await baixarUrl(url.data, MAX_BYTES);
    const ehPdf = /application\/pdf/i.test(r.contentType) || new TextDecoder("latin1").decode(r.bytes.subarray(0, 8)).startsWith("%PDF-");
    if (ehPdf) {
      const titulo = decodeURIComponent(new URL(r.finalUrl).pathname.split("/").pop() || "Edital").replace(/\.pdf$/i, "").slice(0, 200) || "Edital";
      const a = await analisarBytes(supabase, user.id, r.bytes, titulo, querIA);
      id = await salvar(supabase, { titulo, origem: "url", origem_url: r.finalUrl, paginas: a.paginas, metodo: a.metodo, resultado: a.resultado });
    } else if (/text\/html/i.test(r.contentType)) {
      const html = lerHtml(new TextDecoder("utf-8").decode(r.bytes), r.finalUrl);
      // Página com links para PDFs: a pessoa escolhe qual é o edital.
      if (html.pdfs.length > 0 && fd.get("usarPagina") !== "1") {
        return { status: "idle", pdfs: html.pdfs, message: "Encontramos estes PDFs na página. Escolha o edital para analisar — ou analise o texto da própria página." };
      }
      const resultado = analisarPorPalavrasChave([html.texto]);
      resultado.avisos.unshift("Análise do texto da página (sem números de página). Para referências exatas, analise o PDF do edital.");
      id = await salvar(supabase, { titulo: (html.titulo || "Página do edital").slice(0, 200), origem: "url", origem_url: r.finalUrl, paginas: null, metodo: "palavras-chave", resultado });
    } else {
      return { status: "error", message: "O endereço não é um PDF nem uma página da web." };
    }
  } catch (e) {
    return { status: "error", message: e instanceof UrlRecusadaError || e instanceof PdfInvalidoError ? e.message : "Não foi possível analisar esse endereço." };
  }
  if (!id) return { status: "error", message: "A análise foi feita, mas não foi possível salvá-la." };
  redirect(`/editais/${id}`);
}

export async function excluirAnalise(fd: FormData) {
  const { supabase } = await requireUser("/editais");
  const id = z.string().uuid().parse(fd.get("id"));
  await supabase.from("editais_analises").delete().eq("id", id);
  revalidatePath("/editais");
  redirect("/editais");
}
