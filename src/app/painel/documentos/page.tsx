import Link from "next/link";
import { requireUser } from "@/lib/session";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/documentos";
import { FormMessage } from "@/components/ui";
import { criarDocumento, duplicarDocumento, excluirDocumento, excluirTurma } from "./actions";
import { TurmaForm } from "./turma-form";

const ERROS: Record<string, string> = {
  limite: "Você chegou ao limite de documentos do seu plano. Exclua documentos antigos para criar novos ou veja os planos disponíveis.",
  criar: "Não foi possível criar o documento. Tente de novo.",
  duplicar: "Não foi possível duplicar o documento.",
};

type Row = { id: string; tipo: TipoDocumento; titulo: string; turma_id: string | null; updated_at: string };

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{ tipo?: string; turma?: string; erro?: string; excluido?: string }> }) {
  const { supabase } = await requireUser("/painel/documentos");
  const sp = await searchParams;
  const tipo = (["plano", "atividade", "avaliacao", "texto"] as const).find((t) => t === sp.tipo);

  let q = supabase.from("documentos").select("id,tipo,titulo,turma_id,updated_at").order("updated_at", { ascending: false }).limit(300);
  if (tipo) q = q.eq("tipo", tipo);
  if (sp.turma === "sem") q = q.is("turma_id", null);
  else if (sp.turma && /^[0-9a-f-]{36}$/.test(sp.turma)) q = q.eq("turma_id", sp.turma);

  const [{ data: docs }, { data: turmas }] = await Promise.all([q, supabase.from("turmas").select("id,nome,etapa,componente").order("nome")]);
  const rows = (docs ?? []) as Row[];
  const nomeTurma = new Map((turmas ?? []).map((t) => [t.id as string, t.nome as string]));

  const filtro = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tipo, turma: sp.turma, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/painel/documentos?${s}` : "/painel/documentos";
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Meus documentos</h1>
          <p className="mt-2 text-[var(--muted)]">Planos de aula, atividades e avaliações, organizados por turma.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIPOS_DOCUMENTO) as TipoDocumento[]).map((t) => (
            <form key={t} action={criarDocumento}>
              <input type="hidden" name="tipo" value={t} />
              {sp.turma && sp.turma !== "sem" && <input type="hidden" name="turma_id" value={sp.turma} />}
              <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2.5 font-bold text-[var(--action-text)]">{TIPOS_DOCUMENTO[t].novo}</button>
            </form>
          ))}
        </div>
      </header>

      {sp.erro && ERROS[sp.erro] && <FormMessage status="error" message={ERROS[sp.erro]} />}
      {sp.excluido && <FormMessage status="success" message="Documento excluído." />}

      <div className="grid gap-10 xl:grid-cols-[1fr_280px]">
        <section aria-labelledby="lista">
          <h2 id="lista" className="sr-only">Lista de documentos</h2>
          <nav aria-label="Filtrar por tipo" className="mb-4 flex flex-wrap gap-2">
            {[undefined, "plano", "atividade", "avaliacao", "texto"].map((t) => (
              <Link key={t ?? "todos"} href={filtro({ tipo: t })} aria-current={tipo === t ? "page" : undefined}
                className={`rounded-full border px-4 py-1.5 text-sm font-bold ${tipo === t ? "border-[var(--action)] text-[var(--action)]" : "border-[var(--line)]"}`}>
                {t ? TIPOS_DOCUMENTO[t as TipoDocumento].label : "Todos"}
              </Link>
            ))}
            {sp.turma && <Link href={filtro({ turma: undefined })} className="rounded-full border border-[var(--action)] px-4 py-1.5 text-sm font-bold text-[var(--action)]">Turma: {sp.turma === "sem" ? "sem turma" : nomeTurma.get(sp.turma) ?? "?"} ✕</Link>}
          </nav>

          {rows.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--line)] p-8">
              <h3 className="text-lg font-bold">Nenhum documento {tipo || sp.turma ? "com esse filtro" : "ainda"}</h3>
              <p className="mt-2 text-[var(--muted)]">Use os botões acima para criar um plano de aula, uma atividade ou uma avaliação.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {rows.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/painel/documentos/${d.id}`} className="font-bold hover:underline">{d.titulo}</Link>
                    <p className="text-sm text-[var(--muted)]">
                      {TIPOS_DOCUMENTO[d.tipo].label}
                      {d.turma_id && nomeTurma.get(d.turma_id) ? ` · ${nomeTurma.get(d.turma_id)}` : ""}
                      {" · editado em "}
                      {new Date(d.updated_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </p>
                  </div>
                  <form action={duplicarDocumento}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-black/5 dark:hover:bg-white/10">Duplicar</button>
                  </form>
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-lg px-3 py-1.5 text-sm font-bold text-[var(--color-danger)] hover:bg-black/5 dark:hover:bg-white/10">Excluir</summary>
                    <form action={excluirDocumento} className="absolute right-0 z-10 mt-1 w-56 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lift)]">
                      <input type="hidden" name="id" value={d.id} />
                      <p className="text-sm">Excluir “{d.titulo}”? Não dá para desfazer.</p>
                      <button type="submit" className="mt-2 w-full rounded-lg bg-[var(--color-danger)] px-3 py-1.5 text-sm font-bold text-white">Confirmar exclusão</button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-labelledby="turmas" className="space-y-4">
          <h2 id="turmas" className="text-lg font-bold">Turmas</h2>
          <ul className="space-y-1">
            {(turmas ?? []).map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <Link href={filtro({ turma: t.id })} className="flex-1 rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                  <span className="font-bold">{t.nome}</span>
                  {(t.etapa || t.componente) && <span className="block text-sm text-[var(--muted)]">{[t.etapa, t.componente].filter(Boolean).join(" · ")}</span>}
                </Link>
                <form action={excluirTurma}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" aria-label={`Excluir turma ${t.nome} (os documentos são mantidos)`} title="Excluir turma (os documentos são mantidos)" className="rounded-lg px-2 py-1 text-[var(--muted)] hover:text-[var(--color-danger)]">✕</button>
                </form>
              </li>
            ))}
            <li><Link href={filtro({ turma: "sem" })} className="block rounded-lg px-2 py-1.5 text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/10">Sem turma</Link></li>
          </ul>
          <TurmaForm />
        </aside>
      </div>
    </div>
  );
}
