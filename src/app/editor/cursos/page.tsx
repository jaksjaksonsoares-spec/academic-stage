import type { Metadata } from "next";
import Link from "next/link";
import { requireEditor } from "@/lib/session";
import { TIPOS_CURSO } from "@/lib/cursos";
import { FormMessage } from "@/components/ui";
import { CursoForm, type CursoEdit } from "./form";
import { excluirCurso, publicarCurso, verificarCurso } from "./actions";

export const metadata: Metadata = { title: "Editor de cursos", robots: { index: false } };

const AVISOS: Record<string, { s: "success" | "error"; m: string }> = {
  verificado: { s: "success", m: "Verificação registrada agora." },
  publicacao: { s: "success", m: "Situação de publicação alterada." },
  excluido: { s: "success", m: "Curso excluído." },
  publicar: { s: "error", m: "Registre a verificação na fonte antes de publicar." },
  confirmacao: { s: "error", m: "Marque a confirmação para excluir." },
};

export default async function EditorCursosPage({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string; ok?: string; erro?: string }> }) {
  const { supabase } = await requireEditor("/editor/cursos");
  const sp = await searchParams;
  const { data: cursos } = await supabase.from("cursos").select("id,titulo,instituicao,tipo,publicado,ultima_verificacao_em,updated_at").order("updated_at", { ascending: false }).limit(300);
  const editando = sp.editar && /^[0-9a-f-]{36}$/.test(sp.editar) ? (await supabase.from("cursos").select("*").eq("id", sp.editar).maybeSingle()).data : null;
  const aviso = AVISOS[sp.ok ?? sp.erro ?? ""];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] font-extrabold">Editor de cursos e formação</h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">Rascunho → conferir na página oficial e registrar a verificação → publicar. Só marque o reconhecimento oficial depois de conferir no e-MEC ou na Sucupira.</p>
        </div>
        <Link href="/editor/cursos?novo=1" className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)]">Novo curso</Link>
      </div>
      {aviso && <div className="mt-6"><FormMessage status={aviso.s} message={aviso.m} /></div>}

      {(sp.novo || editando) && (
        <section className="mt-10 rounded-[var(--radius-card)] border border-[var(--line)] p-6">
          <h2 className="mb-4 text-xl font-bold">{editando ? editando.titulo : "Novo curso"}</h2>
          <CursoForm curso={(editando ?? undefined) as CursoEdit | undefined} />
          {editando && (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
              <form action={verificarCurso}><input type="hidden" name="id" value={editando.id} /><button type="submit" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold">Registrar verificação agora</button></form>
              <form action={publicarCurso}><input type="hidden" name="id" value={editando.id} /><input type="hidden" name="publicar" value={editando.publicado ? "0" : "1"} /><button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2 font-bold text-[var(--action-text)]">{editando.publicado ? "Voltar para rascunho" : "Publicar"}</button></form>
              <form action={excluirCurso} className="flex items-center gap-2"><input type="hidden" name="id" value={editando.id} /><label className="flex items-center gap-1 text-sm"><input type="checkbox" name="confirmar" className="h-4 w-4" /> confirmo</label><button type="submit" className="text-sm font-bold text-[var(--color-danger)] underline">Excluir</button></form>
              <span className="text-sm text-[var(--muted)]">Última verificação: {editando.ultima_verificacao_em ? new Date(editando.ultima_verificacao_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "nunca"}</span>
            </div>
          )}
        </section>
      )}

      <ul className="mt-10 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {(cursos ?? []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <Link href={`/editor/cursos?editar=${c.id}`} className="font-bold hover:underline">{c.titulo}<span className="block text-sm font-normal text-[var(--muted)]">{c.instituicao} · {TIPOS_CURSO[c.tipo as keyof typeof TIPOS_CURSO]}</span></Link>
            <span className="text-sm">{c.publicado ? "Publicado" : "Rascunho"}{!c.ultima_verificacao_em && <span className="ml-2 font-bold text-[var(--color-danger)]">sem verificação</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
