import { describe, expect, it } from "vitest";
import { generateWordSearch, toGridWord } from "@/lib/wordsearch";
import { generateCrossword } from "@/lib/crossword";
import { checarCodigoBncc, compativelComTurma } from "@/lib/bncc";
import { situacaoConcurso, hojeSaoPaulo, escapeLike, slugify } from "@/lib/concursos";

describe("caça-palavras", () => {
  const palavras = ["Fotossíntese", "Clorofila", "Raiz", "Folha", "Caule", "Semente"];

  it("coloca as palavras exatamente onde diz", () => {
    const ws = generateWordSearch(palavras, { size: 12, directions: ["horizontal", "vertical", "diagonal"], seed: 7 });
    expect(ws.skipped).toEqual([]);
    for (const p of ws.placed) {
      const lido = [...p.word].map((_, i) => ws.grid[p.row + p.dr * i][p.col + p.dc * i]).join("");
      expect(lido).toBe(p.word);
    }
    expect(ws.grid.flat().every((c) => /^[A-Z]$/.test(c))).toBe(true);
  });

  it("é determinístico pela semente e muda com outra semente", () => {
    const a = generateWordSearch(palavras, { size: 12, directions: ["horizontal"], seed: 1 });
    const b = generateWordSearch(palavras, { size: 12, directions: ["horizontal"], seed: 1 });
    const c = generateWordSearch(palavras, { size: 12, directions: ["horizontal"], seed: 2 });
    expect(a.grid).toEqual(b.grid);
    expect(JSON.stringify(a.grid) === JSON.stringify(c.grid)).toBe(false);
  });

  it("avisa quando uma palavra não cabe", () => {
    const ws = generateWordSearch(["palavragrandedemais"], { size: 6, directions: ["horizontal"], seed: 1 });
    expect(ws.skipped).toEqual(["palavragrandedemais"]);
  });

  it("remove acentos e espaços", () => {
    expect(toGridWord("Ação Educativa")).toBe("ACAOEDUCATIVA");
  });
});

describe("cruzadinha", () => {
  const entradas = [
    { answer: "Brasil", clue: "País" },
    { answer: "Bahia", clue: "Estado" },
    { answer: "Salvador", clue: "Capital" },
    { answer: "Rio", clue: "Curso d'água" },
  ];

  it("cruza palavras com letras compatíveis", () => {
    const cw = generateCrossword(entradas);
    expect(cw.entries.length + cw.skipped.length).toBe(4);
    for (const e of cw.entries) {
      for (let i = 0; i < e.word.length; i++) {
        const r = e.row + (e.across ? 0 : i);
        const c = e.col + (e.across ? i : 0);
        expect(cw.cells[r][c]).toBe(e.word[i]);
      }
    }
  });

  it("numera em ordem de leitura e começa em 1", () => {
    const cw = generateCrossword(entradas);
    expect(Math.min(...cw.entries.map((e) => e.number))).toBe(1);
  });

  it("devolve palavras sem encaixe em vez de perdê-las", () => {
    const cw = generateCrossword([{ answer: "abc", clue: "x" }, { answer: "xyz", clue: "y" }]);
    expect(cw.skipped.map((s) => s.answer)).toEqual(["xyz"]);
  });
});

describe("códigos da BNCC", () => {
  it.each(["EI03EF01", "EF01LP01", "EF67LP01", "EF15AR01", "EF12EF01", "EM13MAT101", "EM13LGG101", "EM13LP01", " ef06ma01 "])("aceita o formato %j", (c) => {
    expect(checarCodigoBncc(c).ok).toBe(true);
  });

  it.each(["EF10LP01", "EF06XX01", "EI04EF01", "EI03ZZ01", "EM13BIO101", "BNCC01", ""])("rejeita %j", (c) => {
    expect(checarCodigoBncc(c).ok).toBe(false);
  });

  it("confere etapa e ano", () => {
    expect(compativelComTurma(checarCodigoBncc("EF67LP01"), "EF", 7)).toBe(null);
    expect(compativelComTurma(checarCodigoBncc("EF67LP01"), "EF", 8)).toContain("não para o 8º");
    expect(compativelComTurma(checarCodigoBncc("EM13MAT101"), "EF", 9)).toContain("Ensino Médio");
  });
});

describe("situação de concurso (espelho do SQL)", () => {
  const h = "2026-10-12";
  const v = "2026-10-10T12:00:00Z";
  it("segue as mesmas regras do banco", () => {
    expect(situacaoConcurso("previsto", null, null, null, h)).toBe("previsto");
    expect(situacaoConcurso("edital_publicado", "2026-10-01", "2026-10-30", v, h)).toBe("inscricoes_abertas");
    expect(situacaoConcurso("edital_publicado", "2026-10-20", "2026-10-30", v, h)).toBe("inscricoes_em_breve");
    expect(situacaoConcurso("edital_publicado", "2026-09-01", "2026-10-01", v, h)).toBe("inscricoes_encerradas");
    expect(situacaoConcurso("edital_publicado", "2026-10-01", "2026-10-30", "2026-09-01T00:00:00Z", h)).toBe("verificacao_pendente");
    expect(situacaoConcurso("edital_publicado", "2026-10-01", "2026-10-30", null, h)).toBe("verificacao_pendente");
  });

  it("usa a data de São Paulo", () => {
    expect(hojeSaoPaulo(new Date("2026-10-13T02:00:00Z"))).toBe("2026-10-12");
  });

  it("escapa curingas e gera slugs", () => {
    expect(escapeLike("100%_a")).toBe("100\\%\\_a");
    expect(slugify("Prefeitura de São João — Edital 01/2026")).toBe("prefeitura-de-sao-joao-edital-01-2026");
  });
});
