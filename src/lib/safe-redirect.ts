/**
 * Impede redirecionamento aberto: só aceita caminhos internos relativos.
 * Rejeita URLs absolutas, protocolos, "//host" e "/\host".
 */
export function safeRedirectPath(input: unknown, fallback = "/painel"): string {
  if (typeof input !== "string" || input.length === 0 || input.length > 512) return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//") || input.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(input)) return fallback;
  try {
    const url = new URL(input, "http://internal.invalid");
    if (url.origin !== "http://internal.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
