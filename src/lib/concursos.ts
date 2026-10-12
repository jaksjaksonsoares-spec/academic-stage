import { z } from "zod";
import { UFS } from "./validation";

export const REGIOES: Record<string, (typeof UFS)[number][]> = {
  Norte: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"],
  Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  "Centro-Oeste": ["DF", "GO", "MS", "MT"],
  Sudeste: ["ES", "MG", "RJ", "SP"],
  Sul: ["PR", "RS", "SC"],
};

export const AREAS_CARGO = {
  professor: "Professor(a)",
  pedagogo: "Pedagogo(a)",
  gestor: "Gestão escolar",
  apoio: "Apoio escolar",
  educacao_especial: "Educação Especial",
  outro: "Outros cargos",
} as const;

export const ESCOLARIDADES = {
  medio: "Ensino médio",
  tecnico: "Técnico",
  superior: "Superior",
  especializacao: "Especialização",
  mestrado: "Mestrado",
  doutorado: "Doutorado",
} as const;

export const REGIMES = { estatutario: "Estatutário", celetista: "CLT", temporario: "Temporário", outro: "Outro" } as const;
export const ESFERAS = { municipal: "Municipal", estadual: "Estadual", federal: "Federal", privada: "Privada" } as const;
export const MODALIDADES = { presencial: "Presencial", remota: "Remota", hibrida: "Híbrida" } as const;
export const TIPOS_SELECAO = { concurso: "Concurso público", processo_seletivo_simplificado: "Processo seletivo simplificado" } as const;
export const FASES = {
  previsto: "Previsto (sem edital)",
  edital_publicado: "Edital publicado",
  encerrado: "Encerrado",
  suspenso: "Suspenso",
  cancelado: "Cancelado",
} as const;

export type Situacao =
  | "previsto" | "edital_publicado" | "inscricoes_em_breve" | "inscricoes_abertas"
  | "inscricoes_encerradas" | "verificacao_pendente" | "encerrado" | "suspenso" | "cancelado";

export const SITUACOES: Record<Situacao, { label: string; tone: "open" | "soon" | "neutral" | "closed" | "warn" }> = {
  inscricoes_abertas: { label: "Inscrições abertas", tone: "open" },
  inscricoes_em_breve: { label: "Inscrições em breve", tone: "soon" },
  edital_publicado: { label: "Edital publicado", tone: "neutral" },
  previsto: { label: "Previsto", tone: "neutral" },
  verificacao_pendente: { label: "Aguardando nova verificação", tone: "warn" },
  inscricoes_encerradas: { label: "Inscrições encerradas", tone: "closed" },
  encerrado: { label: "Encerrado", tone: "closed" },
  suspenso: { label: "Suspenso", tone: "warn" },
  cancelado: { label: "Cancelado", tone: "closed" },
};

/** Dias que uma verificação vale para exibir "inscrições abertas". Igual ao SQL. */
export const VALIDADE_VERIFICACAO_DIAS = 7;

/**
 * Espelho em TypeScript de public.situacao_concurso (o banco é a fonte da verdade;
 * esta versão serve para pré-visualizar no formulário do editor e é testada contra
 * os mesmos casos).
 */
export function situacaoConcurso(
  fase: keyof typeof FASES,
  inicio: string | null,
  fim: string | null,
  verificado: string | null,
  hoje: string,
): Situacao {
  if (fase !== "edital_publicado") return fase;
  if (fim && fim < hoje) return "inscricoes_encerradas";
  const limite = new Date(`${hoje}T00:00:00-03:00`);
  limite.setDate(limite.getDate() - VALIDADE_VERIFICACAO_DIAS);
  if (!verificado || new Date(verificado) < limite) return "verificacao_pendente";
  if (inicio && inicio > hoje) return "inscricoes_em_breve";
  if (fim && (!inicio || inicio <= hoje)) return "inscricoes_abertas";
  return "edital_publicado";
}

export function hojeSaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

/** Filtros da busca, lidos da URL e validados. Valores inválidos são ignorados, não quebram a página. */
const opt = <T extends z.ZodTypeAny>(s: T) => s.optional().catch(undefined);

export const filtrosSchema = z.object({
  q: opt(z.string().trim().max(100)),
  uf: opt(z.enum(UFS)),
  regiao: opt(z.enum(Object.keys(REGIOES) as [string, ...string[]])),
  area: opt(z.enum(Object.keys(AREAS_CARGO) as [string, ...string[]])),
  escolaridade: opt(z.enum(Object.keys(ESCOLARIDADES) as [string, ...string[]])),
  regime: opt(z.enum(Object.keys(REGIMES) as [string, ...string[]])),
  tipo: opt(z.enum(Object.keys(TIPOS_SELECAO) as [string, ...string[]])),
  situacao: opt(z.enum(Object.keys(SITUACOES) as [string, ...string[]])),
  modalidade: opt(z.enum(Object.keys(MODALIDADES) as [string, ...string[]])),
  banca: opt(z.string().trim().max(80)),
  salario: opt(z.coerce.number().int().min(0).max(100000)),
  ate: opt(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  pagina: z.coerce.number().int().min(1).max(500).catch(1).default(1),
});

export type Filtros = z.infer<typeof filtrosSchema>;

export function lerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const flat = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v === "" ? undefined : v]),
  );
  return filtrosSchema.parse(flat);
}

/** Escapa curingas do ILIKE para buscas literais. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function formatBRL(v: number | null | undefined): string | null {
  if (v == null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatData(d: string | null | undefined): string | null {
  if (!d) return null;
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}
