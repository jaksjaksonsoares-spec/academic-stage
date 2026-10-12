/**
 * Detecta dados pessoais óbvios em textos enviados à IA. Não é infalível:
 * serve como trava para erros comuns (colar CPF, telefone, e-mail ou data de
 * nascimento de estudantes). A interface também orienta a não incluir nomes.
 */
export type Achado = { tipo: "cpf" | "email" | "telefone" | "nascimento" | "rg" | "matricula"; trecho: string };

const PADROES: { tipo: Achado["tipo"]; re: RegExp }[] = [
  { tipo: "cpf", re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g },
  { tipo: "email", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { tipo: "telefone", re: /(?:\(?\b\d{2}\)?\s?)9?\d{4}[-\s]?\d{4}\b/g },
  { tipo: "nascimento", re: /\b(nascid[oa]|nasc\.?|data de nascimento|d\.?\s?n\.?)\s*(em|:)?\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/gi },
  { tipo: "rg", re: /\bRG\s*(n[ºo°.]*)?\s*:?\s*[\d.\-xX]{6,14}\b/g },
  { tipo: "matricula", re: /\bmatr[íi]cula\s*(n[ºo°.]*)?\s*:?\s*\d{4,}\b/gi },
];

export function detectarDadosPessoais(texto: string): Achado[] {
  const out: Achado[] = [];
  for (const { tipo, re } of PADROES) {
    for (const m of texto.matchAll(re)) {
      // Datas soltas como "11/2026" ou números de lei não devem disparar telefone.
      if (tipo === "telefone" && /\b(lei|art|§|decreto|resolu)/i.test(texto.slice(Math.max(0, (m.index ?? 0) - 15), m.index))) continue;
      out.push({ tipo, trecho: m[0] });
    }
  }
  return out;
}

export const NOMES_ACHADO: Record<Achado["tipo"], string> = {
  cpf: "CPF",
  email: "e-mail",
  telefone: "telefone",
  nascimento: "data de nascimento",
  rg: "RG",
  matricula: "número de matrícula",
};

export function descreverAchados(a: Achado[]): string {
  const tipos = [...new Set(a.map((x) => NOMES_ACHADO[x.tipo]))];
  return `Parece haver ${tipos.join(", ")} no texto. Remova dados pessoais de estudantes antes de enviar.`;
}
