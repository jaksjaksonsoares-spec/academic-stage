/**
 * Geração de cronograma de estudos e revisões espaçadas. Lógica pura e
 * determinística: mesmas entradas, mesmo cronograma.
 */

export type Topico = { id: string; materia: string; topico: string };

export type SessaoGerada = {
  data: string; // AAAA-MM-DD
  topico_id: string;
  materia: string;
  topico: string;
  tipo: "estudo" | "revisao" | "revisao_geral";
  minutos_planejados: number;
};

export type ParametrosCronograma = {
  topicos: Topico[];
  inicio: string;
  dataProva: string | null;
  diasSemana: number[]; // 0 = domingo
  minutosDia: number;
  minutosSessao: number;
};

/** Dias depois do estudo em que cada revisão acontece. */
export const INTERVALOS_REVISAO = [1, 7, 30];
export const MINUTOS_REVISAO = 15;
/** Sem data de prova, o cronograma cobre este número de semanas. */
export const SEMANAS_SEM_PROVA = 12;

export function addDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diaDaSemana(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** Intercala matérias para não estudar a mesma várias vezes seguidas. */
export function intercalar(topicos: Topico[]): Topico[] {
  const porMateria = new Map<string, Topico[]>();
  for (const t of topicos) porMateria.set(t.materia, [...(porMateria.get(t.materia) ?? []), t]);
  const filas = [...porMateria.values()];
  const out: Topico[] = [];
  while (out.length < topicos.length) for (const f of filas) if (f.length) out.push(f.shift()!);
  return out;
}

export type ResultadoCronograma = { sessoes: SessaoGerada[]; avisos: string[]; diasDisponiveis: number; topicosSemTempo: number };

export function gerarCronograma(p: ParametrosCronograma): ResultadoCronograma {
  const avisos: string[] = [];
  const fim = p.dataProva ? addDias(p.dataProva, -1) : addDias(p.inicio, SEMANAS_SEM_PROVA * 7 - 1);
  const dias: string[] = [];
  for (let d = p.inicio; d <= fim && dias.length < 800; d = addDias(d, 1)) if (p.diasSemana.includes(diaDaSemana(d))) dias.push(d);

  if (dias.length === 0) return { sessoes: [], avisos: ["Não há dias de estudo entre o início e a prova. Revise as datas ou os dias da semana."], diasDisponiveis: 0, topicosSemTempo: p.topicos.length };

  // Reserva os últimos dias (até 15%) para revisão geral quando há prova marcada.
  const reservaGeral = p.dataProva ? Math.min(Math.floor(dias.length * 0.15), 10) : 0;
  const diasEstudo = dias.slice(0, dias.length - reservaGeral);
  const usado = new Map<string, number>(); // minutos já ocupados por dia
  const sessoes: SessaoGerada[] = [];

  const ocupar = (dia: string, min: number) => usado.set(dia, (usado.get(dia) ?? 0) + min);
  const livre = (dia: string) => p.minutosDia - (usado.get(dia) ?? 0);

  const fila = intercalar(p.topicos);
  let idx = 0;
  let semTempo = 0;
  for (const t of fila) {
    // Próximo dia de estudo com tempo para uma sessão completa.
    while (idx < diasEstudo.length && livre(diasEstudo[idx]) < p.minutosSessao) idx++;
    if (idx >= diasEstudo.length) { semTempo++; continue; }
    const dia = diasEstudo[idx];
    sessoes.push({ data: dia, topico_id: t.id, materia: t.materia, topico: t.topico, tipo: "estudo", minutos_planejados: p.minutosSessao });
    ocupar(dia, p.minutosSessao);

    // Revisões espaçadas no primeiro dia disponível a partir do intervalo.
    for (const n of INTERVALOS_REVISAO) {
      const alvo = addDias(dia, n);
      const diaRev = dias.find((d) => d >= alvo && livre(d) >= MINUTOS_REVISAO);
      if (!diaRev) continue;
      sessoes.push({ data: diaRev, topico_id: t.id, materia: t.materia, topico: t.topico, tipo: "revisao", minutos_planejados: MINUTOS_REVISAO });
      ocupar(diaRev, MINUTOS_REVISAO);
    }
  }

  // Revisão geral por matéria nos dias reservados.
  if (reservaGeral > 0) {
    const materias = [...new Set(p.topicos.map((t) => t.materia))];
    dias.slice(dias.length - reservaGeral).forEach((dia, i) => {
      const materia = materias[i % Math.max(1, materias.length)] ?? "Geral";
      const min = Math.min(p.minutosDia, p.minutosSessao * 2);
      sessoes.push({ data: dia, topico_id: `geral-${i}`, materia, topico: `Revisão geral de ${materia}`, tipo: "revisao_geral", minutos_planejados: min });
    });
  }

  if (semTempo > 0) avisos.push(`${semTempo} ${semTempo === 1 ? "tópico ficou" : "tópicos ficaram"} sem horário. Aumente o tempo por dia, inclua mais dias da semana ou reduza a duração das sessões.`);
  if (!p.dataProva) avisos.push(`Sem data de prova, o cronograma cobre ${SEMANAS_SEM_PROVA} semanas.`);

  sessoes.sort((a, b) => a.data.localeCompare(b.data) || ordemTipo(a.tipo) - ordemTipo(b.tipo));
  return { sessoes, avisos, diasDisponiveis: dias.length, topicosSemTempo: semTempo };
}

function ordemTipo(t: SessaoGerada["tipo"]) {
  return t === "revisao" ? 0 : t === "estudo" ? 1 : 2;
}

/* ── Flashcards: caixas de Leitner ─────────────────────────────────── */

export const INTERVALOS_CAIXA = [1, 2, 4, 8, 16]; // dias até a próxima revisão por caixa

export function responderCartao(caixa: number, acertou: boolean, hoje: string): { caixa: number; proxima_revisao: string } {
  const nova = acertou ? Math.min(5, caixa + 1) : 1;
  return { caixa: nova, proxima_revisao: addDias(hoje, INTERVALOS_CAIXA[nova - 1]) };
}

/* ── Relatórios ────────────────────────────────────────────────────── */

export type SessaoRegistro = { data: string; materia: string; tipo: string; concluida: boolean; minutos_planejados: number; minutos_estudados: number | null; dificuldade: number | null };

export function inicioDaSemana(iso: string): string {
  const d = diaDaSemana(iso);
  return addDias(iso, -((d + 6) % 7)); // semana começa na segunda
}

export function resumoPorMateria(sessoes: SessaoRegistro[]) {
  const m = new Map<string, { materia: string; planejadas: number; concluidas: number; minutos: number; dificeis: number }>();
  for (const s of sessoes) {
    const r = m.get(s.materia) ?? { materia: s.materia || "Sem matéria", planejadas: 0, concluidas: 0, minutos: 0, dificeis: 0 };
    r.planejadas++;
    if (s.concluida) { r.concluidas++; r.minutos += s.minutos_estudados ?? s.minutos_planejados; }
    if (s.dificuldade === 3) r.dificeis++;
    m.set(s.materia, r);
  }
  return [...m.values()].sort((a, b) => b.dificeis - a.dificeis || a.materia.localeCompare(b.materia, "pt-BR"));
}

export function minutosNaSemana(sessoes: SessaoRegistro[], hoje: string): { estudados: number; planejados: number } {
  const ini = inicioDaSemana(hoje);
  const fim = addDias(ini, 6);
  let estudados = 0, planejados = 0;
  for (const s of sessoes) {
    if (s.data < ini || s.data > fim) continue;
    planejados += s.minutos_planejados;
    if (s.concluida) estudados += s.minutos_estudados ?? s.minutos_planejados;
  }
  return { estudados, planejados };
}
