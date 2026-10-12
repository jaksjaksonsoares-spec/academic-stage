import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { documentoParaDocx, nomeArquivo } from "@/lib/docx-export";
import { conteudoInicial, novaQuestao, type Avaliacao, type Atividade, type Plano } from "@/lib/documentos";

async function textoDo(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")!.async("string");
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

describe("exportação para Word", () => {
  it("gera plano com seções e habilidades", async () => {
    const c: Plano = { ...conteudoInicial("plano"), tema: "Frações no cotidiano", objetivos: "Comparar frações", habilidades: [{ codigo: "ef06ma07", descricao: "Descrição copiada" }] };
    const buf = await documentoParaDocx({ tipo: "plano", titulo: "Plano de teste", conteudo: c, docId: "d1", versao: 0 });
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const t = await textoDo(buf);
    expect(t).toContain("Frações no cotidiano");
    expect(t).toContain("(EF06MA07) Descrição copiada");
  });

  it("gera avaliação com gabarito e versão", async () => {
    const q = novaQuestao("multipla");
    if (q.tipo !== "multipla") throw new Error();
    const alternativas = q.alternativas.map((a, i) => ({ ...a, texto: `Opção ${i}` }));
    const c: Avaliacao = { ...conteudoInicial("avaliacao"), escola: "Escola Estadual Teste", versoes: 2, questoes: [{ ...q, enunciado: "Quanto é 2+2?", alternativas, correta: alternativas[1].id }] };
    const t = await textoDo(await documentoParaDocx({ tipo: "avaliacao", titulo: "Prova 1", conteudo: c, docId: "d2", versao: 1 }));
    expect(t).toContain("Escola Estadual Teste");
    expect(t).toContain("versão B");
    expect(t).toContain("Quanto é 2+2?");
    expect(t).toContain("Gabarito");
  });

  it("gera caça-palavras e cruzadinha", async () => {
    const cp: Atividade = { ...conteudoInicial("atividade"), formato: "caca-palavras", palavras: ["Sol", "Lua", "Terra"] };
    expect(await textoDo(await documentoParaDocx({ tipo: "atividade", titulo: "Astros", conteudo: cp, docId: "d3", versao: 0 }))).toContain("Palavras:");
    const cz: Atividade = { ...conteudoInicial("atividade"), formato: "cruzadinha", pistas: [{ id: "1", resposta: "brasil", pista: "País" }, { id: "2", resposta: "bahia", pista: "Estado" }] };
    expect(await textoDo(await documentoParaDocx({ tipo: "atividade", titulo: "Geo", conteudo: cz, docId: "d4", versao: 0 }))).toContain("Horizontais");
  });

  it("gera nomes de arquivo seguros", () => {
    expect(nomeArquivo("Prova: Frações / 6º ano", 1, true)).toBe("Prova-Fracoes-6-ano-versao-B.docx");
  });
});
