/**
 * Verificação de disponibilidade de links. Tenta HEAD e, se o servidor não
 * aceitar, GET. Considera disponível qualquer resposta 2xx/3xx; 401/403
 * também contam como "no ar" (o site respondeu, só restringe robôs).
 */
export type CheckResult = { status: number | null; ok: boolean };

export async function checkLink(url: string, fetcher: typeof fetch = fetch, timeoutMs = 10_000): Promise<CheckResult> {
  async function attempt(method: "HEAD" | "GET"): Promise<number | null> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetcher(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "AcademiCStage-LinkCheck/1.0 (+verificacao de links oficiais)" },
      });
      return r.status;
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  let status = await attempt("HEAD");
  if (status === null || status === 405 || status === 501 || status >= 500) status = (await attempt("GET")) ?? status;
  const ok = status !== null && ((status >= 200 && status < 400) || status === 401 || status === 403);
  return { status, ok };
}

/** Desativa o link da lista pública só depois de 3 falhas seguidas (evita sumir por instabilidade). */
export const FALHAS_PARA_OCULTAR = 3;

export function proximoEstado(atual: { falhas_consecutivas: number; ativo: boolean }, r: CheckResult) {
  const falhas = r.ok ? 0 : atual.falhas_consecutivas + 1;
  return {
    falhas_consecutivas: falhas,
    ultimo_status: r.status,
    ativo: r.ok ? true : falhas < FALHAS_PARA_OCULTAR ? atual.ativo : false,
  };
}
