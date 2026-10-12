import { afterEach, describe, expect, it } from "vitest";
import { IAError, iaConfigurada, montarSecoesIA, streamAssistente, textoDoStream } from "@/lib/ia";
import { ipPrivado, lerHtml, validarUrlPublica, UrlRecusadaError } from "@/lib/url-segura";

function sse(eventos: object[]): ReadableStream<Uint8Array> {
  const txt = eventos.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join("");
  const bytes = new TextEncoder().encode(txt);
  // Entrega em pedaços pequenos para testar a remontagem.
  return new ReadableStream({
    start(c) {
      for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.subarray(i, i + 7));
      c.close();
    },
  });
}

const delta = (text: string) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });

describe("streaming da IA", () => {
  it("junta só os pedaços de texto, ignorando outros eventos", async () => {
    let out = "";
    for await (const t of textoDoStream(sse([{ type: "message_start" }, { type: "ping" }, delta("Olá, "), delta("professor."), { type: "message_stop" }]))) out += t;
    expect(out).toBe("Olá, professor.");
  });

  it("transforma evento de erro em exceção", async () => {
    const gen = textoDoStream(sse([delta("a"), { type: "error", error: { message: "overloaded" } }]));
    await expect((async () => { for await (const _ of gen) void _; })()).rejects.toBeInstanceOf(IAError);
  });
});

describe("chamada à API", () => {
  const original = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = original;
  });

  it("fica desativada sem chave", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(iaConfigurada()).toBe(false);
    await expect(streamAssistente([{ role: "user", content: "oi" }])).rejects.toBeInstanceOf(IAError);
  });

  it("envia cabeçalhos e prompt de sistema, e lê a resposta", async () => {
    process.env.ANTHROPIC_API_KEY = "teste";
    let enviado: { headers: Record<string, string>; body: { system: string; stream: boolean } } | null = null;
    const fetcher = (async (_url: string, init: RequestInit) => {
      enviado = { headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
      return new Response(sse([delta("ok")]), { status: 200 });
    }) as unknown as typeof fetch;
    let out = "";
    for await (const t of await streamAssistente([{ role: "user", content: "oi" }], { fetcher })) out += t;
    expect(out).toBe("ok");
    expect(enviado!.headers["x-api-key"]).toBe("teste");
    expect(enviado!.headers["anthropic-version"]).toBe("2023-06-01");
    expect(enviado!.body.stream).toBe(true);
    expect(enviado!.body.system).toContain("Nunca invente");
  });

  it("traduz erro 429 em mensagem clara", async () => {
    process.env.ANTHROPIC_API_KEY = "teste";
    const fetcher = (async () => new Response("{}", { status: 429 })) as unknown as typeof fetch;
    await expect(streamAssistente([{ role: "user", content: "oi" }], { fetcher })).rejects.toBeInstanceOf(IAError);
  });
});

describe("seções do edital com páginas citadas", () => {
  it("atribui páginas citadas à seção certa (fim exclusivo)", () => {
    const secoes = montarSecoesIA([
      { type: "text", text: "## Cargo pretendido\n" },
      { type: "text", text: "Professor de Inglês", citations: [{ type: "page_location", start_page_number: 2, end_page_number: 3 }] },
      { type: "text", text: "\n## Isenção de taxa\nPedido até 05/11.", citations: [{ type: "page_location", start_page_number: 4, end_page_number: 6 }] },
      { type: "text", text: "\n## Seção inventada\nignorar" },
    ]);
    expect(secoes.map((s) => s.id)).toEqual(["cargo", "isencao"]);
    expect(secoes[0]).toEqual({ id: "cargo", titulo: "Cargo pretendido", texto: "Professor de Inglês", paginas: [2] });
    expect(secoes[1].paginas).toEqual([4, 5]);
  });
});

describe("URLs seguras", () => {
  it.each(["10.0.0.1", "127.0.0.1", "192.168.1.10", "172.20.0.5", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "::ffff:127.0.0.1"])("bloqueia IP interno %j", (ip) => {
    expect(ipPrivado(ip)).toBe(true);
  });

  it("aceita IP público", () => {
    expect(ipPrivado("200.160.2.3")).toBe(false);
  });

  it.each(["http://exemplo.gov.br/edital.pdf", "https://127.0.0.1/x", "https://localhost/x", "https://user:senha@exemplo.gov.br", "https://exemplo.gov.br:8080/x", "ftp://x"])("recusa %j", async (u) => {
    await expect(validarUrlPublica(u)).rejects.toBeInstanceOf(UrlRecusadaError);
  });

  it("lê texto e links de PDF de uma página", () => {
    const r = lerHtml(
      `<html><head><title>Edital 01/2026</title><script>alert(1)</script></head><body><p>Inscrições até 30/11/2026</p><a href="/arquivos/edital.pdf">Edital completo</a><a href="http://inseguro/x.pdf">x</a></body></html>`,
      "https://prefeitura.exemplo.gov.br/concurso",
    );
    expect(r.titulo).toBe("Edital 01/2026");
    expect(r.texto).toContain("Inscrições até 30/11/2026");
    expect(r.texto.includes("alert")).toBe(false);
    expect(r.pdfs).toEqual([{ href: "https://prefeitura.exemplo.gov.br/arquivos/edital.pdf", texto: "Edital completo" }]);
  });
});
