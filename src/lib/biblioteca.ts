import { z } from "zod";
import { ETAPAS } from "./validation";

export const TIPOS_RECURSO = {
  plano: "Plano de aula",
  atividade: "Atividade",
  prova: "Prova",
  projeto: "Projeto pedagógico",
  sequencia: "Sequência didática",
  modelo: "Modelo de documento escolar",
  apresentacao: "Apresentação",
  jogo: "Jogo",
  acessivel: "Material acessível",
  guia_estudo: "Guia de estudo",
  livro: "Livro (acesso legal)",
  documento_oficial: "Documento oficial",
  legislacao: "Legislação",
  recurso_digital: "Recurso digital",
  ferramenta: "Ferramenta de ensino",
  formacao: "Formação continuada",
} as const;

export type Licenca = "cc-by-4.0" | "cc-by-sa-4.0" | "cc-by-nc-4.0" | "cc-by-nc-sa-4.0" | "cc0" | "dominio-publico" | "link-externo";

export const LICENCAS: Record<Licenca, { nome: string; resumo: string; url: string | null; hospedavel: boolean }> = {
  "cc-by-4.0": { nome: "CC BY 4.0", resumo: "Pode copiar, adaptar e usar, inclusive comercialmente, citando a autoria.", url: "https://creativecommons.org/licenses/by/4.0/deed.pt-br", hospedavel: true },
  "cc-by-sa-4.0": { nome: "CC BY-SA 4.0", resumo: "Pode copiar e adaptar citando a autoria; adaptações devem usar a mesma licença.", url: "https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br", hospedavel: true },
  "cc-by-nc-4.0": { nome: "CC BY-NC 4.0", resumo: "Pode copiar e adaptar citando a autoria, sem uso comercial.", url: "https://creativecommons.org/licenses/by-nc/4.0/deed.pt-br", hospedavel: true },
  "cc-by-nc-sa-4.0": { nome: "CC BY-NC-SA 4.0", resumo: "Sem uso comercial; adaptações com a mesma licença; citando a autoria.", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br", hospedavel: true },
  cc0: { nome: "CC0 (domínio público dedicado)", resumo: "Sem restrições de uso.", url: "https://creativecommons.org/publicdomain/zero/1.0/deed.pt-br", hospedavel: true },
  "dominio-publico": { nome: "Domínio público", resumo: "Obra em domínio público.", url: null, hospedavel: true },
  "link-externo": { nome: "Conteúdo no site de origem", resumo: "A plataforma só aponta para a fonte. Os direitos seguem as regras do site de origem.", url: null, hospedavel: false },
};

/** Licenças que o autor pode escolher ao compartilhar um material próprio. */
export const LICENCAS_AUTOR: Licenca[] = ["cc-by-4.0", "cc-by-sa-4.0", "cc-by-nc-4.0", "cc-by-nc-sa-4.0", "cc0"];

export const MOTIVOS_DENUNCIA = {
  direitos_autorais: "Viola direitos autorais",
  erro_conteudo: "Tem erro de conteúdo",
  inadequado: "Conteúdo inadequado",
  dados_pessoais: "Expõe dados pessoais",
  outro: "Outro motivo",
} as const;

export const STATUS_RECURSO = { em_revisao: "Em revisão", publicado: "Publicado", recusado: "Recusado", arquivado: "Arquivado" } as const;

/** Texto de atribuição exigido pelas licenças CC. */
export function atribuicao(r: { titulo: string; autor_nome: string | null; fonte_nome: string | null; licenca: Licenca }): string {
  const l = LICENCAS[r.licenca];
  const autor = r.autor_nome || r.fonte_nome || "autoria não informada";
  if (r.licenca === "link-externo") return `“${r.titulo}”, ${autor}. Disponível no site de origem.`;
  return `“${r.titulo}”, de ${autor}, disponível no AcademiC Stage sob a licença ${l.nome}${l.url ? ` (${l.url})` : ""}.`;
}

const etapaValues = ETAPAS.map((e) => e.value) as [string, ...string[]];
const opt = <T extends z.ZodTypeAny>(s: T) => s.optional().catch(undefined);

export const filtrosBiblioteca = z.object({
  q: opt(z.string().trim().max(100)),
  tipo: opt(z.enum(Object.keys(TIPOS_RECURSO) as [string, ...string[]])),
  etapa: opt(z.enum(etapaValues)),
  componente: opt(z.string().trim().max(80)),
  licenca: opt(z.enum(Object.keys(LICENCAS) as [string, ...string[]])),
  origem: opt(z.enum(["curadoria", "comunidade"])),
  pagina: z.coerce.number().int().min(1).max(500).catch(1).default(1),
});

export type FiltrosBiblioteca = z.infer<typeof filtrosBiblioteca>;

export function lerFiltrosBiblioteca(sp: Record<string, string | string[] | undefined>): FiltrosBiblioteca {
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v === "" ? undefined : v]));
  return filtrosBiblioteca.parse(flat);
}

/** Termo seguro para busca textual (websearch do Postgres) e filtros ilike. */
export function termoBusca(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Tipo de recurso sugerido a partir do tipo de documento. */
export function tipoRecursoDeDocumento(tipo: "plano" | "atividade" | "avaliacao" | "texto"): keyof typeof TIPOS_RECURSO {
  return tipo === "plano" ? "plano" : tipo === "atividade" ? "atividade" : tipo === "avaliacao" ? "prova" : "guia_estudo";
}
