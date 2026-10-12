import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extrairTextoPorPagina, pareceUmPdf, PdfInvalidoError } from "@/lib/pdf-text";
import { analisarPorPalavrasChave, extrairConteudos, extrairDatas } from "@/lib/edital-analise";
import { gerarCronograma, intercalar, responderCartao, resumoPorMateria, minutosNaSemana, addDias, diaDaSemana } from "@/lib/estudos";
import { detectarDadosPessoais } from "@/lib/dados-pessoais";
import { gerarIcs } from "@/lib/ics";

async function editalDeTeste(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const paginas = [
    ["EDITAL DE CONCURSO PÚBLICO Nº 01/2026", "1. DAS INSCRIÇÕES", "As inscrições serão realizadas de 01/11/2026 a 30/11/2026.", "2. DA ISENÇÃO DA TAXA DE INSCRIÇÃO", "O pedido de isenção deverá ser feito até 05/11/2026."],
    ["3. DOS REQUISITOS PARA INVESTIDURA", "Licenciatura plena em Letras - Inglês.", "4. DA PROVA", "A prova objetiva será aplicada em 13 de dezembro de 2026.", "5. DOS CRITÉRIOS DE DESEMPATE", "Maior idade.", "6. DOS RECURSOS", "Prazo de 2 dias úteis."],
    ["ANEXO II - CONTEÚDO PROGRAMÁTICO", "LÍNGUA PORTUGUESA: Interpretação de texto; Ortografia; Concordância verbal e nominal.", "CONHECIMENTOS PEDAGÓGICOS: LDB (Lei 9.394/96); BNCC; Avaliação da aprendizagem.", "ANEXO III - MODELO DE REQUERIMENTO", "Nome do candidato:"],
  ];
  for (const linhas of paginas) {
    const p = pdf.addPage([595, 842]);
    linhas.forEach((l, i) => p.drawText(l, { x: 40, y: 800 - i * 24, size: 11, font }));
  }
  return pdf.save();
}

describe("leitura de PDF", () => {
  it("extrai o texto de cada página", async () => {
    const paginas = await extrairTextoPorPagina(await editalDeTeste());
    expect(paginas).toHaveLength(3);
    expect(paginas[2]).toContain("CONTEÚDO PROGRAMÁTICO");
  });

  it("recusa arquivo que não é PDF", async () => {
    expect(pareceUmPdf(new TextEncoder().encode("<html>"))).toBe(false);
    await expect(extrairTextoPorPagina(new TextEncoder().encode("não sou pdf"))).rejects.toBeInstanceOf(PdfInvalidoError);
  });
});

describe("análise por palavras-chave", () => {
  it("encontra seções com a página de origem", async () => {
    const r = analisarPorPalavrasChave(await extrairTextoPorPagina(await editalDeTeste()));
    const sec = (id: string) => r.secoes.find((s) => s.id === id)!;
    expect(sec("isencao").trechos[0].pagina).toBe(1);
    expect(sec("requisitos").trechos[0].pagina).toBe(2);
    expect(sec("desempate").trechos[0].texto).toContain("DESEMPATE");
    expect(sec("recursos").trechos.length).toBeGreaterThan(0);
  });

  it("lê datas numéricas e por extenso", () => {
    const datas = extrairDatas(["Inscrições de 01/11/2026 a 30/11/2026.", "Prova em 13 de dezembro de 2026."]);
    expect(datas.map((d) => d.data)).toEqual(["2026-11-01", "2026-11-30", "2026-12-13"]);
    expect(datas[2].pagina).toBe(2);
    expect(extrairDatas(["Lei 9.394/1996 e data 32/13/2026"])).toEqual([]);
  });

  it("separa o conteúdo programático por matéria e para no próximo anexo", () => {
    const c = extrairConteudos(["ANEXO II - CONTEÚDO PROGRAMÁTICO\nLÍNGUA PORTUGUESA: Interpretação de texto; Ortografia.\nCONHECIMENTOS PEDAGÓGICOS: LDB; BNCC.\nANEXO III - REQUERIMENTO\nNOME: fulano"]);
    expect(c.map((b) => b.materia)).toEqual(["Língua Portuguesa", "Conhecimentos Pedagógicos"]);
    expect(c[0].topicos).toEqual(["Interpretação de texto", "Ortografia"]);
    expect(c[1].topicos).toEqual(["LDB", "BNCC"]);
  });

  it("avisa quando o PDF parece digitalizado", () => {
    const r = analisarPorPalavrasChave(["", " "]);
    expect(r.avisos[0]).toContain("digitalizado");
  });
});

describe("cronograma de estudos", () => {
  const topicos = [
    { id: "a1", materia: "Português", topico: "Ortografia" },
    { id: "a2", materia: "Português", topico: "Crase" },
    { id: "b1", materia: "Pedagogia", topico: "LDB" },
    { id: "b2", materia: "Pedagogia", topico: "BNCC" },
  ];

  it("intercala matérias", () => {
    expect(intercalar(topicos).map((t) => t.id)).toEqual(["a1", "b1", "a2", "b2"]);
  });

  it("respeita dias da semana, tempo diário e a data da prova", () => {
    const r = gerarCronograma({ topicos, inicio: "2026-10-12", dataProva: "2026-11-30", diasSemana: [1, 3, 5], minutosDia: 60, minutosSessao: 45 });
    expect(r.topicosSemTempo).toBe(0);
    for (const s of r.sessoes) {
      expect([1, 3, 5]).toContain(diaDaSemana(s.data));
      expect(s.data < "2026-11-30").toBe(true);
    }
    const porDia = new Map<string, number>();
    for (const s of r.sessoes) porDia.set(s.data, (porDia.get(s.data) ?? 0) + s.minutos_planejados);
    for (const v of porDia.values()) expect(v <= 90).toBe(true); // revisão geral pode ocupar até 2 sessões
    // Cada tópico tem estudo e ao menos uma revisão depois dele.
    for (const t of topicos) {
      const est = r.sessoes.find((s) => s.topico_id === t.id && s.tipo === "estudo")!;
      const rev = r.sessoes.filter((s) => s.topico_id === t.id && s.tipo === "revisao");
      expect(rev.length).toBeGreaterThan(0);
      expect(rev.every((x) => x.data > est.data)).toBe(true);
    }
    expect(r.sessoes.some((s) => s.tipo === "revisao_geral")).toBe(true);
  });

  it("avisa quando falta tempo", () => {
    const muitos = Array.from({ length: 30 }, (_, i) => ({ id: `t${i}`, materia: "M", topico: `T${i}` }));
    const r = gerarCronograma({ topicos: muitos, inicio: "2026-10-12", dataProva: "2026-10-20", diasSemana: [1, 2, 3, 4, 5], minutosDia: 60, minutosSessao: 50 });
    expect(r.topicosSemTempo).toBeGreaterThan(0);
    expect(r.avisos[0]).toContain("sem horário");
  });

  it("é determinístico", () => {
    const p = { topicos, inicio: "2026-10-12", dataProva: null, diasSemana: [1, 2, 3, 4, 5], minutosDia: 90, minutosSessao: 30 };
    expect(gerarCronograma(p)).toEqual(gerarCronograma(p));
  });
});

describe("flashcards e relatórios", () => {
  it("sobe de caixa ao acertar e volta para a 1 ao errar", () => {
    expect(responderCartao(1, true, "2026-10-12")).toEqual({ caixa: 2, proxima_revisao: "2026-10-14" });
    expect(responderCartao(5, true, "2026-10-12")).toEqual({ caixa: 5, proxima_revisao: addDias("2026-10-12", 16) });
    expect(responderCartao(4, false, "2026-10-12")).toEqual({ caixa: 1, proxima_revisao: "2026-10-13" });
  });

  it("resume por matéria destacando dificuldades", () => {
    const r = resumoPorMateria([
      { data: "2026-10-12", materia: "A", tipo: "estudo", concluida: true, minutos_planejados: 50, minutos_estudados: 40, dificuldade: 3 },
      { data: "2026-10-13", materia: "B", tipo: "estudo", concluida: false, minutos_planejados: 50, minutos_estudados: null, dificuldade: null },
    ]);
    expect(r[0]).toEqual({ materia: "A", planejadas: 1, concluidas: 1, minutos: 40, dificeis: 1 });
  });

  it("soma minutos da semana (segunda a domingo)", () => {
    const s = [
      { data: "2026-10-12", materia: "A", tipo: "estudo", concluida: true, minutos_planejados: 50, minutos_estudados: 60, dificuldade: null },
      { data: "2026-10-18", materia: "A", tipo: "estudo", concluida: false, minutos_planejados: 30, minutos_estudados: null, dificuldade: null },
      { data: "2026-10-19", materia: "A", tipo: "estudo", concluida: true, minutos_planejados: 30, minutos_estudados: 30, dificuldade: null },
    ];
    expect(minutosNaSemana(s, "2026-10-14")).toEqual({ estudados: 60, planejados: 80 });
  });
});

describe("dados pessoais", () => {
  it.each([
    ["CPF 123.456.789-09", "cpf"],
    ["mãe: maria@gmail.com", "email"],
    ["ligar (31) 99876-5432", "telefone"],
    ["nascido em 12/03/2015", "nascimento"],
    ["matrícula 2023456", "matricula"],
  ])("detecta %j", (texto, tipo) => {
    expect(detectarDadosPessoais(texto).map((a) => a.tipo)).toContain(tipo);
  });

  it("não acusa textos pedagógicos comuns", () => {
    expect(detectarDadosPessoais("Plano de aula sobre a Lei 9.394/1996 para o 7º ano, 2 aulas de 50 minutos.")).toEqual([]);
  });
});

describe("calendário .ics", () => {
  it("gera eventos de dia inteiro com texto escapado e linhas dobradas", () => {
    const ics = gerarIcs("Plano; teste", [{ uid: "a", data: "2026-10-12", titulo: "Estudar: LDB, BNCC", descricao: "Linha 1\n" + "x".repeat(120) }], new Date("2026-10-12T00:00:00Z"));
    expect(ics).toContain("DTSTART;VALUE=DATE:20261012");
    expect(ics).toContain("DTEND;VALUE=DATE:20261013");
    expect(ics).toContain("SUMMARY:Estudar: LDB\\, BNCC");
    expect(ics).toContain("X-WR-CALNAME:Plano\\; teste");
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
