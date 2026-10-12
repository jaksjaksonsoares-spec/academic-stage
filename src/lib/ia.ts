/**
 * Integração com a API da Anthropic, feita só no servidor. A chave fica em
 * ANTHROPIC_API_KEY e nunca chega ao navegador. Sem chave, as funções de IA
 * ficam visivelmente desativadas — nada é simulado.
 */
import { TOPICOS, type ResultadoEdital, type TopicoId } from "./edital-analise";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function modeloIA(): string {
  return process.env.AI_MODEL || "claude-sonnet-5-5";
}

export class IAError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type Bloco = { type: "text"; text: string } | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string }; title?: string; citations?: { enabled: boolean } };
export type MensagemIA = { role: "user" | "assistant"; content: string | Bloco[] };

async function chamar(body: Record<string, unknown>, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new IAError("IA não configurada.", 503);
  const r = await fetcher(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": API_VERSION },
    body: JSON.stringify({ model: modeloIA(), ...body }),
    signal,
  });
  if (!r.ok) {
    const msg =
      r.status === 429 ? "O serviço de IA está com muitas solicitações. Tente em alguns instantes."
      : r.status === 529 || r.status >= 500 ? "O serviço de IA está indisponível agora. Tente novamente mais tarde."
      : r.status === 401 ? "A chave da IA é inválida. Avise o administrador."
      : r.status === 413 ? "O arquivo é grande demais para a análise com IA."
      : "Não foi possível obter a resposta da IA.";
    throw new IAError(msg, r.status);
  }
  return r;
}

/* ── Assistente ───────────────────────────────────────────────────── */

export const SISTEMA_ASSISTENTE = `Você é o assistente pedagógico do AcademiC Stage, para professores e profissionais da educação no Brasil.

Como responder:
- Escreva em português do Brasil, com clareza e objetividade, em texto simples com títulos curtos e listas quando ajudar.
- Se faltar informação essencial (etapa, ano, componente, duração, objetivo), pergunte antes de produzir o material.
- Separe claramente, com estes rótulos quando couber: "Fato verificável" (o que vem de lei, norma ou documento oficial, citando qual) e "Sugestão pedagógica" (sua proposta).
- Nunca invente leis, artigos, códigos da BNCC, referências bibliográficas ou links. Se não tiver certeza de um código da BNCC, diga que o professor deve consultá-lo no documento oficial em vez de escrever um código.
- Para concursos e editais, lembre que o edital oficial prevalece e que sua leitura não é orientação jurídica.
- Não peça nem use dados pessoais de estudantes (nome, CPF, laudos, diagnósticos, endereço). Se o professor os mencionar, oriente a descrever apenas barreiras e necessidades de forma anônima.
- Não faça diagnósticos de estudantes nem substitua profissionais especializados.
- Ao produzir material (plano, atividade, rubrica, comunicado), entregue algo pronto para revisão e uso.`;

/** Lê um corpo SSE e devolve apenas os pedaços de texto gerados. */
export async function* textoDoStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const evento = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = evento.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
      if (!data) continue;
      let ev: { type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };
      try { ev = JSON.parse(data); } catch { continue; }
      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) yield ev.delta.text;
      if (ev.type === "error") throw new IAError("A resposta da IA foi interrompida. Tente novamente.", 502);
    }
  }
}

export async function streamAssistente(mensagens: MensagemIA[], opts: { fetcher?: typeof fetch; signal?: AbortSignal } = {}) {
  const r = await chamar({ max_tokens: 4000, system: SISTEMA_ASSISTENTE, messages: mensagens, stream: true }, opts.fetcher, opts.signal);
  if (!r.body) throw new IAError("Resposta vazia da IA.", 502);
  return textoDoStream(r.body);
}

/* ── Análise de edital com citações de página ─────────────────────── */

const PROMPT_EDITAL = `Leia o edital anexado e organize as informações para um candidato a cargo na área da educação.

Responda exatamente com as seções abaixo, nesta ordem, cada uma começando com "## " seguido do título:
${TOPICOS.map((t) => `## ${t.titulo}`).join("\n")}

Regras:
- Use somente o que está escrito no edital. Não complete com conhecimento geral.
- Se o edital não tratar de um item, escreva apenas: "Não encontrado no edital."
- Em "Conteúdos cobrados", liste cada matéria em uma linha no formato "Matéria: tópico; tópico; tópico".
- Em "Datas importantes", liste uma data por linha no formato "DD/MM/AAAA — evento".
- Em "Pontos de atenção", destaque regras que eliminam o candidato ou prazos curtos.
- Seja fiel ao texto e conciso. Isto não é orientação jurídica.`;

type CitacaoPagina = { type: "page_location"; start_page_number: number; end_page_number: number };
type BlocoResposta = { type: string; text?: string; citations?: CitacaoPagina[] | null };

/**
 * Junta a resposta (texto intercalado com citações) em seções. As páginas
 * citadas em cada trecho são atribuídas à seção em que o trecho está.
 * Páginas: start é 1-indexada e end é exclusiva.
 */
export function montarSecoesIA(blocos: BlocoResposta[]): NonNullable<ResultadoEdital["resumoIA"]> {
  const porTitulo = new Map(TOPICOS.map((t) => [t.titulo.toLowerCase(), t.id]));
  type Sec = { id: TopicoId; titulo: string; texto: string; paginas: Set<number> };
  const secoes: Sec[] = [];
  let atual: Sec | null = null;

  for (const b of blocos) {
    if (b.type !== "text" || !b.text) continue;
    const partes = b.text.split(/^##\s+/m);
    for (let k = 0; k < partes.length; k++) {
      const parte = partes[k];
      if (k === 0) {
        if (atual) atual.texto += parte;
        continue;
      }
      const [linha1, ...resto] = parte.split("\n");
      const titulo = linha1.trim();
      const id = porTitulo.get(titulo.toLowerCase());
      if (id) {
        atual = { id, titulo, texto: "", paginas: new Set() };
        secoes.push(atual);
      }
      if (atual) atual.texto += resto.join("\n");
    }
    if (atual && b.citations) {
      for (const c of b.citations) {
        if (c.type !== "page_location") continue;
        for (let pg = c.start_page_number; pg < Math.max(c.end_page_number, c.start_page_number + 1); pg++) atual.paginas.add(pg);
      }
    }
  }

  return secoes.map((s) => ({ id: s.id, titulo: s.titulo, texto: s.texto.trim(), paginas: [...s.paginas].sort((a, b) => a - b) }));
}

export async function analisarEditalComIA(pdfBase64: string, titulo: string, fetcher?: typeof fetch) {
  const r = await chamar(
    {
      max_tokens: 6000,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }, title: titulo.slice(0, 200), citations: { enabled: true } },
            { type: "text", text: PROMPT_EDITAL },
          ],
        },
      ],
    },
    fetcher,
  );
  const json = (await r.json()) as { content?: BlocoResposta[]; stop_reason?: string };
  const secoes = montarSecoesIA(json.content ?? []);
  return { secoes, truncada: json.stop_reason === "max_tokens" };
}
