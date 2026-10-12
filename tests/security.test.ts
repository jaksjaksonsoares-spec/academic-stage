import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createRateLimiter } from "@/lib/rate-limit";
import { isAuthOnlyPath, isProtectedPath } from "@/lib/routes";
import { buildCsp } from "@/lib/csp";

describe("safeRedirectPath — impede redirecionamento aberto", () => {
  it("aceita caminhos internos", () => {
    expect(safeRedirectPath("/painel/perfil")).toBe("/painel/perfil");
    expect(safeRedirectPath("/busca?q=bncc")).toBe("/busca?q=bncc");
  });

  it.each([
    "https://malicioso.com",
    "//malicioso.com",
    "/\\malicioso.com",
    "javascript:alert(1)",
    "painel",
    "",
    "/\u0000x",
  ])("rejeita %j", (input) => {
    expect(safeRedirectPath(input)).toBe("/painel");
  });

  it("rejeita valores que não são texto", () => {
    expect(safeRedirectPath(undefined)).toBe("/painel");
    expect(safeRedirectPath(42, "/x")).toBe("/x");
  });
});

describe("createRateLimiter", () => {
  it("bloqueia depois do limite e libera quando a janela passa", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(true);
    const blocked = rl.check("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(1000);
    expect(rl.check("b").ok).toBe(true); // chaves independentes
    t = 1001;
    expect(rl.check("a").ok).toBe(true);
  });
});

describe("rotas protegidas", () => {
  it("protege o painel, o onboarding e a API da conta", () => {
    expect(isProtectedPath("/painel")).toBe(true);
    expect(isProtectedPath("/painel/conta")).toBe(true);
    expect(isProtectedPath("/boas-vindas")).toBe(true);
    expect(isProtectedPath("/api/conta/exportar")).toBe(true);
  });

  it("não confunde prefixos parecidos", () => {
    expect(isProtectedPath("/painelzinho")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/concursos")).toBe(false);
  });

  it("identifica páginas só para visitantes", () => {
    expect(isAuthOnlyPath("/entrar")).toBe(true);
    expect(isAuthOnlyPath("/recuperar-senha")).toBe(false);
  });
});

describe("Content-Security-Policy", () => {
  it("exige nonce para scripts e bloqueia frames e objetos em produção", () => {
    const csp = buildCsp("abc123", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("libera eval apenas em desenvolvimento", () => {
    expect(buildCsp("n", true)).toContain("'unsafe-eval'");
  });
});
