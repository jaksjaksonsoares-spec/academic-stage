import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export { CATEGORIAS_SUPORTE, STATUS_SUPORTE } from "./suporte-dados";

/** Protocolo legível: AS-AAAAMMDD-XXXXXX (sem 0/O/1/I para não confundir). */
export function gerarProtocolo(agora = new Date(), aleatorio: (n: number) => Buffer = randomBytes): string {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora).replace(/-/g, "");
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = aleatorio(6);
  let cod = "";
  for (const b of bytes) cod += alfabeto[b % alfabeto.length];
  return `AS-${dia}-${cod}`;
}

/* ── Anexos ───────────────────────────────────────────────────────── */

export const MAX_ANEXOS = 3;
export const MAX_TOTAL_ANEXOS = 4 * 1024 * 1024; // limite do corpo da requisição na hospedagem

export type TipoAnexo = { mime: "application/pdf" | "image/png" | "image/jpeg"; ext: "pdf" | "png" | "jpg" };

/** Tipo real pelo conteúdo (assinatura), não pela extensão nem pelo que o navegador declara. */
export function tipoPorAssinatura(b: Uint8Array): TipoAnexo | null {
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return { mime: "application/pdf", ext: "pdf" };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { mime: "image/png", ext: "png" };
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  return null;
}

/** Nome seguro para exibição e armazenamento. */
export function nomeSeguro(nome: string, ext: string): string {
  const base = nome
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "anexo"}.${ext}`;
}

/* ── Antispam ─────────────────────────────────────────────────────── */

/** Tempo mínimo entre abrir o formulário e enviar (robôs costumam enviar na hora). */
export const TEMPO_MINIMO_MS = 3000;
export const VALIDADE_TOKEN_MS = 2 * 60 * 60 * 1000;

function assinar(ts: number, segredo: string): string {
  return createHmac("sha256", segredo).update(`suporte:${ts}`).digest("base64url");
}

export function gerarTokenFormulario(segredo: string, agora = Date.now()): string {
  return `${agora}.${assinar(agora, segredo)}`;
}

export type VerificacaoToken = "ok" | "rapido" | "expirado" | "invalido";

export function verificarTokenFormulario(token: string, segredo: string, agora = Date.now()): VerificacaoToken {
  const [tsStr, sig] = token.split(".");
  const ts = Number(tsStr);
  if (!Number.isFinite(ts) || !sig) return "invalido";
  const esperado = Buffer.from(assinar(ts, segredo));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return "invalido";
  if (agora - ts < TEMPO_MINIMO_MS) return "rapido";
  if (agora - ts > VALIDADE_TOKEN_MS) return "expirado";
  return "ok";
}

/** Sinais comuns de spam em texto livre. */
export function pareceSpam(texto: string): boolean {
  const links = (texto.match(/https?:\/\//gi) ?? []).length;
  return links > 5 || /\b(viagra|casino|cassino|crypto ?airdrop|seo services|backlinks?)\b/i.test(texto);
}
