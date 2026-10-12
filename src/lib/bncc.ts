/**
 * Validação do FORMATO dos códigos alfanuméricos da BNCC e da compatibilidade
 * com a etapa. Não confirma que o código existe: a plataforma não guarda o
 * texto das habilidades e nunca sugere códigos. O professor copia código e
 * descrição do documento oficial; aqui só se evita erro de digitação ou de etapa.
 *
 * Estrutura oficial:
 *  - Educação Infantil: EI + grupo etário (01, 02, 03) + campo de experiência + nº  → EI03EF01
 *  - Ensino Fundamental: EF + ano(s) + componente + nº                              → EF67LP01
 *  - Ensino Médio: EM13 + área (LGG, MAT, CNT, CHS) + nº de 3 dígitos, ou LP + 2   → EM13MAT101, EM13LP01
 */

export const CAMPOS_EI = ["EO", "CG", "TS", "EF", "ET"] as const;
export const COMPONENTES_EF = ["LP", "AR", "EF", "LI", "MA", "CI", "GE", "HI", "ER"] as const;
export const BLOCOS_EF = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "12", "15", "35", "67", "69", "89"] as const;

export type Etapa = "EI" | "EF" | "EM";

export type BnccCheck =
  | { ok: true; etapa: Etapa; codigo: string; anos?: number[] }
  | { ok: false; codigo: string; motivo: string };

function anosDoBloco(b: string): number[] {
  const a = Number(b[0]);
  const z = Number(b[1]);
  if (a === 0) return [z];
  const out: number[] = [];
  for (let i = a; i <= z; i++) out.push(i);
  return out;
}

export function checarCodigoBncc(raw: string): BnccCheck {
  const codigo = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!codigo) return { ok: false, codigo, motivo: "Código vazio." };

  const ei = /^EI(0[1-3])([A-Z]{2})(\d{2})$/.exec(codigo);
  if (ei) {
    if (!(CAMPOS_EI as readonly string[]).includes(ei[2])) return { ok: false, codigo, motivo: `Campo de experiência “${ei[2]}” não existe na BNCC.` };
    return { ok: true, etapa: "EI", codigo };
  }

  const ef = /^EF(\d{2})([A-Z]{2})(\d{2})$/.exec(codigo);
  if (ef) {
    if (!(BLOCOS_EF as readonly string[]).includes(ef[1])) return { ok: false, codigo, motivo: `“${ef[1]}” não é um ano ou bloco de anos usado na BNCC.` };
    if (!(COMPONENTES_EF as readonly string[]).includes(ef[2])) return { ok: false, codigo, motivo: `Componente “${ef[2]}” não existe no Ensino Fundamental da BNCC.` };
    return { ok: true, etapa: "EF", codigo, anos: anosDoBloco(ef[1]) };
  }

  if (/^EM13(LGG|MAT|CNT|CHS)\d{3}$/.test(codigo) || /^EM13LP\d{2}$/.test(codigo)) {
    return { ok: true, etapa: "EM", codigo };
  }

  return { ok: false, codigo, motivo: "Formato não reconhecido. Exemplos: EI03EF01, EF67LP01, EM13MAT101." };
}

/** Confere se o código combina com a etapa e o ano do plano. */
export function compativelComTurma(check: BnccCheck, etapa: Etapa | null, ano: number | null): string | null {
  if (!check.ok || !etapa) return null;
  if (check.etapa !== etapa) {
    const nomes = { EI: "Educação Infantil", EF: "Ensino Fundamental", EM: "Ensino Médio" };
    return `${check.codigo} é da ${nomes[check.etapa]}, mas o plano é de ${nomes[etapa]}.`;
  }
  if (check.etapa === "EF" && ano && check.anos && !check.anos.includes(ano)) {
    return `${check.codigo} vale para o ${check.anos.join("º, ")}º ano, não para o ${ano}º.`;
  }
  return null;
}
