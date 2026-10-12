export const TIPOS_CURSO = {
  livre: "Curso livre",
  extensao: "Extensão universitária",
  aperfeicoamento: "Aperfeiçoamento",
  lato_sensu: "Especialização (pós lato sensu)",
  mestrado: "Mestrado (stricto sensu)",
  doutorado: "Doutorado (stricto sensu)",
  evento: "Congresso, oficina ou evento",
  webinar: "Webinar",
  bolsa: "Bolsa",
  programa: "Programa de formação docente",
  selecao_academica: "Processo seletivo acadêmico",
} as const;

export const MODALIDADES_CURSO = { presencial: "Presencial", ead: "A distância", hibrido: "Híbrido" } as const;

/**
 * Diferenças entre os tipos, em linguagem simples. Mantido genérico de propósito:
 * a validade de cada certificado depende da instituição e deve ser conferida.
 */
export const GUIA_TIPOS: { titulo: string; texto: string }[] = [
  { titulo: "Curso livre", texto: "Não depende de autorização do MEC e não equivale a pós-graduação. Pode contar como formação continuada, conforme as regras de cada rede de ensino." },
  { titulo: "Extensão universitária", texto: "Oferecida por instituições de ensino superior para o público externo. O certificado é emitido pela instituição." },
  { titulo: "Especialização (lato sensu)", texto: "Pós-graduação com carga mínima de 360 horas, oferecida por instituição credenciada. Confira o credenciamento no cadastro e-MEC." },
  { titulo: "Mestrado e doutorado (stricto sensu)", texto: "Para o diploma ter validade nacional, o programa precisa ser reconhecido pela CAPES e homologado pelo MEC. Confira na Plataforma Sucupira." },
];

export const LINKS_CONFERENCIA = [
  { nome: "Cadastro e-MEC (instituições e cursos)", url: "https://emec.mec.gov.br/" },
  { nome: "Plataforma Sucupira (programas de pós-graduação)", url: "https://sucupira.capes.gov.br/" },
];
