import { afterEach, describe, expect, it } from "vitest";
import { gerarProtocolo, gerarTokenFormulario, nomeSeguro, pareceSpam, tipoPorAssinatura, verificarTokenFormulario, TEMPO_MINIMO_MS } from "@/lib/suporte";
import { enviarEmail, esc, modeloEmail } from "@/lib/email";
import { avisosDePrazo, avisoDeEstudos, enviaEmailHoje, filtrarPorTopicos } from "@/lib/notificacoes";

describe("protocolo", () => {
  it("segue o formato AS-AAAAMMDD-XXXXXX no fuso de São Paulo", () => {
    const p = gerarProtocolo(new Date("2026-10-13T01:30:00Z"), () => Buffer.from([0, 1, 2, 3, 31, 32]));
    expect(p).toBe("AS-20261012-ABCD9A");
  });

  it("varia entre chamadas", () => {
    const a = new Set(Array.from({ length: 50 }, () => gerarProtocolo()));
    expect(a.size).toBe(50);
  });
});

describe("anexos", () => {
  it("identifica pelo conteúdo, não pela extensão", () => {
    expect(tipoPorAssinatura(new TextEncoder().encode("%PDF-1.7"))?.ext).toBe("pdf");
    expect(tipoPorAssinatura(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe("png");
    expect(tipoPorAssinatura(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(tipoPorAssinatura(new TextEncoder().encode("MZ executável"))).toBe(null);
    expect(tipoPorAssinatura(new TextEncoder().encode("<svg onload=alert(1)>"))).toBe(null);
  });

  it("gera nomes seguros", () => {
    expect(nomeSeguro("../../etc/Relatório final.pdf.exe", "pdf")).toBe("etcRelatorio-finalpdf.pdf");
    expect(nomeSeguro("???", "png")).toBe("anexo.png");
  });
});

describe("antispam", () => {
  const segredo = "segredo-de-teste";
  it("aceita token válido depois do tempo mínimo", () => {
    const t = gerarTokenFormulario(segredo, 1_000_000);
    expect(verificarTokenFormulario(t, segredo, 1_000_000 + TEMPO_MINIMO_MS + 1)).toBe("ok");
  });
  it("recusa envio instantâneo, token alterado e token velho", () => {
    const t = gerarTokenFormulario(segredo, 1_000_000);
    expect(verificarTokenFormulario(t, segredo, 1_000_500)).toBe("rapido");
    expect(verificarTokenFormulario(t.replace(/.$/, "x"), segredo, 1_010_000)).toBe("invalido");
    expect(verificarTokenFormulario("2000000.abc", segredo, 2_010_000)).toBe("invalido");
    expect(verificarTokenFormulario(t, segredo, 1_000_000 + 3 * 60 * 60 * 1000)).toBe("expirado");
  });
  it("sinaliza spam óbvio", () => {
    expect(pareceSpam("compre viagra agora")).toBe(true);
    expect(pareceSpam("Não consigo exportar a prova para o Word")).toBe(false);
  });
});

describe("e-mail", () => {
  const backup = { k: process.env.RESEND_API_KEY, f: process.env.EMAIL_FROM };
  afterEach(() => {
    if (backup.k === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = backup.k;
    if (backup.f === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = backup.f;
  });

  it("não envia nem finge envio sem configuração", async () => {
    delete process.env.RESEND_API_KEY;
    expect(await enviarEmail({ to: "a@b.com", subject: "x", html: "x", text: "x" })).toEqual({ status: "nao_configurado" });
  });

  it("só considera enviado com o id do provedor", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_FROM = "AcademiC Stage <nao-responda@exemplo.com.br>";
    let corpo: Record<string, unknown> = {};
    const ok = (async (_u: string, init: RequestInit) => {
      corpo = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ id: "abc-123" }), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await enviarEmail({ to: "a@b.com", subject: "Oi", html: "<p>x</p>", text: "x", replyTo: "c@d.com" }, ok)).toEqual({ status: "enviado", id: "abc-123" });
    expect(corpo.reply_to).toBe("c@d.com");

    const semId = (async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
    expect((await enviarEmail({ to: "a@b.com", subject: "Oi", html: "x", text: "x" }, semId)).status).toBe("falhou");
    const erro = (async () => new Response(JSON.stringify({ message: "domínio não verificado" }), { status: 403 })) as unknown as typeof fetch;
    expect(await enviarEmail({ to: "a@b.com", subject: "Oi", html: "x", text: "x" }, erro)).toEqual({ status: "falhou", erro: "HTTP 403 — domínio não verificado" });
  });

  it("escapa conteúdo do usuário no HTML", () => {
    expect(esc(`<script>"x"&'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
    expect(modeloEmail("Título", ["<b>oi</b>"]).html).toContain("&lt;b&gt;oi&lt;/b&gt;");
  });
});

describe("notificações", () => {
  const c = (fim: string | null, prova: string | null) => ({ id: "c1", slug: "s", titulo: "Concurso X", inscricao_fim: fim, data_prova: prova });

  it("avisa fim de inscrição em até 3 dias e prova em até 7 dias", () => {
    const a = avisosDePrazo([c("2026-10-14", "2026-10-19")], "2026-10-12");
    expect(a.map((x) => x.titulo)).toEqual(["Inscrições terminam em 2 dias", "Prova em 7 dias"]);
    expect(a[0].chave).toBe("inscricao:c1:2026-10-14");
    expect(avisosDePrazo([c("2026-10-20", "2026-10-11")], "2026-10-12")).toEqual([]);
    expect(avisosDePrazo([c("2026-10-12", null)], "2026-10-12")[0].titulo).toBe("Inscrições terminam hoje");
  });

  it("respeita tópicos e frequência", () => {
    const p = { email_enabled: true, in_app_enabled: true, frequency: "semanal" as const, topics: ["estudos"] };
    const prazos = avisosDePrazo([c("2026-10-13", null)], "2026-10-12");
    const estudos = avisoDeEstudos(2, "2026-10-12");
    expect(filtrarPorTopicos(p, { prazos, estudos }).map((a) => a.chave)).toEqual(["estudos:2026-10-12"]);
    expect(enviaEmailHoje(p, "2026-10-12")).toBe(true); // segunda-feira
    expect(enviaEmailHoje(p, "2026-10-13")).toBe(false);
    expect(enviaEmailHoje({ ...p, frequency: "diaria" }, "2026-10-13")).toBe(true);
    expect(enviaEmailHoje({ ...p, email_enabled: false }, "2026-10-12")).toBe(false);
    expect(avisoDeEstudos(0, "2026-10-12")).toBe(null);
  });
});
