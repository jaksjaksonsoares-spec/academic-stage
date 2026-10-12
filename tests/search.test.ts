import { describe, expect, it } from "vitest";
import { normalize, search } from "@/lib/search";
import { AREAS } from "@/lib/areas";

describe("busca global", () => {
  it("ignora acentos e maiúsculas", () => {
    expect(normalize("Avaliação")).toBe("avaliacao");
    expect(search("avaliacao")[0]?.href).toBe("/avaliacoes");
  });

  it("encontra por palavra-chave", () => {
    expect(search("cruzadinha").map((r) => r.href)).toContain("/atividades");
    expect(search("LGPD").map((r) => r.href)).toContain("/painel/conta");
  });

  it("tolera um erro de digitação", () => {
    expect(search("concurço").map((r) => r.href)).toContain("/concursos");
  });

  it("exige que todos os termos combinem", () => {
    expect(search("concurso xyzabc")).toEqual([]);
  });

  it("devolve vazio para consultas curtas demais", () => {
    expect(search("a")).toEqual([]);
    expect(search("   ")).toEqual([]);
  });

  it("marca áreas em construção como indisponíveis", () => {
    const r = search("concursos").find((x) => x.href === "/concursos");
    expect(r?.available).toBe(AREAS.find((a) => a.slug === "concursos")!.status === "disponivel");
  });
});

describe("mapa de áreas", () => {
  it("tem slugs únicos e válidos para URL", () => {
    const slugs = AREAS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("não usa slugs que colidem com páginas fixas", () => {
    const reserved = ["painel", "entrar", "cadastro", "busca", "suporte", "privacidade", "termos", "cookies", "api", "auth", "boas-vindas"];
    for (const a of AREAS) expect(reserved).not.toContain(a.slug);
  });
});
