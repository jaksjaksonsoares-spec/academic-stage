/**
 * Limitador de requisições em memória (janela deslizante simples).
 *
 * Limitação conhecida: em hospedagem serverless cada instância tem sua própria
 * memória, então o limite é por instância. O Supabase Auth aplica seus próprios
 * limites no servidor de autenticação. Para um limite global, troque esta
 * implementação por um armazenamento compartilhado (ex.: Upstash Redis) — a
 * interface `RateLimiter` foi mantida pequena para isso.
 */
export type RateLimitResult = { ok: boolean; remaining: number; retryAfterMs: number };

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  const hits = new Map<string, number[]>();
  const now = opts.now ?? Date.now;

  return {
    check(key: string): RateLimitResult {
      const t = now();
      const windowStart = t - opts.windowMs;
      const recent = (hits.get(key) ?? []).filter((ts) => ts > windowStart);

      if (recent.length >= opts.limit) {
        hits.set(key, recent);
        return { ok: false, remaining: 0, retryAfterMs: recent[0] + opts.windowMs - t };
      }
      recent.push(t);
      hits.set(key, recent);

      // Limpeza ocasional para não crescer sem limite.
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.every((ts) => ts <= windowStart)) hits.delete(k);
      }
      return { ok: true, remaining: opts.limit - recent.length, retryAfterMs: 0 };
    },
  };
}

/** 5 tentativas de autenticação por chave a cada 10 minutos. */
export const authLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });
