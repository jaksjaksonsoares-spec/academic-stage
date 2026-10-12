"use client";

import { startTransition, useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { FormMessage } from "@/components/ui";
import { analisarArquivo, analisarUrl, type AnaliseState } from "./actions";

const inicial: AnaliseState = { status: "idle" };
const MAX = 30 * 1024 * 1024;

function MetodoEscolha({ iaDisponivel, restantes }: { iaDisponivel: boolean; restantes: number }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 font-bold">Como analisar</legend>
      <label className="flex items-start gap-3">
        <input type="radio" name="metodo" value="palavras-chave" defaultChecked={!iaDisponivel} className="mt-1 h-5 w-5 accent-[var(--action)]" />
        <span><strong>Leitura por palavras-chave</strong> — localiza trechos e datas com o número da página. Rápida, sem limite.</span>
      </label>
      <label className={`flex items-start gap-3 ${iaDisponivel ? "" : "opacity-60"}`}>
        <input type="radio" name="metodo" value="ia" disabled={!iaDisponivel} defaultChecked={iaDisponivel} className="mt-1 h-5 w-5 accent-[var(--action)]" />
        <span>
          <strong>Análise com IA</strong> — resume cada tópico citando as páginas do edital.{" "}
          {iaDisponivel ? `${restantes} restante${restantes === 1 ? "" : "s"} hoje.` : "Ainda não ativada nesta plataforma."}
        </span>
      </label>
    </fieldset>
  );
}

export function EnviarEdital({ userId, iaDisponivel, restantes }: { userId: string; iaDisponivel: boolean; restantes: number }) {
  const [aba, setAba] = useState<"pdf" | "url">("pdf");
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
      <div role="tablist" aria-label="Origem do edital" className="mb-5 flex gap-1 border-b border-[var(--line)]">
        {(["pdf", "url"] as const).map((a) => (
          <button key={a} role="tab" type="button" aria-selected={aba === a} onClick={() => setAba(a)} className={`-mb-px border-b-2 px-4 py-2.5 font-bold ${aba === a ? "border-[var(--action)]" : "border-transparent text-[var(--muted)]"}`}>
            {a === "pdf" ? "Enviar PDF" : "Usar endereço oficial"}
          </button>
        ))}
      </div>
      {aba === "pdf" ? <PdfForm userId={userId} iaDisponivel={iaDisponivel} restantes={restantes} /> : <UrlForm iaDisponivel={iaDisponivel} restantes={restantes} />}
    </div>
  );
}

function PdfForm({ userId, iaDisponivel, restantes }: { userId: string; iaDisponivel: boolean; restantes: number }) {
  const [state, action, pending] = useActionState(analisarArquivo, inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    const arquivo = fd.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) return setErro("Escolha o PDF do edital.");
    if (arquivo.type && arquivo.type !== "application/pdf") return setErro("O arquivo precisa ser um PDF.");
    if (arquivo.size > MAX) return setErro("O PDF passa de 30 MB.");
    const supabase = createClient();
    if (!supabase) return setErro("O armazenamento ainda não foi configurado.");

    setEnviando(true);
    const caminho = `${userId}/${crypto.randomUUID()}.pdf`;
    const { error } = await supabase.storage.from("editais").upload(caminho, arquivo, { contentType: "application/pdf", upsert: false });
    setEnviando(false);
    if (error) return setErro("Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.");

    const dados = new FormData();
    dados.set("caminho", caminho);
    dados.set("titulo", String(fd.get("titulo") || arquivo.name.replace(/\.pdf$/i, "")).slice(0, 200));
    dados.set("metodo", String(fd.get("metodo") ?? "palavras-chave"));
    startTransition(() => action(dados));
  }

  const ocupado = enviando || pending;
  return (
    <form onSubmit={enviar} className="space-y-5">
      <FormMessage status={erro ? "error" : state.status} message={erro ?? state.message} />
      <label className="block">
        <span className="mb-1 block font-bold">PDF do edital (até 30 MB)</span>
        <input name="arquivo" type="file" accept="application/pdf,.pdf" required className="field py-2" />
      </label>
      <label className="block">
        <span className="mb-1 block font-bold">Nome para identificar (opcional)</span>
        <input name="titulo" maxLength={200} className="field" placeholder="Ex.: Prefeitura de Exemplo — Professor de Inglês 2026" />
      </label>
      <MetodoEscolha iaDisponivel={iaDisponivel} restantes={restantes} />
      <button type="submit" disabled={ocupado} className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] disabled:opacity-60">
        {ocupado && <span className="spinner inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
        {enviando ? "Enviando…" : pending ? "Analisando… pode levar até um minuto" : "Analisar edital"}
      </button>
      <p className="text-sm text-[var(--muted)]">O PDF é apagado logo após a análise; guardamos só o resultado.</p>
    </form>
  );
}

function UrlForm({ iaDisponivel, restantes }: { iaDisponivel: boolean; restantes: number }) {
  const [state, action, pending] = useActionState(analisarUrl, inicial);
  const [url, setUrl] = useState("");
  return (
    <form action={action} className="space-y-5">
      <FormMessage status={state.status === "error" ? "error" : "idle"} message={state.message} />
      {state.pdfs && (
        <div role="status" className="space-y-3 rounded-[var(--radius-control)] border border-[var(--line)] p-4">
          <p>{state.message}</p>
          <ul className="space-y-2">
            {state.pdfs.map((p) => (
              <li key={p.href}>
                <button type="button" onClick={() => setUrl(p.href)} className="text-left font-bold text-[var(--action)] underline">{p.texto}</button>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="usarPagina" value="1" className="h-4 w-4 accent-[var(--action)]" /> Analisar o texto da própria página
          </label>
        </div>
      )}
      <label className="block">
        <span className="mb-1 block font-bold">Endereço do edital ou da página oficial</span>
        <input name="url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="field" />
      </label>
      <MetodoEscolha iaDisponivel={iaDisponivel} restantes={restantes} />
      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] disabled:opacity-60">
        {pending && <span className="spinner inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
        {pending ? "Analisando…" : "Analisar endereço"}
      </button>
    </form>
  );
}
