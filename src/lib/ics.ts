/** Gera um calendário .ics (RFC 5545) com eventos de dia inteiro. */
export type EventoDia = { uid: string; data: string; titulo: string; descricao?: string };

function escapar(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Quebra linhas com mais de 75 octetos, como pede a especificação. */
function dobrar(linha: string): string {
  const bytes = new TextEncoder().encode(linha);
  if (bytes.length <= 75) return linha;
  const partes: string[] = [];
  let atual = "";
  for (const ch of linha) {
    if (new TextEncoder().encode(atual + ch).length > (partes.length ? 74 : 75)) {
      partes.push(atual);
      atual = ch;
    } else atual += ch;
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

export function gerarIcs(nome: string, eventos: EventoDia[], agora = new Date()): string {
  const stamp = agora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AcademiC Stage//Estudos//PT-BR",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapar(nome)}`,
  ];
  for (const e of eventos) {
    const ini = e.data.replace(/-/g, "");
    const d = new Date(`${e.data}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    const fim = d.toISOString().slice(0, 10).replace(/-/g, "");
    linhas.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@academicstage`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ini}`,
      `DTEND;VALUE=DATE:${fim}`,
      `SUMMARY:${escapar(e.titulo)}`,
      ...(e.descricao ? [`DESCRIPTION:${escapar(e.descricao)}`] : []),
      "END:VEVENT",
    );
  }
  linhas.push("END:VCALENDAR");
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}
