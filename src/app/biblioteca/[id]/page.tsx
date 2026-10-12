import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { LICENCAS, MOTIVOS_DENUNCIA, STATUS_RECURSO, TIPOS_RECURSO, atribuicao, type Licenca } from "@/lib/biblioteca";
import { ETAPAS } from "@/lib/validation";
import { lerConteudo, type Atividade, type Avaliacao, type Plano, type Texto, type TipoDocumento } from "@/lib/documentos";
import { AtividadeView, AvaliacaoView, PlanoView, TextoView } from "@/components/documento-render";
import { FavoriteButton } from "@/components/favorite-button";
import { FormMessage } from "@/components/ui";
import { Icon } from "@/components/icon";
import { adicionarAColecao, copiarRecurso, denunciarRecurso } from "../actions";

type P = Promise<{ id: string }>;

async function carregar(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("recursos").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const r = await carregar((await params).id);
  if (!r) return { title: "Material não encontrado" };
  const publico = r.status === "publicado" && r.visibilidade === "publica";
  return { title: r.titulo, description: r.descricao.slice(0, 160), robots: publico ? undefined : { index: false }, alternates: { canonical: `/biblioteca/${r.id}` } };
}

const AVISOS: Record<string, { status: "success" | "error"; message: string }> = {
  copia: { status: "error", message: "Não foi possível copiar este material." },
  limite: { status: "error", message: "Você chegou ao limite de documentos do seu plano." },
  denuncia: { status: "success", message: "Obrigado. A equipe editorial vai analisar." },
  colecao: { status: "success", message: "Adicionado à coleção." },
};

export default async function RecursoPage({ params, searchParams }: { params: P; searchParams: Promise<{ erro?: string; denuncia?: string; colecao?: string }> }) {
  const { id } = await params;
  const r = await carregar(id);
  if (!r) notFound();
  const sp = await searchParams;
  const aviso = AVISOS[sp.erro ?? (sp.denuncia ? "denuncia" : sp.colecao ? "colecao" : "")];

  const { supabase, user } = await getUser();
  let salvo = false;
  let colecoes: { id: string; nome: string }[] = [];
  if (supabase && user) {
    const [{ data: fav }, { data: cols }] = await Promise.all([
      supabase.from("favorites").select("id").eq("user_id", user.id).eq("item_type", "material").eq("item_id", r.id).maybeSingle(),
      supabase.from("colecoes").select("id,nome").order("nome"),
    ]);
    salvo = !!fav;
    colecoes = cols ?? [];
  }

  const licenca = LICENCAS[r.licenca as Licenca];
  const credito = atribuicao({ titulo: r.titulo, autor_nome: r.autor_nome, fonte_nome: r.fonte_nome, licenca: r.licenca as Licenca });
  const etapas = (r.etapas as string[]).map((e) => ETAPAS.find((x) => x.value === e)?.label).filter(Boolean);
  const tipoDoc = r.documento_tipo as TipoDocumento | null;

  return (
    <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/biblioteca" className="text-sm text-[var(--muted)] hover:underline">Biblioteca</Link>
      {r.status !== "publicado" && <div className="mt-4"><FormMessage status="error" message={`Situação: ${STATUS_RECURSO[r.status as keyof typeof STATUS_RECURSO]}. Só você${r.visibilidade === "organizacao" ? ", a gestão da organização" : ""} e a equipe editorial veem este material.`} /></div>}
      {r.visibilidade === "organizacao" && r.status === "publicado" && <p className="mt-4 text-sm font-bold text-[var(--action)]">Material interno da sua organização</p>}
      {aviso && <div className="mt-4"><FormMessage status={aviso.status} message={aviso.message} /></div>}

      <header className="mt-4">
        <p className="font-bold text-[var(--action)]">{TIPOS_RECURSO[r.tipo as keyof typeof TIPOS_RECURSO]}</p>
        <h1 className="mt-1 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">{r.titulo}</h1>
        <p className="mt-2 text-[var(--muted)]">
          {r.origem === "curadoria" ? `Fonte: ${r.fonte_nome ?? "curadoria da plataforma"}` : `Por ${r.autor_nome ?? "professor(a) da comunidade"}`}
          {etapas.length > 0 && ` · ${etapas.join(", ")}`}
          {r.componente && ` · ${r.componente}`}
        </p>
        <p className="mt-4 max-w-3xl whitespace-pre-line text-lg">{r.descricao}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {r.conteudo && tipoDoc && (user ? (
            <form action={copiarRecurso}>
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-2.5 font-bold text-[var(--action-text)]">Copiar para meus documentos</button>
            </form>
          ) : (
            <Link href={`/entrar?next=/biblioteca/${r.id}`} className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-2.5 font-bold text-[var(--action-text)]">Entre para copiar e editar</Link>
          ))}
          {r.link_url && (
            <a href={r.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-2.5 font-bold text-[var(--action-text)]">
              <Icon name="link" className="h-4 w-4" /> Abrir na fonte
            </a>
          )}
          {r.status === "publicado" && <FavoriteButton itemType="material" itemId={r.id} initialSaved={salvo} signedIn={!!user} label="Salvar" savedLabel="Salvo" />}
        </div>
      </header>

      <section aria-labelledby="licenca" className="mt-8 rounded-[var(--radius-card)] border border-[var(--line)] p-5">
        <h2 id="licenca" className="font-bold">Licença: {licenca.url ? <a href={licenca.url} target="_blank" rel="noopener noreferrer" className="underline">{licenca.nome}</a> : licenca.nome}</h2>
        <p className="mt-1 text-[var(--muted)]">{licenca.resumo}</p>
        <p className="mt-3 text-sm"><strong>Como citar:</strong> {credito}</p>
        {r.conteudo && <p className="mt-1 text-sm text-[var(--muted)]">Ao copiar, a citação é adicionada automaticamente ao seu documento.</p>}
      </section>

      {r.conteudo && tipoDoc && (
        <section aria-labelledby="previa" className="mt-10">
          <h2 id="previa" className="mb-4 text-xl font-bold">Prévia</h2>
          {tipoDoc === "plano" && <PlanoView titulo={r.titulo} p={lerConteudo("plano", r.conteudo) as Plano} />}
          {tipoDoc === "atividade" && <AtividadeView titulo={r.titulo} a={lerConteudo("atividade", r.conteudo) as Atividade} docId={r.id} versao={0} comGabarito={false} />}
          {tipoDoc === "avaliacao" && <AvaliacaoView titulo={r.titulo} a={lerConteudo("avaliacao", r.conteudo) as Avaliacao} docId={r.id} versao={0} />}
          {tipoDoc === "texto" && <TextoView titulo={r.titulo} t={lerConteudo("texto", r.conteudo) as Texto} />}
          <p className="mt-2 text-sm text-[var(--muted)]">O gabarito vem junto na cópia.</p>
        </section>
      )}

      {user && r.status === "publicado" && (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section aria-labelledby="col" className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
            <h2 id="col" className="font-bold">Adicionar a uma coleção</h2>
            {colecoes.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">Crie coleções em <Link href="/biblioteca/minhas" className="font-bold underline">Meus materiais</Link>.</p>
            ) : (
              <form action={adicionarAColecao} className="mt-3 flex gap-2">
                <input type="hidden" name="recurso" value={r.id} />
                <label htmlFor="colecao" className="sr-only">Coleção</label>
                <select id="colecao" name="colecao" className="field py-2">{colecoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                <button type="submit" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 font-bold">Adicionar</button>
              </form>
            )}
          </section>
          <details className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
            <summary className="cursor-pointer font-bold">Denunciar um problema</summary>
            <form action={denunciarRecurso} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <select name="motivo" required className="field py-2" aria-label="Motivo">
                {Object.entries(MOTIVOS_DENUNCIA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <textarea name="detalhe" rows={2} maxLength={1000} placeholder="Detalhes (opcional)" className="field" aria-label="Detalhes" />
              <button type="submit" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--color-danger)] px-4 py-2 font-bold text-[var(--color-danger)]">Enviar denúncia</button>
            </form>
          </details>
        </div>
      )}
    </article>
  );
}
