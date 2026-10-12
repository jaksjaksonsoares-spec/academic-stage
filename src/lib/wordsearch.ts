import { seededRandom } from "./random";

export type Direction = "horizontal" | "vertical" | "diagonal" | "reversas";

export type WordSearch = {
  grid: string[][];
  placed: { word: string; display: string; row: number; col: number; dr: number; dc: number }[];
  skipped: string[];
};

/** Normaliza para o tabuleiro: sem acentos, sem espaços, maiúsculas. */
export function toGridWord(w: string): string {
  return w.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Gera um caça-palavras. Palavras que não couberem ficam em `skipped`,
 * para a interface avisar em vez de sumir com elas.
 */
export function generateWordSearch(words: string[], opts: { size: number; directions: Direction[]; seed: number }): WordSearch {
  const rnd = seededRandom(opts.seed);
  const size = Math.max(6, Math.min(20, opts.size));
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  const dirs: [number, number][] = [];
  if (opts.directions.includes("horizontal")) dirs.push([0, 1]);
  if (opts.directions.includes("vertical")) dirs.push([1, 0]);
  if (opts.directions.includes("diagonal")) dirs.push([1, 1], [-1, 1]);
  if (opts.directions.includes("reversas")) {
    for (const [dr, dc] of [...dirs]) dirs.push([-dr, -dc]);
  }
  if (dirs.length === 0) dirs.push([0, 1]);

  const unique = [...new Map(words.map((w) => [toGridWord(w), w.trim()])).entries()].filter(([g]) => g.length >= 2);
  // Palavras maiores primeiro: encaixam melhor.
  unique.sort((a, b) => b[0].length - a[0].length);

  const placed: WordSearch["placed"] = [];
  const skipped: string[] = [];

  for (const [word, display] of unique) {
    let done = false;
    for (let attempt = 0; attempt < 400 && !done; attempt++) {
      const [dr, dc] = dirs[Math.floor(rnd() * dirs.length)];
      const row = Math.floor(rnd() * size);
      const col = Math.floor(rnd() * size);
      const endR = row + dr * (word.length - 1);
      const endC = col + dc * (word.length - 1);
      if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const cell = grid[row + dr * i][col + dc * i];
        if (cell !== null && cell !== word[i]) { fits = false; break; }
      }
      if (!fits) continue;
      for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i];
      placed.push({ word, display, row, col, dr, dc });
      done = true;
    }
    if (!done) skipped.push(display);
  }

  const filled = grid.map((r) => r.map((c) => c ?? ALPHABET[Math.floor(rnd() * ALPHABET.length)]));
  return { grid: filled, placed, skipped };
}
