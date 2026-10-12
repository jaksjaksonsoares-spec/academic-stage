/**
 * Monta os avisos de cada pessoa a partir dos concursos que ela acompanha,
 * das sessões de estudo e das preferências. Lógica pura, testável.
 */
import { addDias, diaDaSemana } from "./estudos";

export type Preferencias = { email_enabled: boolean; in_app_enabled: boolean; frequency: "imediata" | "diaria" | "semanal"; topics: string[] };
export type ConcursoAcompanhado = { id: string; slug: string; titulo: string; inscricao_fim: string | null; data_prova: string | null };
export type Aviso = { chave: string; titulo: string; corpo: string; link: string };

export const DIAS_AVISO_INSCRICAO = 3;
export const DIAS_AVISO_PROVA = 7;

function dias(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);
}

function quando(n: number) {
  return n === 0 ? "hoje" : n === 1 ? "amanhã" : `em ${n} dias`;
}

export function avisosDePrazo(concursos: ConcursoAcompanhado[], hoje: string): Aviso[] {
  const out: Aviso[] = [];
  for (const c of concursos) {
    if (c.inscricao_fim) {
      const n = dias(hoje, c.inscricao_fim);
      if (n >= 0 && n <= DIAS_AVISO_INSCRICAO)
        out.push({ chave: `inscricao:${c.id}:${c.inscricao_fim}`, titulo: `Inscrições terminam ${quando(n)}`, corpo: `${c.titulo}. Confira o edital antes de se inscrever.`, link: `/concursos/${c.slug}` });
    }
    if (c.data_prova) {
      const n = dias(hoje, c.data_prova);
      if (n >= 0 && n <= DIAS_AVISO_PROVA)
        out.push({ chave: `prova:${c.id}:${c.data_prova}`, titulo: `Prova ${quando(n)}`, corpo: `${c.titulo}. Confira local e horário no edital ou no cartão de inscrição.`, link: `/concursos/${c.slug}` });
    }
  }
  return out;
}

export function avisoDeEstudos(sessoesHoje: number, hoje: string): Aviso | null {
  if (sessoesHoje <= 0) return null;
  return { chave: `estudos:${hoje}`, titulo: `${sessoesHoje} ${sessoesHoje === 1 ? "sessão de estudo" : "sessões de estudo"} para hoje`, corpo: "Veja o que estudar e revisar no seu plano.", link: "/estudos" };
}

/** Na frequência semanal, o e-mail sai só às segundas; diária e imediata, todo dia. */
export function enviaEmailHoje(p: Preferencias, hoje: string): boolean {
  if (!p.email_enabled) return false;
  return p.frequency !== "semanal" || diaDaSemana(hoje) === 1;
}

export function filtrarPorTopicos(p: Preferencias, avisos: { prazos: Aviso[]; estudos: Aviso | null }): Aviso[] {
  return [...(p.topics.includes("prazos") ? avisos.prazos : []), ...(p.topics.includes("estudos") && avisos.estudos ? [avisos.estudos] : [])];
}

export { addDias };
