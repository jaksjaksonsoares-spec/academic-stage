import { toGridWord } from "./wordsearch";

export type CrosswordEntry = { answer: string; clue: string };
export type PlacedEntry = CrosswordEntry & { word: string; row: number; col: number; across: boolean; number: number };
export type Crossword = { rows: number; cols: number; cells: (string | null)[][]; entries: PlacedEntry[]; skipped: CrosswordEntry[] };

type Cell = Map<string, string>;
const key = (r: number, c: number) => `${r},${c}`;

/**
 * Monta uma cruzadinha por encaixe guloso: cada palavra precisa cruzar uma já
 * colocada, sem encostar lado a lado em outras. Palavras sem encaixe vão para
 * `skipped` e a interface avisa o professor.
 */
export function generateCrossword(input: CrosswordEntry[]): Crossword {
  const items = input
    .map((e) => ({ ...e, word: toGridWord(e.answer) }))
    .filter((e) => e.word.length >= 2 && e.clue.trim())
    .sort((a, b) => b.word.length - a.word.length);

  const grid: Cell = new Map();
  const placed: Omit<PlacedEntry, "number">[] = [];
  const skipped: CrosswordEntry[] = [];

  const get = (r: number, c: number) => grid.get(key(r, c));

  function canPlace(word: string, r: number, c: number, across: boolean): number {
    const dr = across ? 0 : 1;
    const dc = across ? 1 : 0;
    // Antes e depois da palavra precisam estar vazios.
    if (get(r - dr, c - dc) || get(r + dr * word.length, c + dc * word.length)) return -1;
    let crossings = 0;
    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const existing = get(rr, cc);
      if (existing) {
        if (existing !== word[i]) return -1;
        crossings++;
      } else {
        // Vizinhos laterais vazios para não formar palavras acidentais.
        if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return -1;
      }
    }
    return crossings;
  }

  function place(word: string, r: number, c: number, across: boolean) {
    for (let i = 0; i < word.length; i++) grid.set(key(r + (across ? 0 : i), c + (across ? i : 0)), word[i]);
  }

  for (const item of items) {
    if (placed.length === 0) {
      place(item.word, 0, 0, true);
      placed.push({ answer: item.answer, clue: item.clue, word: item.word, row: 0, col: 0, across: true });
      continue;
    }
    let best: { r: number; c: number; across: boolean; score: number } | null = null;
    for (const p of placed) {
      for (let i = 0; i < p.word.length; i++) {
        for (let j = 0; j < item.word.length; j++) {
          if (p.word[i] !== item.word[j]) continue;
          const across = !p.across;
          const r = p.across ? p.row - j : p.row + i;
          const c = p.across ? p.col + i : p.col - j;
          const score = canPlace(item.word, r, c, across);
          if (score > 0 && (!best || score > best.score)) best = { r, c, across, score };
        }
      }
    }
    if (best) {
      place(item.word, best.r, best.c, best.across);
      placed.push({ answer: item.answer, clue: item.clue, word: item.word, row: best.r, col: best.c, across: best.across });
    } else {
      skipped.push({ answer: item.answer, clue: item.clue });
    }
  }

  if (placed.length === 0) return { rows: 0, cols: 0, cells: [], entries: [], skipped };

  // Normaliza coordenadas para começar em 0,0.
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const k of grid.keys()) {
    const [r, c] = k.split(",").map(Number);
    minR = Math.min(minR, r); minC = Math.min(minC, c); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
  }
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const cells: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const [k, v] of grid) {
    const [r, c] = k.split(",").map(Number);
    cells[r - minR][c - minC] = v;
  }

  // Numeração na ordem de leitura; palavras que começam na mesma casa dividem o número.
  const starts = [...new Set(placed.map((p) => key(p.row - minR, p.col - minC)))].sort((a, b) => {
    const [ar, ac] = a.split(",").map(Number);
    const [br, bc] = b.split(",").map(Number);
    return ar - br || ac - bc;
  });
  const numberOf = new Map(starts.map((s, i) => [s, i + 1]));
  const entries: PlacedEntry[] = placed.map((p) => {
    const row = p.row - minR;
    const col = p.col - minC;
    return { ...p, row, col, number: numberOf.get(key(row, col))! };
  });
  entries.sort((a, b) => a.number - b.number || Number(b.across) - Number(a.across));

  return { rows, cols, cells, entries, skipped };
}
