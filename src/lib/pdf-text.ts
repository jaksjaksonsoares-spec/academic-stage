/**
 * Extrai o texto de cada página de um PDF (pdf.js, sem executar scripts do
 * documento). Retorna uma string por página, preservando quebras de linha.
 */
export const MAX_PAGINAS_PDF = 400;

export class PdfInvalidoError extends Error {}

export function pareceUmPdf(bytes: Uint8Array): boolean {
  // Assinatura "%PDF-" nos primeiros bytes.
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

export async function extrairTextoPorPagina(bytes: Uint8Array): Promise<string[]> {
  if (!pareceUmPdf(bytes)) throw new PdfInvalidoError("O arquivo não é um PDF.");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(bytes), // pdf.js transfere o buffer; trabalha numa cópia
    disableFontFace: true,
    useSystemFonts: false,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    await task.destroy().catch(() => undefined);
    const msg = e instanceof Error && /password/i.test(e.message) ? "O PDF está protegido por senha." : "Não foi possível ler o PDF.";
    throw new PdfInvalidoError(msg);
  }
  const total = Math.min(doc.numPages, MAX_PAGINAS_PDF);
  const paginas: string[] = [];
  for (let n = 1; n <= total; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    let txt = "";
    for (const item of content.items) {
      if ("str" in item) txt += item.str + (item.hasEOL ? "\n" : "");
    }
    paginas.push(txt);
    page.cleanup();
  }
  await task.destroy();
  return paginas;
}
