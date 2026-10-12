/**
 * Mapa das áreas da plataforma e da fase em que cada uma entra.
 * É a fonte única para navegação, busca global e páginas "em construção",
 * para que nada apareça como disponível antes de existir de verdade.
 */
export type AreaStatus = "disponivel" | "em-construcao";

export type Area = {
  slug: string;
  title: string;
  short: string;
  description: string;
  group: "Concursos" | "Sala de aula" | "Carreira" | "Recursos";
  phase: 1 | 2 | 3 | 4 | 5;
  status: AreaStatus;
  icon: IconName;
  keywords: string[];
};

export type IconName =
  | "trophy" | "document" | "compass" | "puzzle" | "check" | "heart"
  | "book" | "link" | "cap" | "calendar" | "spark" | "search" | "user";

export const AREAS: Area[] = [
  {
    slug: "concursos", title: "Concursos e seleções", short: "Concursos",
    description: "Busque concursos e processos seletivos da educação com fonte oficial e data de verificação.",
    group: "Concursos", phase: 2, status: "em-construcao", icon: "trophy",
    keywords: ["concurso", "vaga", "processo seletivo", "edital", "professor", "pedagogo", "banca"],
  },
  {
    slug: "editais", title: "Central de editais", short: "Editais",
    description: "Envie um edital em PDF e receba datas, requisitos e conteúdos organizados, com referência às páginas.",
    group: "Concursos", phase: 3, status: "em-construcao", icon: "document",
    keywords: ["edital", "pdf", "requisitos", "cronograma", "conteúdo programático"],
  },
  {
    slug: "estudos", title: "Preparação para concursos", short: "Estudos",
    description: "Plano de estudos, revisões programadas, flashcards, simulados e histórico de desempenho.",
    group: "Concursos", phase: 3, status: "em-construcao", icon: "calendar",
    keywords: ["estudo", "cronograma", "simulado", "flashcard", "revisão", "LDB", "BNCC", "ECA"],
  },
  {
    slug: "planejamento", title: "Laboratório de planejamento", short: "Planejamento",
    description: "Monte planos de aula e sequências didáticas com habilidades da BNCC verificadas.",
    group: "Sala de aula", phase: 2, status: "em-construcao", icon: "compass",
    keywords: ["plano de aula", "sequência didática", "BNCC", "habilidade", "planejamento"],
  },
  {
    slug: "atividades", title: "Criador de atividades", short: "Atividades",
    description: "Exercícios, caça-palavras, cruzadinhas, quizzes e projetos editáveis antes de exportar.",
    group: "Sala de aula", phase: 2, status: "em-construcao", icon: "puzzle",
    keywords: ["atividade", "exercício", "caça-palavras", "cruzadinha", "quiz", "jogo"],
  },
  {
    slug: "avaliacoes", title: "Provas e avaliações", short: "Avaliações",
    description: "Editor de provas com gabarito separado, versões equivalentes e exportação para PDF e DOCX.",
    group: "Sala de aula", phase: 2, status: "em-construcao", icon: "check",
    keywords: ["prova", "avaliação", "gabarito", "rubrica", "teste"],
  },
  {
    slug: "inclusao", title: "Inclusão e acessibilidade", short: "Inclusão",
    description: "Adaptação de atividades por barreiras observadas, sem exigir diagnósticos ou dados de estudantes.",
    group: "Sala de aula", phase: 5, status: "em-construcao", icon: "heart",
    keywords: ["inclusão", "educação especial", "adaptação", "acessibilidade", "PEI", "AEE"],
  },
  {
    slug: "biblioteca", title: "Biblioteca de recursos", short: "Biblioteca",
    description: "Materiais com fonte e licença identificadas, favoritos e coleções pessoais.",
    group: "Recursos", phase: 5, status: "em-construcao", icon: "book",
    keywords: ["biblioteca", "material", "recurso", "documento", "legislação"],
  },
  {
    slug: "links", title: "Links úteis", short: "Links úteis",
    description: "Diretório de fontes oficiais — MEC, INEP, BNCC, Diário Oficial — com verificação periódica.",
    group: "Recursos", phase: 2, status: "em-construcao", icon: "link",
    keywords: ["MEC", "INEP", "BNCC", "diário oficial", "link", "fonte oficial"],
  },
  {
    slug: "formacao", title: "Formação e carreira", short: "Formação",
    description: "Cursos, especializações e bolsas, com a diferença entre livre, extensão, lato e stricto sensu.",
    group: "Carreira", phase: 5, status: "em-construcao", icon: "cap",
    keywords: ["curso", "especialização", "pós-graduação", "mestrado", "bolsa", "formação continuada"],
  },
  {
    slug: "assistente", title: "Assistente pedagógico", short: "Assistente",
    description: "IA especializada em educação brasileira que separa fatos verificados de sugestões.",
    group: "Carreira", phase: 3, status: "em-construcao", icon: "spark",
    keywords: ["IA", "assistente", "inteligência artificial", "ajuda"],
  },
];

export const AREA_GROUPS = ["Concursos", "Sala de aula", "Recursos", "Carreira"] as const;

export function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}

export const PHASE_LABEL: Record<Area["phase"], string> = {
  1: "Fase 1 — Fundação",
  2: "Fase 2 — Ferramentas essenciais",
  3: "Fase 3 — Inteligência e personalização",
  4: "Fase 4 — Atendimento e administração",
  5: "Fase 5 — Expansão",
};
