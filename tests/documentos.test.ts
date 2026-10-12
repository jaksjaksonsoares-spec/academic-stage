import { describe, expect, it } from "vitest";
import {
  conteudoInicial,
  gabarito,
  gerarVersao,
  lerConteudo,
  novaQuestao,
  pendencias,
  totalPontos,
  type Questao,
} from "@/lib/documentos";

function multipla(id: string, correta: number): Questao {
  const q = novaQuestao("multipla");
  if (q.tipo !== "multipla") throw new Error();
  const alternativas = q.alternativas.map((a, i) => ({ ...a, id: `${id}-${i}`, texto: `alt ${i}` }));
  return { ...q, id, enunciado: `Q ${id}`, alternativas, correta: alternativas[correta].id, pontos: 2 };
}

describe("versões de prova", () => {
  const qs = [multipla("a", 0), multipla("b", 1), multipla("c", 2), multipla("d", 3), multipla("e", 0)];

  it("a versão A mantém a ordem original", () => {
    expect(gerarVersao(qs, "doc1", 0, true)).toEqual(qs);
  });

  it("outras versões têm as mesmas questões, em outra ordem, e são reproduzíveis", () => {
    const b1 = gerarVersao(qs, "doc1", 1, true);
    const b2 = gerarVersao(qs, "doc1", 1, true);
    expect(b1).toEqual(b2);
    expect(b1.map((q) => q.id).sort()).toEqual(qs.map((q) => q.id).sort());
  });

  it("o gabarito acompanha a alternativa correta depois de embaralhar", () => {
    const v = gerarVersao(qs, "doc1", 2, true);
    const g = gabarito(v);
    v.forEach((q, i) => {
      if (q.tipo !== "multipla") return;
      const idx = q.alternativas.findIndex((a) => a.id === q.correta);
      expect(g[i].resposta).toBe(String.fromCharCode(97 + idx) + ")");
    });
  });

  it("soma pontos", () => {
    expect(totalPontos(qs)).toBe(10);
  });
});

describe("pendências e conteúdo", () => {
  it("aponta questão sem alternativa correta", () => {
    const q = novaQuestao("multipla");
    expect(pendencias([q]).join(" ")).toContain("marque a alternativa correta");
  });

  it("cria conteúdo inicial válido para cada tipo", () => {
    expect(conteudoInicial("plano").periodicidade).toBe("aula");
    expect(conteudoInicial("atividade").formato).toBe("questoes");
    expect(conteudoInicial("avaliacao").versoes).toBe(1);
  });

  it("lê conteúdo antigo ou corrompido sem quebrar", () => {
    expect(lerConteudo("plano", { tema: "Frações" }).tema).toBe("Frações");
    expect(lerConteudo("avaliacao", "lixo").questoes).toEqual([]);
  });

  it("gabarito de V ou F e de associação", () => {
    const vf = novaQuestao("vf");
    expect(gabarito([vf])[0].resposta).toBe("V F");
    const as = novaQuestao("associacao");
    expect(gabarito([as], "A")[0].resposta).toMatch(/^1-[abc], 2-[abc], 3-[abc]$/);
  });
});
