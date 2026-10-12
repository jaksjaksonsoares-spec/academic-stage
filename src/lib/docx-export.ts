import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { generateWordSearch } from "./wordsearch";
import { generateCrossword } from "./crossword";
import {
  LETRAS,
  gabarito,
  gerarVersao,
  ordemDireita,
  totalPontos,
  type Atividade,
  type Avaliacao,
  type Plano,
  type Questao,
  type TipoDocumento,
} from "./documentos";

type Bloco = Paragraph | Table;

const p = (text: string, opts: { bold?: boolean; size?: number; spacingAfter?: number } = {}) =>
  new Paragraph({
    spacing: { after: opts.spacingAfter ?? 120 },
    children: text.split("\n").flatMap((line, i) => [
      ...(i > 0 ? [new TextRun({ break: 1 })] : []),
      new TextRun({ text: line, bold: opts.bold, size: opts.size }),
    ]),
  });

const h = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) =>
  new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text })] });

const secao = (titulo: string, texto: string): Bloco[] => (texto.trim() ? [h(titulo, HeadingLevel.HEADING_3), p(texto)] : []);

const linha = () =>
  new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "9CA3AF", space: 1 } }, spacing: { after: 240 }, children: [] });

function tabela(linhas: string[][], opts: { cabecalho?: boolean; larguras?: number[]; destaque?: Set<string>; centro?: boolean } = {}): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: linhas.map((cols, r) =>
      new TableRow({
        children: cols.map((c, k) =>
          new TableCell({
            width: opts.larguras ? { size: opts.larguras[k], type: WidthType.PERCENTAGE } : undefined,
            shading: opts.destaque?.has(`${r},${k}`) ? { type: ShadingType.CLEAR, color: "auto", fill: "FDE68A" } : undefined,
            children: [new Paragraph({ alignment: opts.centro ? AlignmentType.CENTER : undefined, children: [new TextRun({ text: c, bold: opts.cabecalho && r === 0 })] })],
          }),
        ),
      }),
    ),
  });
}

/* ── Questões ─────────────────────────────────────────────────────── */

function questoesDocx(qs: Questao[], salt: string, mostrarPontos: boolean): Bloco[] {
  const out: Bloco[] = [];
  qs.forEach((q, i) => {
    const pts = mostrarPontos ? ` (${q.pontos.toLocaleString("pt-BR")} ${q.pontos === 1 ? "ponto" : "pontos"})` : "";
    out.push(new Paragraph({ spacing: { before: 200, after: 80 }, keepNext: true, children: [new TextRun({ text: `${i + 1}. `, bold: true }), new TextRun(q.enunciado + pts)] }));
    switch (q.tipo) {
      case "multipla":
        q.alternativas.forEach((a, k) => out.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: `${String.fromCharCode(97 + k)}) `, bold: true }), new TextRun(a.texto)] })));
        break;
      case "vf":
        q.itens.forEach((it) => out.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun(`(   ) ${it.texto}`)] })));
        break;
      case "associacao": {
        const ordem = ordemDireita(q, salt);
        const rows = q.pares.map((par, k) => [`${k + 1}. ${par.esquerda}`, `(   ) ${String.fromCharCode(97 + k)}) ${q.pares[ordem[k]].direita}`]);
        out.push(tabela(rows, { larguras: [50, 50] }));
        break;
      }
      case "discursiva":
        for (let k = 0; k < q.linhas; k++) out.push(linha());
        break;
    }
  });
  return out;
}

function gabaritoDocx(qs: Questao[], salt: string, titulo: string): Bloco[] {
  const g = gabarito(qs, salt);
  const out: Bloco[] = [
    new Paragraph({ children: [new PageBreak()] }),
    h(titulo, HeadingLevel.HEADING_1),
    tabela([["Questão", "Resposta", "Pontos"], ...g.map((r) => [String(r.numero), r.resposta, r.pontos.toLocaleString("pt-BR")])], { cabecalho: true, larguras: [15, 65, 20] }),
  ];
  const comentados = qs.map((q, i) => ({ q, n: i + 1 })).filter(({ q }) => q.comentario.trim() || (q.tipo === "discursiva" && q.criterios.trim()));
  if (comentados.length) {
    out.push(h("Resolução comentada e critérios", HeadingLevel.HEADING_2));
    for (const { q, n } of comentados) {
      if (q.tipo === "discursiva" && q.criterios.trim()) out.push(p(`${n}. Critérios: ${q.criterios}`));
      if (q.comentario.trim()) out.push(p(`${n}. ${q.comentario}`));
    }
  }
  return out;
}

/* ── Documentos ───────────────────────────────────────────────────── */

const PERIODICIDADE = { aula: "Plano de aula", semanal: "Plano semanal", mensal: "Plano mensal", sequencia: "Sequência didática" };
const ETAPA = { EI: "Educação Infantil", EF: "Ensino Fundamental", EM: "Ensino Médio", "": "" };

function planoDocx(titulo: string, c: Plano): Bloco[] {
  const ident = [PERIODICIDADE[c.periodicidade], c.etapa && ETAPA[c.etapa], c.ano ? `${c.ano}${c.etapa === "EM" ? "ª série" : "º ano"}` : null, c.componente, c.duracao].filter(Boolean).join(" · ");
  return [
    h(titulo, HeadingLevel.HEADING_1),
    ...(ident ? [p(ident)] : []),
    ...(c.tema ? [p(`Tema: ${c.tema}`)] : []),
    ...(c.metodologia ? [p(`Metodologia: ${c.metodologia}`)] : []),
    ...secao("Objetivos de aprendizagem", c.objetivos),
    ...(c.habilidades.length ? [h("Habilidades da BNCC", HeadingLevel.HEADING_3), ...c.habilidades.map((x) => p(`(${x.codigo.toUpperCase()}) ${x.descricao}`))] : []),
    ...secao("Conhecimentos prévios", c.conhecimentosPrevios),
    ...secao("Materiais necessários", c.materiais),
    ...(c.desenvolvimento.length
      ? [h("Desenvolvimento", HeadingLevel.HEADING_3), ...c.desenvolvimento.flatMap((e, i) => [p(`${i + 1}. ${e.titulo || "Etapa"}${e.duracao ? ` (${e.duracao})` : ""}`, { bold: true, spacingAfter: 40 }), ...(e.descricao ? [p(e.descricao)] : [])])]
      : []),
    ...secao("Estratégias de mediação", c.mediacao),
    ...secao("Atividades propostas", c.atividades),
    ...secao("Avaliação da aprendizagem", c.avaliacao),
    ...secao("Critérios de acompanhamento", c.acompanhamento),
    ...secao("Possíveis intervenções pedagógicas", c.intervencoes),
    ...secao("Contexto da turma", c.contextoTurma),
    ...secao("Acessibilidade", c.acessibilidade),
    ...secao("Referências", c.referencias),
    p("Habilidades da BNCC informadas pelo(a) professor(a). Confira as diretrizes curriculares da sua rede de ensino.", { size: 18 }),
  ];
}

function atividadeDocx(titulo: string, a: Atividade, docId: string, versao: number): Bloco[] {
  const salt = `${docId}:${versao}`;
  const out: Bloco[] = [
    h(`${titulo}${versao > 0 ? ` — versão ${LETRAS[versao]}` : ""}`, HeadingLevel.HEADING_1),
    ...([a.componente, a.ano].some(Boolean) ? [p([a.componente, a.ano].filter(Boolean).join(" · "))] : []),
    p("Nome: ____________________________________________    Data: ____/____/______"),
    ...(a.instrucoes ? [p(a.instrucoes)] : []),
  ];

  if (a.formato === "questoes") {
    const qs = gerarVersao(a.questoes, docId, versao, true);
    out.push(...questoesDocx(qs, salt, false), ...gabaritoDocx(qs, salt, `Gabarito — ${titulo}`));
  } else if (a.formato === "caca-palavras") {
    const ws = generateWordSearch(a.palavras, { size: a.tamanhoGrade, directions: a.direcoes, seed: a.semente + versao });
    out.push(tabela(ws.grid, { centro: true }), p(`Palavras: ${ws.placed.map((x) => x.display).sort((x, y) => x.localeCompare(y, "pt-BR")).join(" · ")}`));
    const marc = new Set<string>();
    for (const pl of ws.placed) for (let i = 0; i < pl.word.length; i++) marc.add(`${pl.row + pl.dr * i},${pl.col + pl.dc * i}`);
    out.push(new Paragraph({ children: [new PageBreak()] }), h(`Gabarito — ${titulo}`, HeadingLevel.HEADING_1), tabela(ws.grid, { centro: true, destaque: marc }));
  } else {
    const cw = generateCrossword(a.pistas.map((x) => ({ answer: x.resposta, clue: x.pista })));
    const nums = new Map(cw.entries.map((e) => [`${e.row},${e.col}`, e.number]));
    const vazia = cw.cells.map((row, r) => row.map((ch, c) => (ch ? (nums.has(`${r},${c}`) ? String(nums.get(`${r},${c}`)) : " ") : "")));
    out.push(
      tabela(vazia, { centro: true }),
      h("Horizontais", HeadingLevel.HEADING_3),
      ...cw.entries.filter((e) => e.across).map((e) => p(`${e.number}. ${e.clue}`)),
      h("Verticais", HeadingLevel.HEADING_3),
      ...cw.entries.filter((e) => !e.across).map((e) => p(`${e.number}. ${e.clue}`)),
      new Paragraph({ children: [new PageBreak()] }),
      h(`Gabarito — ${titulo}`, HeadingLevel.HEADING_1),
      tabela(cw.cells.map((row) => row.map((ch) => ch ?? "")), { centro: true }),
    );
  }
  return out;
}

function avaliacaoDocx(titulo: string, a: Avaliacao, docId: string, versao: number): Bloco[] {
  const qs = gerarVersao(a.questoes, docId, versao, a.embaralharAlternativas);
  const salt = `${docId}:${versao}`;
  const sufixo = a.versoes > 1 ? ` — versão ${LETRAS[versao]}` : "";
  return [
    ...(a.escola ? [p(a.escola, { bold: true })] : []),
    h(`${titulo}${sufixo}`, HeadingLevel.HEADING_1),
    ...([a.componente, a.turma, a.periodo].some(Boolean) ? [p([a.componente, a.turma, a.periodo].filter(Boolean).join(" · "))] : []),
    p(`Estudante: ______________________________________   Data: ${a.data || "____/____/______"}`),
    p(`${a.professor ? `Professor(a): ${a.professor}    ` : ""}Nota: ______ / ${totalPontos(a.questoes).toLocaleString("pt-BR")}`),
    ...(a.instrucoes ? [p(a.instrucoes)] : []),
    ...questoesDocx(qs, salt, true),
    ...gabaritoDocx(qs, salt, `Gabarito — ${titulo}${sufixo}`),
  ];
}

const TAMANHO: Record<string, number> = { "12": 24, "14": 28, "16": 32, "18": 36 };
const FONTE: Record<string, string> = { sans: "Arial", serif: "Times New Roman", legivel: "Verdana" };

export async function documentoParaDocx(args: { tipo: TipoDocumento; titulo: string; conteudo: Plano | Atividade | Avaliacao; docId: string; versao: number }): Promise<Buffer> {
  const { tipo, titulo, conteudo, docId, versao } = args;
  const children =
    tipo === "plano" ? planoDocx(titulo, conteudo as Plano)
    : tipo === "atividade" ? atividadeDocx(titulo, conteudo as Atividade, docId, versao)
    : avaliacaoDocx(titulo, conteudo as Avaliacao, docId, versao);

  const lay = tipo === "avaliacao" ? (conteudo as Avaliacao).layout : null;
  const doc = new Document({
    creator: "AcademiC Stage",
    title: titulo,
    styles: {
      default: {
        document: { run: { font: lay ? FONTE[lay.fonte] : "Arial", size: lay ? TAMANHO[lay.tamanho] : 24 } },
      },
    },
    sections: [{ properties: { page: { margin: { top: 850, bottom: 850, left: 850, right: 850 } } }, children }],
  });
  return Packer.toBuffer(doc);
}

export function nomeArquivo(titulo: string, versao: number, comVersao: boolean): string {
  const base = titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "documento";
  return `${base}${comVersao ? `-versao-${LETRAS[versao]}` : ""}.docx`;
}
