"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { detectarDadosPessoais, descreverAchados } from "@/lib/dados-pessoais";
import { salvarRespostaIA } from "@/app/painel/documentos/actions";

type Msg = { role: "user" | "assistant"; content: string; salvoId?: string };

const SUGESTOES = [
  "Monte um plano de aula de 50 minutos sobre frações equivalentes para o 5º ano.",
  "Crie uma rubrica para avaliar produção de texto argumentativo no 9º ano.",
  "Escreva um comunicado aos responsáveis sobre a reunião de pais do bimestre.",
  "Sugira adaptações de uma atividade de leitura para um estudante com baixa visão.",
];

export function Chat({ restantesInicial, limite }: { restantesInicial: number; limite: number }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [restantes, setRestantes] = useState(restantesInicial);
  const fimRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { fimRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  const aviso = texto ? detectarDadosPessoais(texto) : [];

  async function enviar(conteudo: string) {
    const c = conteudo.trim();
    if (!c || enviando) return;
    const achados = detectarDadosPessoais(c);
    if (achados.length) return setErro(descreverAchados(achados));

    const historico: Msg[] = [...msgs, { role: "user", content: c }];
    setMsgs([...historico, { role: "assistant", content: "" }]);
    setTexto("");
    setErro(null);
    setEnviando(true);
    abortRef.current = new AbortController();

    try {
      const r = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico.slice(-20).map(({ role, content }) => ({ role, content })) }),
        signal: abortRef.current.signal,
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => ({ error: "Não foi possível responder agora." }));
        setMsgs(historico); // remove a bolha vazia
        setErro(j.error);
        return;
      }
      const resto = r.headers.get("X-Cota-Restante");
      if (resto) setRestantes(Number(resto));
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acumulado += dec.decode(value, { stream: true });
        setMsgs([...historico, { role: "assistant", content: acumulado }]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErro("A conexão caiu. Tente novamente.");
    } finally {
      setEnviando(false);
      abortRef.current = null;
    }
  }

  async function salvar(i: number) {
    const m = msgs[i];
    const pergunta = msgs[i - 1]?.content ?? "Resposta do assistente";
    const r = await salvarRespostaIA({ titulo: pergunta.slice(0, 80) + (pergunta.length > 80 ? "…" : ""), corpo: m.content });
    if (r.ok && r.id) setMsgs((ms) => ms.map((x, j) => (j === i ? { ...x, salvoId: r.id } : x)));
    else setErro(r.message ?? "Não foi possível salvar.");
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]">
      <div className="max-h-[65vh] min-h-64 overflow-y-auto p-4 sm:p-6" aria-live="polite" aria-busy={enviando}>
        {msgs.length === 0 && (
          <div>
            <p className="font-bold">Por onde começar</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SUGESTOES.map((s) => (
                <button key={s} type="button" onClick={() => setTexto(s)} className="rounded-[var(--radius-control)] border border-[var(--line)] p-3 text-left text-[0.95rem] hover:border-[var(--action)]">{s}</button>
              ))}
            </div>
          </div>
        )}
        <ol className="space-y-5">
          {msgs.map((m, i) => (
            <li key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <p className="max-w-[85%] whitespace-pre-line rounded-[var(--radius-card)] bg-[var(--color-ink)] px-4 py-3 text-white">{m.content}</p>
              ) : (
                <div>
                  <p className="mb-1 text-xs font-bold text-[var(--action)]">Assistente · conteúdo gerado por IA</p>
                  <div className="whitespace-pre-line text-[0.98rem] leading-relaxed">{m.content || <span className="text-[var(--muted)]">Escrevendo…</span>}</div>
                  {m.content && !(enviando && i === msgs.length - 1) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <button type="button" onClick={() => navigator.clipboard?.writeText(m.content)} className="font-bold text-[var(--action)]">Copiar</button>
                      {m.salvoId ? (
                        <Link href={`/painel/documentos/${m.salvoId}`} className="font-bold text-[var(--color-success)]">Salvo — abrir para editar e exportar</Link>
                      ) : (
                        <button type="button" onClick={() => salvar(i)} className="font-bold text-[var(--action)]">Salvar em Meus documentos</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
        <div ref={fimRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void enviar(texto); }}
        className="border-t border-[var(--line)] p-4"
      >
        {erro && <p role="alert" className="mb-2 text-sm font-bold text-[var(--color-danger)]">{erro}</p>}
        {aviso.length > 0 && !erro && <p role="alert" className="mb-2 text-sm font-bold text-[var(--color-danger)]">{descreverAchados(aviso)}</p>}
        <label htmlFor="pergunta" className="sr-only">Sua mensagem</label>
        <textarea
          id="pergunta"
          rows={3}
          maxLength={12000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void enviar(texto); } }}
          placeholder="Descreva o que precisa: etapa, ano, componente, tema, duração…"
          className="field"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-[var(--muted)]">{restantes} de {limite} mensagens restantes hoje · Ctrl+Enter envia</span>
          <div className="flex gap-2">
            {msgs.length > 0 && !enviando && <button type="button" onClick={() => { setMsgs([]); setErro(null); }} className="rounded-[var(--radius-control)] px-4 py-2 font-bold text-[var(--muted)]">Nova conversa</button>}
            {enviando ? (
              <button type="button" onClick={() => abortRef.current?.abort()} className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-5 py-2 font-bold">Parar</button>
            ) : (
              <button type="submit" disabled={!texto.trim() || aviso.length > 0 || restantes <= 0} className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-2 font-bold text-[var(--action-text)] disabled:opacity-50">Enviar</button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
