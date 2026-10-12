import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Busca de URL informada pela pessoa (editais em páginas oficiais) com
 * proteção contra SSRF: só https, porta padrão, sem IPs privados/locais,
 * limite de tamanho, tempo e redirecionamentos (cada salto é revalidado).
 */
export class UrlRecusadaError extends Error {}

export function ipPrivado(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return ipPrivado(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
}

export async function validarUrlPublica(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UrlRecusadaError("Endereço inválido.");
  }
  if (url.protocol !== "https:") throw new UrlRecusadaError("Use um endereço que comece com https://.");
  if (url.username || url.password) throw new UrlRecusadaError("Endereço com usuário e senha não é aceito.");
  if (url.port && url.port !== "443") throw new UrlRecusadaError("Porta não permitida.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new UrlRecusadaError("Endereço não permitido.");
  const ips = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw new UrlRecusadaError("Não foi possível encontrar esse endereço."); });
  if (ips.length === 0 || ips.some((r) => ipPrivado(r.address))) throw new UrlRecusadaError("Endereço não permitido.");
  return url;
}

export async function baixarUrl(raw: string, maxBytes: number, fetcher: typeof fetch = fetch): Promise<{ bytes: Uint8Array; contentType: string; finalUrl: string }> {
  let atual = await validarUrlPublica(raw);
  for (let saltos = 0; saltos < 4; saltos++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const r = await fetcher(atual.toString(), { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": "AcademiCStage/1.0 (leitura de edital a pedido do usuario)" } });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        if (!loc) throw new UrlRecusadaError("Redirecionamento inválido.");
        atual = await validarUrlPublica(new URL(loc, atual).toString());
        continue;
      }
      if (!r.ok) throw new UrlRecusadaError(`O site respondeu com erro ${r.status}.`);
      const len = Number(r.headers.get("content-length") ?? 0);
      if (len > maxBytes) throw new UrlRecusadaError("O arquivo é grande demais.");
      if (!r.body) throw new UrlRecusadaError("Resposta vazia.");
      const reader = r.body.getReader();
      const partes: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) { await reader.cancel(); throw new UrlRecusadaError("O arquivo é grande demais."); }
        partes.push(value);
      }
      const bytes = new Uint8Array(total);
      let off = 0;
      for (const p of partes) { bytes.set(p, off); off += p.byteLength; }
      return { bytes, contentType: r.headers.get("content-type") ?? "", finalUrl: atual.toString() };
    } catch (e) {
      if (e instanceof UrlRecusadaError) throw e;
      throw new UrlRecusadaError("Não foi possível baixar o endereço (tempo esgotado ou site fora do ar).");
    } finally {
      clearTimeout(t);
    }
  }
  throw new UrlRecusadaError("Redirecionamentos demais.");
}

/** Texto visível e links para PDF de uma página HTML (sem executar nada). */
export function lerHtml(html: string, base: string): { texto: string; pdfs: { href: string; texto: string }[]; titulo: string } {
  const titulo = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const pdfs: { href: string; texto: string }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const href = new URL(m[1], base);
      if (href.protocol === "https:" && /\.pdf($|\?)/i.test(href.pathname + href.search)) {
        pdfs.push({ href: href.toString(), texto: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || href.pathname.split("/").pop()! });
      }
    } catch { /* link inválido */ }
  }
  const texto = html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return { texto, pdfs: [...new Map(pdfs.map((p) => [p.href, p])).values()].slice(0, 30), titulo };
}
