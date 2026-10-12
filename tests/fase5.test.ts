import { describe, expect, it } from "vitest";
import { atribuicao, LICENCAS, LICENCAS_AUTOR, lerFiltrosBiblioteca, termoBusca, tipoRecursoDeDocumento } from "@/lib/biblioteca";
import { AVISO_DADOS, MODELOS_INCLUSAO } from "@/lib/inclusao";
import { isProtectedPath } from "@/lib/routes";
import { AREAS } from "@/lib/areas";

describe("atribuição", () => {
  it("cita título, autoria, licença e link da licença", () => {
    const t = atribuicao({ titulo: "Frações com pizza", autor_nome: "Ana Souza", fonte_nome: null, licenca: "cc-by-4.0" });
    expect(t).toContain("“Frações com pizza”");
    expect(t).toContain("Ana Souza");
    expect(t).toContain("CC BY 4.0");
    expect(t).toContain("https://creativecommons.org/licenses/by/4.0/");
  });

  it("usa a fonte quando não há autor e avisa quando falta autoria", () => {
    expect(atribuicao({ titulo: "Lei X", autor_nome: null, fonte_nome: "Planalto", licenca: "dominio-publico" })).toContain("Planalto");
    expect(atribuicao({ titulo: "Y", autor_nome: null, fonte_nome: null, licenca: "cc0" })).toContain("autoria não informada");
  });

  it("link externo não sugere que a plataforma hospeda o conteúdo", () => {
    const t = atribuicao({ titulo: "Guia", autor_nome: null, fonte_nome: "MEC", licenca: "link-externo" });
    expect(t).toContain("site de origem");
    expect(t).not.toContain("AcademiC Stage");
  });
});

describe("licenças", () => {
  it("autor só escolhe licenças abertas hospedáveis", () => {
    for (const l of LICENCAS_AUTOR) expect(LICENCAS[l].hospedavel).toBe(true);
    expect(LICENCAS_AUTOR).not.toContain("link-externo");
    expect(LICENCAS["link-externo"].hospedavel).toBe(false);
  });
});

describe("filtros da biblioteca", () => {
  it("descarta valores inválidos em vez de quebrar", () => {
    const f = lerFiltrosBiblioteca({ tipo: "malicioso", licenca: "x", pagina: "-3", etapa: ["nada"], q: "frações" });
    expect(f.tipo).toBeUndefined();
    expect(f.licenca).toBeUndefined();
    expect(f.etapa).toBeUndefined();
    expect(f.pagina).toBe(1);
    expect(f.q).toBe("frações");
  });

  it("aceita valores válidos", () => {
    const f = lerFiltrosBiblioteca({ tipo: "plano", licenca: "cc-by-4.0", origem: "curadoria", pagina: "2" });
    expect(f).toMatchObject({ tipo: "plano", licenca: "cc-by-4.0", origem: "curadoria", pagina: 2 });
  });

  it("termo de busca remove operadores e curingas", () => {
    expect(termoBusca("a%b_c' or 1=1; --  \"x\"")).toBe("a b c or 1 1 -- x");
    expect(termoBusca("x".repeat(200))).toHaveLength(80);
  });

  it("mapeia tipo de documento para tipo de recurso", () => {
    expect(tipoRecursoDeDocumento("avaliacao")).toBe("prova");
    expect(tipoRecursoDeDocumento("plano")).toBe("plano");
  });
});

describe("inclusão", () => {
  it("modelos sobre um estudante trazem o aviso e pedem código, não nome", () => {
    const individuais = Object.values(MODELOS_INCLUSAO).filter((m) => m.corpo.includes("Código do estudante"));
    expect(individuais.length >= 2).toBe(true);
    for (const m of individuais) {
      expect(m.corpo).toContain(AVISO_DADOS);
    }
    for (const m of Object.values(MODELOS_INCLUSAO)) expect(m.corpo).not.toMatch(/nome (completo )?do estudante:/i);
  });
});

describe("rotas e áreas da fase 5", () => {
  it("rotas pessoais da biblioteca e convites exigem sessão; vitrine é pública", () => {
    expect(isProtectedPath("/biblioteca/compartilhar")).toBe(true);
    expect(isProtectedPath("/biblioteca/minhas")).toBe(true);
    expect(isProtectedPath("/instituicao/convite/abc")).toBe(true);
    expect(isProtectedPath("/biblioteca")).toBe(false);
    expect(isProtectedPath("/planos")).toBe(false);
  });

  it("todas as áreas estão disponíveis ao fim da fase 5", () => {
    expect(AREAS.filter((a) => a.status !== "disponivel")).toEqual([]);
  });
});
