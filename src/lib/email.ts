import "server-only";

/**
 * Envio de e-mails transacionais pela API da Resend, só no servidor.
 * O resultado só é "enviado" quando o provedor devolve o id da mensagem.
 */
export type ResultadoEnvio =
  | { status: "enviado"; id: string }
  | { status: "falhou"; erro: string }
  | { status: "nao_configurado" };

export type Anexo = { filename: string; content: string /* base64 */ };

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function destinoSuporte(): string | null {
  const v = process.env.SUPPORT_EMAIL_TO?.trim();
  return v && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? v : null;
}

export async function enviarEmail(
  msg: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string; attachments?: Anexo[] },
  fetcher: typeof fetch = fetch,
): Promise<ResultadoEnvio> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { status: "nao_configurado" };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const r = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        ...(msg.attachments?.length ? { attachments: msg.attachments } : {}),
      }),
      signal: ctrl.signal,
    });
    const body = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (r.ok && typeof body.id === "string" && body.id) return { status: "enviado", id: body.id };
    return { status: "falhou", erro: `HTTP ${r.status}${body.message ? ` — ${body.message.slice(0, 200)}` : ""}` };
  } catch {
    return { status: "falhou", erro: "sem resposta do provedor" };
  } finally {
    clearTimeout(t);
  }
}

/** Escapa texto para HTML de e-mail. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Modelo simples, legível em qualquer cliente de e-mail. */
export function modeloEmail(titulo: string, paragrafos: string[], rodape = "AcademiC Stage — plataforma para profissionais da educação"): { html: string; text: string } {
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0a1a3f">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#0a1a3f;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-weight:bold;font-size:18px">AcademiC Stage</div>
<div style="background:#fff;padding:24px 20px;border-radius:0 0 12px 12px">
<h1 style="font-size:20px;margin:0 0 16px">${esc(titulo)}</h1>
${paragrafos.map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px;white-space:pre-line">${esc(p)}</p>`).join("\n")}
</div>
<p style="font-size:12px;color:#4f5b78;margin:16px 4px">${esc(rodape)}</p>
</div></body></html>`;
  const text = [titulo, "", ...paragrafos, "", "—", rodape].join("\n");
  return { html, text };
}
