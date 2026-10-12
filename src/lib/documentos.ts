import { z } from "zod";
import { hashSeed, seededRandom, shuffle } from "./random";

/* ── Questões ─────────────────────────────────────────────────────── */

const id = z.string().min(1).max(40);
const texto = (max: number) => z.string().max(max).default("");

export const questaoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("multipla"),
    id,
    enunciado: texto(4000),
    alternativas: z.array(z.object({ id, texto: texto(1000) })).min(2).max(6),
    correta: z.string().max(40).nullable().default(null),
    pontos: z.number().min(0).max(100).default(1),
    dificuldade: z.enum(["facil", "media", "dificil"]).default("media"),
    comentario: texto(2000),
  }),
  z.object({
    tipo: z.literal("vf"),
    id,
    enunciado: texto(4000),
    itens: z.array(z.object({ id, texto: texto(1000), verdadeiro: z.boolean() })).min(1).max(10),
    pontos: z.number().min(0).max(100).default(1),
    dificuldade: z.enum(["facil", "media", "dificil"]).default("media"),
    comentario: texto(2000),
  }),
  z.object({
    tipo: z.literal("associacao"),
    id,
    enunciado: texto(4000),
    pares: z.array(z.object({ id, esquerda: texto(300), direita: texto(300) })).min(2).max(10),
    pontos: z.number().min(0).max(100).default(1),
    dificuldade: z.enum(["facil", "media", "dificil"]).default("media"),
    comentario: texto(2000),
  }),
  z.object({
    tipo: z.literal("discursiva"),
    id,
    enunciado: texto(4000),
    linhas: z.number().int().min(1).max(40).default(5),
    criterios: texto(2000),
    respostaEsperada: texto(4000),
    pontos: z.number().min(0).max(100).default(1),
    dificuldade: z.enum(["facil", "media", "dificil"]).default("media"),
    comentario: texto(2000),
  }),
]);

export type Questao = z.infer<typeof questaoSchema>;

export const TIPOS_QUESTAO: Record<Questao["tipo"], string> = {
  multipla: "Múltipla escolha",
  vf: "Verdadeiro ou falso",
  associacao: "Associação de colunas",
  discursiva: "Discursiva",
};

export const DIFICULDADES = { facil: "Fácil", media: "Média", dificil: "Difícil" } as const;

/* ── Documentos ───────────────────────────────────────────────────── */

export const planoSchema = z.object({
  periodicidade: z.enum(["aula", "semanal", "mensal", "sequencia"]).default("aula"),
  etapa: z.enum(["EI", "EF", "EM", ""]).default(""),
  ano: z.number().int().min(1).max(9).nullable().default(null),
  componente: texto(80),
  tema: texto(200),
  duracao: texto(80),
  metodologia: texto(200),
  contextoTurma: texto(1500),
  acessibilidade: texto(1500),
  objetivos: texto(3000),
  habilidades: z.array(z.object({ codigo: texto(20), descricao: texto(1000) })).max(20).default([]),
  conhecimentosPrevios: texto(2000),
  materiais: texto(2000),
  desenvolvimento: z.array(z.object({ id, titulo: texto(120), duracao: texto(40), descricao: texto(3000) })).max(20).default([]),
  mediacao: texto(3000),
  atividades: texto(3000),
  avaliacao: texto(3000),
  acompanhamento: texto(2000),
  intervencoes: texto(2000),
  referencias: texto(3000),
});

export const atividadeSchema = z.object({
  formato: z.enum(["questoes", "caca-palavras", "cruzadinha"]).default("questoes"),
  componente: texto(80),
  ano: texto(40),
  instrucoes: texto(2000),
  questoes: z.array(questaoSchema).max(60).default([]),
  palavras: z.array(z.string().max(30)).max(30).default([]),
  tamanhoGrade: z.number().int().min(6).max(20).default(12),
  direcoes: z.array(z.enum(["horizontal", "vertical", "diagonal", "reversas"])).default(["horizontal", "vertical"]),
  pistas: z.array(z.object({ id, resposta: texto(30), pista: texto(300) })).max(25).default([]),
  semente: z.number().int().default(1),
});

export const avaliacaoSchema = z.object({
  escola: texto(160),
  componente: texto(80),
  turma: texto(60),
  professor: texto(120),
  periodo: z.enum(["", "1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre", "1º trimestre", "2º trimestre", "3º trimestre", "Recuperação"]).default(""),
  data: texto(20),
  instrucoes: texto(3000),
  questoes: z.array(questaoSchema).max(80).default([]),
  versoes: z.number().int().min(1).max(4).default(1),
  embaralharAlternativas: z.boolean().default(true),
  layout: z
    .object({
      fonte: z.enum(["sans", "serif", "legivel"]).default("sans"),
      tamanho: z.enum(["12", "14", "16", "18"]).default("12"),
      espacamento: z.enum(["compacto", "normal", "amplo"]).default("normal"),
      economica: z.boolean().default(false),
    })
    .default({}),
});

export const textoSchema = z.object({
  corpo: texto(40000),
  origem: z.enum(["", "assistente"]).default(""),
});

export type Plano = z.infer<typeof planoSchema>;
export type Atividade = z.infer<typeof atividadeSchema>;
export type Avaliacao = z.infer<typeof avaliacaoSchema>;
export type Texto = z.infer<typeof textoSchema>;
export type TipoDocumento = "plano" | "atividade" | "avaliacao" | "texto";

export const SCHEMAS = { plano: planoSchema, atividade: atividadeSchema, avaliacao: avaliacaoSchema, texto: textoSchema } as const;

export const TIPOS_DOCUMENTO: Record<TipoDocumento, { label: string; novo: string; rota: string }> = {
  plano: { label: "Plano de aula", novo: "Novo plano", rota: "planejamento" },
  atividade: { label: "Atividade", novo: "Nova atividade", rota: "atividades" },
  avaliacao: { label: "Avaliação", novo: "Nova avaliação", rota: "avaliacoes" },
  texto: { label: "Texto", novo: "Novo texto", rota: "assistente" },
};

export function conteudoInicial<T extends TipoDocumento>(tipo: T): z.infer<(typeof SCHEMAS)[T]> {
  return SCHEMAS[tipo].parse({}) as z.infer<(typeof SCHEMAS)[T]>;
}

/** Lê conteúdo salvo de forma tolerante: campos novos ganham valor padrão. */
export function lerConteudo<T extends TipoDocumento>(tipo: T, raw: unknown): z.infer<(typeof SCHEMAS)[T]> {
  const r = SCHEMAS[tipo].safeParse(raw ?? {});
  return (r.success ? r.data : SCHEMAS[tipo].parse({})) as z.infer<(typeof SCHEMAS)[T]>;
}

/* ── Versões e gabarito ───────────────────────────────────────────── */

export const LETRAS = ["A", "B", "C", "D"] as const;

/**
 * Gera a versão de uma prova: mesma lista de questões em outra ordem e, se
 * pedido, alternativas embaralhadas. Determinístico por documento + versão.
 * A versão A preserva a ordem original.
 */
export function gerarVersao(questoes: Questao[], docId: string, versao: number, embaralharAlternativas: boolean): Questao[] {
  if (versao <= 0) return questoes;
  const rnd = seededRandom(hashSeed(`${docId}:${versao}`));
  return shuffle(questoes, rnd).map((q) => {
    if (q.tipo === "multipla" && embaralharAlternativas) return { ...q, alternativas: shuffle(q.alternativas, rnd) };
    if (q.tipo === "associacao") return { ...q, pares: q.pares }; // a coluna da direita é embaralhada na exibição
    return q;
  });
}

/** Ordem embaralhada da coluna da direita numa associação (estável por questão). */
export function ordemDireita(q: Extract<Questao, { tipo: "associacao" }>, salt: string): number[] {
  const rnd = seededRandom(hashSeed(`${q.id}:${salt}`));
  return shuffle(q.pares.map((_, i) => i), rnd);
}

export type ItemGabarito = { numero: number; resposta: string; pontos: number };

export function gabarito(questoes: Questao[], salt = ""): ItemGabarito[] {
  return questoes.map((q, i) => {
    const numero = i + 1;
    switch (q.tipo) {
      case "multipla": {
        const idx = q.alternativas.findIndex((a) => a.id === q.correta);
        return { numero, resposta: idx >= 0 ? String.fromCharCode(97 + idx) + ")" : "— (sem alternativa correta marcada)", pontos: q.pontos };
      }
      case "vf":
        return { numero, resposta: q.itens.map((it) => (it.verdadeiro ? "V" : "F")).join(" "), pontos: q.pontos };
      case "associacao": {
        const ordem = ordemDireita(q, salt);
        // Para cada item da esquerda (1..n), a letra da direita correspondente.
        const resp = q.pares.map((_, i) => `${i + 1}-${String.fromCharCode(97 + ordem.indexOf(i))}`).join(", ");
        return { numero, resposta: resp, pontos: q.pontos };
      }
      case "discursiva":
        return { numero, resposta: q.respostaEsperada || "Resposta pessoal — ver critérios", pontos: q.pontos };
    }
  });
}

export function totalPontos(questoes: Questao[]): number {
  return Math.round(questoes.reduce((s, q) => s + q.pontos, 0) * 100) / 100;
}

/** Problemas que impedem uma prova de ter gabarito confiável. */
export function pendencias(questoes: Questao[]): string[] {
  const out: string[] = [];
  questoes.forEach((q, i) => {
    const n = i + 1;
    if (!q.enunciado.trim()) out.push(`Questão ${n}: enunciado vazio.`);
    if (q.tipo === "multipla") {
      if (!q.correta || !q.alternativas.some((a) => a.id === q.correta)) out.push(`Questão ${n}: marque a alternativa correta.`);
      if (q.alternativas.some((a) => !a.texto.trim())) out.push(`Questão ${n}: há alternativa sem texto.`);
    }
    if (q.tipo === "associacao" && q.pares.some((p) => !p.esquerda.trim() || !p.direita.trim())) out.push(`Questão ${n}: complete todos os pares.`);
    if (q.tipo === "vf" && q.itens.some((it) => !it.texto.trim())) out.push(`Questão ${n}: há afirmação sem texto.`);
  });
  return out;
}

export function novoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function novaQuestao(tipo: Questao["tipo"]): Questao {
  const base = { id: novoId(), enunciado: "", pontos: 1, dificuldade: "media" as const, comentario: "" };
  switch (tipo) {
    case "multipla":
      return { ...base, tipo, alternativas: Array.from({ length: 4 }, () => ({ id: novoId(), texto: "" })), correta: null };
    case "vf":
      return { ...base, tipo, itens: [{ id: novoId(), texto: "", verdadeiro: true }, { id: novoId(), texto: "", verdadeiro: false }] };
    case "associacao":
      return { ...base, tipo, pares: Array.from({ length: 3 }, () => ({ id: novoId(), esquerda: "", direita: "" })) };
    case "discursiva":
      return { ...base, tipo, linhas: 5, criterios: "", respostaEsperada: "" };
  }
}
