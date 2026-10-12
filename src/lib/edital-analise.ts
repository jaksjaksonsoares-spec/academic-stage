/**
 * Análise de edital por palavras-chave. Funciona sem IA: localiza trechos e
 * datas em cada página e devolve sempre a página de origem. Não interpreta
 * regras — mostra onde estão, para a pessoa conferir no original.
 */

export type Trecho = { texto: string; pagina: number | null };

export type SecaoEdital = {
  id: TopicoId;
  titulo: string;
  trechos: Trecho[];
};

export type DataEdital = { data: string; contexto: string; pagina: number | null };

export type BlocoConteudo = { materia: string; topicos: string[]; pagina: number | null };

export type ResultadoEdital = {
  versao: 1;
  metodo: "palavras-chave" | "ia";
  secoes: SecaoEdital[];
  datas: DataEdital[];
  conteudos: BlocoConteudo[];
  avisos: string[];
  /** Texto livre da IA por seção (só no método "ia"). */
  resumoIA?: { id: TopicoId; titulo: string; texto: string; paginas: number[] }[];
};

export type TopicoId =
  | "cargo" | "requisitos" | "conteudos" | "datas" | "classificacao" | "etapas"
  | "pontuacao" | "documentos" | "desempate" | "recursos" | "isencao" | "atencao";

export const TOPICOS: { id: TopicoId; titulo: string; chaves: RegExp[] }[] = [
  { id: "cargo", titulo: "Cargo pretendido", chaves: [/\bcargos?\b/i, /\bfun[çc][ãa]o\b/i, /\bvagas?\b/i] },
  { id: "requisitos", titulo: "Requisitos de participação", chaves: [/requisitos?/i, /investidura/i, /escolaridade/i, /habilita[çc][ãa]o/i] },
  { id: "conteudos", titulo: "Conteúdos cobrados", chaves: [/conte[úu]do program[áa]tico/i, /conte[úu]dos?\b/i, /programa d[ae]s? provas?/i] },
  { id: "datas", titulo: "Datas importantes", chaves: [/cronograma/i, /\bprazo\b/i] },
  { id: "classificacao", titulo: "Critérios de classificação", chaves: [/classifica[çc][ãa]o/i, /aprovad[oa]s?/i, /nota m[íi]nima/i] },
  { id: "etapas", titulo: "Etapas da seleção", chaves: [/\betapas?\b/i, /prova (objetiva|discursiva|pr[áa]tica|did[áa]tica)/i, /provas? de t[íi]tulos/i, /\bfases?\b/i] },
  { id: "pontuacao", titulo: "Regras de pontuação", chaves: [/pontua[çc][ãa]o/i, /\bpontos\b/i, /\bpeso\b/i] },
  { id: "documentos", titulo: "Documentos exigidos", chaves: [/documentos?\b/i, /documenta[çc][ãa]o/i, /comprova[çc][ãa]o/i] },
  { id: "desempate", titulo: "Critérios de desempate", chaves: [/desempate/i] },
  { id: "recursos", titulo: "Regras para recursos", chaves: [/\brecursos?\b/i, /impugna[çc][ãa]o/i] },
  { id: "isencao", titulo: "Isenção de taxa", chaves: [/isen[çc][ãa]o/i, /\bisent[oa]s?\b/i, /cad[ úu]nico/i] },
  { id: "atencao", titulo: "Pontos de atenção", chaves: [/elimina(do|da|ção|tório)/i, /\bvedad[oa]\b/i, /\bproibid[oa]\b/i, /n[ãa]o ser[áa] (admitid|aceit|permitid)/i, /sob pena/i] },
];

const MESES: Record<string, string> = {
  janeiro: "01", fevereiro: "02", "março": "03", marco: "03", abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
};

const MAX_TRECHOS = 8;

/** Quebra o texto de cada página em linhas não vazias, normalizando espaços. */
function linhasDe(paginas: string[]): { linha: string; pagina: number | null }[] {
  const semPaginas = paginas.length === 1;
  return paginas.flatMap((txt, i) =>
    txt
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter((l) => l.length > 0)
      .map((linha) => ({ linha, pagina: semPaginas ? null : i + 1 })),
  );
}

export function extrairDatas(paginas: string[]): DataEdital[] {
  const out: DataEdital[] = [];
  const vistos = new Set<string>();
  for (const { linha, pagina } of linhasDe(paginas)) {
    const achadas: string[] = [];
    for (const m of linha.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g)) {
      const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) achadas.push(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    for (const m of linha.matchAll(/\b(\d{1,2})º? de ([a-zç]+) de (\d{4})\b/gi)) {
      const mes = MESES[m[2].toLowerCase()];
      if (mes) achadas.push(`${m[3]}-${mes}-${m[1].padStart(2, "0")}`);
    }
    for (const data of achadas) {
      const key = `${data}|${linha}`;
      if (vistos.has(key)) continue;
      vistos.add(key);
      out.push({ data, contexto: linha.slice(0, 300), pagina });
    }
  }
  return out.sort((a, b) => a.data.localeCompare(b.data)).slice(0, 60);
}

/**
 * Encontra o anexo de conteúdo programático e separa por matéria.
 * Formato esperado em muitos editais: "MATÉRIA: tópico; tópico; tópico."
 */
export function extrairConteudos(paginas: string[]): BlocoConteudo[] {
  const linhas = linhasDe(paginas);
  const inicio = linhas.findIndex((l) => /conte[úu]do(s)? program[áa]tico/i.test(l.linha) || /programa d[ae]s? provas?/i.test(l.linha));
  if (inicio < 0) return [];

  const blocos: BlocoConteudo[] = [];
  let atual: BlocoConteudo | null = null;

  for (let i = inicio + 1; i < linhas.length && i < inicio + 400; i++) {
    const { linha, pagina } = linhas[i];
    if (/^anexo\b/i.test(linha)) break; // próximo anexo encerra o conteúdo
    const m = /^([A-ZÀ-ÚÇ0-9 ,\-–()/]{3,90}):\s*(.*)$/.exec(linha);
    if (m && m[1] === m[1].toUpperCase()) {
      atual = { materia: tituloCase(m[1].trim()), topicos: [], pagina };
      blocos.push(atual);
      if (m[2]) atual.topicos.push(...separarTopicos(m[2]));
    } else if (atual) {
      atual.topicos.push(...separarTopicos(linha));
    } else {
      atual = { materia: "Conteúdos", topicos: separarTopicos(linha), pagina };
      blocos.push(atual);
    }
  }
  return blocos
    .map((b) => ({ ...b, topicos: [...new Set(b.topicos)].slice(0, 80) }))
    .filter((b) => b.topicos.length > 0);
}

function separarTopicos(t: string): string[] {
  return t
    .split(/;|\s(?=\d{1,2}[.)]\s)/)
    .map((s) => s.replace(/^\d{1,2}[.)]\s*/, "").replace(/[.;]+$/, "").trim())
    .filter((s) => s.length >= 3 && s.length <= 300);
}

function tituloCase(s: string): string {
  const minusculas = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && minusculas.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function analisarPorPalavrasChave(paginas: string[]): ResultadoEdital {
  const linhas = linhasDe(paginas);
  const secoes: SecaoEdital[] = TOPICOS.map(({ id, titulo, chaves }) => {
    const trechos: Trecho[] = [];
    for (let i = 0; i < linhas.length && trechos.length < MAX_TRECHOS; i++) {
      if (!chaves.some((r) => r.test(linhas[i].linha))) continue;
      // Leva a linha encontrada e a seguinte, que costuma completar a regra.
      const prox = linhas[i + 1] && linhas[i + 1].pagina === linhas[i].pagina ? ` ${linhas[i + 1].linha}` : "";
      trechos.push({ texto: (linhas[i].linha + prox).slice(0, 500), pagina: linhas[i].pagina });
      i++; // evita repetir a linha seguinte como novo trecho
    }
    return { id, titulo, trechos };
  });

  const total = paginas.join("").replace(/\s/g, "").length;
  const avisos: string[] = [];
  if (total < 200) avisos.push("Quase nenhum texto foi encontrado. O PDF pode ser digitalizado (imagem); nesse caso a leitura automática não funciona — confira o documento original.");
  for (const s of secoes) if (s.trechos.length === 0) avisos.push(`Nada encontrado sobre “${s.titulo}”. Isso não significa que o edital não trate do assunto: confira no documento.`);

  return { versao: 1, metodo: "palavras-chave", secoes, datas: extrairDatas(paginas), conteudos: extrairConteudos(paginas), avisos };
}
