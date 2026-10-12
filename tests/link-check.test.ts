import { describe, expect, it } from "vitest";
import { checkLink, proximoEstado, FALHAS_PARA_OCULTAR } from "@/lib/link-check";

const fakeFetch = (statusFor: Record<string, number | "throw">) =>
  (async (_url: string, init?: RequestInit) => {
    const s = statusFor[init?.method ?? "GET"];
    if (s === "throw" || s === undefined) throw new Error("rede");
    return new Response(null, { status: s });
  }) as unknown as typeof fetch;

describe("checkLink", () => {
  it("aceita 200 no HEAD", async () => {
    expect(await checkLink("https://x", fakeFetch({ HEAD: 200 }))).toEqual({ status: 200, ok: true });
  });

  it("tenta GET quando HEAD não é permitido", async () => {
    expect(await checkLink("https://x", fakeFetch({ HEAD: 405, GET: 200 }))).toEqual({ status: 200, ok: true });
  });

  it("considera 403 como no ar (site restringe robôs)", async () => {
    expect((await checkLink("https://x", fakeFetch({ HEAD: 403 }))).ok).toBe(true);
  });

  it("marca 404 e falha de rede como fora do ar", async () => {
    expect((await checkLink("https://x", fakeFetch({ HEAD: 404 }))).ok).toBe(false);
    expect(await checkLink("https://x", fakeFetch({ HEAD: "throw", GET: "throw" }))).toEqual({ status: null, ok: false });
  });
});

describe("proximoEstado", () => {
  it("só oculta depois de falhas seguidas e zera ao voltar", () => {
    let s: { falhas_consecutivas: number; ativo: boolean; ultimo_status?: number | null } = { falhas_consecutivas: 0, ativo: true };
    for (let i = 1; i < FALHAS_PARA_OCULTAR; i++) {
      s = { ...s, ...proximoEstado(s, { status: 500, ok: false }) };
      expect(s.ativo).toBe(true);
    }
    s = { ...s, ...proximoEstado(s, { status: 500, ok: false }) };
    expect(s.ativo).toBe(false);
    s = { ...s, ...proximoEstado(s, { status: 200, ok: true }) };
    expect(s.falhas_consecutivas).toBe(0);
    expect(s.ativo).toBe(true);
  });
});
