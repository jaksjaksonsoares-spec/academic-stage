import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { AVISO_DADOS, ESTRATEGIAS, MODELOS_INCLUSAO, RECURSOS_ACESSIVEIS } from "@/lib/inclusao";
import { FormMessage } from "@/components/ui";
import { Icon } from "@/components/icon";
import { adaptarDocumento, criarModelo } from "./actions";

export const metadata: Metadata = {
  title: "Inclusão e acessibilidade pedagógica",
  description: "Modelos editáveis de planejamento individualizado, rotina visual e acompanhamento, adaptação de atividades e estratégias de Desenho Universal para a Aprendizagem.",
  alternates: { canonical: "/inclusao" },
};

const ERROS: Record<string, string> = {
  limite: "Você chegou ao limite de documentos do seu plano.",
  criar: "Não foi possível criar o documento.",
  tipo: "Só atividades e provas podem ser adaptadas por aqui.",
};

export default async function InclusaoPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  const docs = supabase && user
    ? ((await supabase.from("documentos").select("id,titulo,tipo").in("tipo", ["atividade", "avaliacao"]).order("updated_at", { ascending: false }).limit(100)).data ?? [])
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex items-start gap-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-ink)] text-[var(--color-spot)]"><Icon name="heart" className="h-7 w-7" /></span>
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Inclusão e acessibilidade pedagógica</h1>
          <p className="mt-3 max-w-2xl text-lg text-[var(--muted)]">Ferramentas para planejar a partir das barreiras observadas nas atividades e dos apoios disponíveis — sem pedir diagnósticos nem dados de estudantes.</p>
        </div>
      </div>
      {sp.erro && ERROS[sp.erro] && <div className="mt-6"><FormMessage status="error" message={ERROS[sp.erro]} /></div>}

      <div role="note" className="mt-8 flex gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--line)] p-4 text-[0.97rem]">
        <Icon name="info" className="h-5 w-5 shrink-0 text-[var(--action)]" />
        <p>Estes recursos apoiam o planejamento do professor. Não fazem diagnóstico e não substituem o atendimento educacional especializado nem outros profissionais. {AVISO_DADOS}</p>
      </div>

      <section aria-labelledby="modelos" className="mt-12">
        <h2 id="modelos" className="text-2xl font-bold">Modelos editáveis</h2>
        <p className="mt-1 text-[var(--muted)]">Cada modelo vira um documento seu, para editar, imprimir ou exportar para o Word.</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {Object.entries(MODELOS_INCLUSAO).map(([k, m]) => (
            <li key={k} className="flex flex-col rounded-[var(--radius-card)] border border-[var(--line)] p-5">
              <h3 className="font-bold">{m.titulo.replace(" (modelo)", "")}</h3>
              <p className="mt-1 flex-1 text-[0.97rem] text-[var(--muted)]">{m.descricao}</p>
              {user ? (
                <form action={criarModelo} className="mt-4"><input type="hidden" name="modelo" value={k} /><button type="submit" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-4 py-2 font-bold hover:border-[var(--action)]">Usar este modelo</button></form>
              ) : (
                <Link href="/entrar?next=/inclusao" className="mt-4 font-bold text-[var(--action)] underline">Entre para usar</Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="adaptar" className="mt-12 rounded-[var(--radius-stage)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lift)] sm:p-8">
        <h2 id="adaptar" className="text-2xl font-bold">Adaptar uma atividade ou prova</h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Cria uma cópia com letra maior, fonte de alta legibilidade, espaçamento amplo e mais linhas de resposta, com as orientações de apoio que você escrever. Depois, revise as questões no editor — o objetivo de aprendizagem continua o mesmo.
        </p>
        {!user ? (
          <Link href="/entrar?next=/inclusao" className="mt-4 inline-block font-bold text-[var(--action)] underline">Entre para adaptar seus materiais</Link>
        ) : docs.length === 0 ? (
          <p className="mt-4">Você ainda não tem atividades ou provas. <Link href="/atividades" className="font-bold text-[var(--action)] underline">Criar uma atividade</Link></p>
        ) : (
          <form action={adaptarDocumento} className="mt-5 grid gap-4 sm:grid-cols-[1fr_160px]">
            <label className="block text-sm font-bold">Material<select name="id" className="field mt-1 font-normal">{docs.map((d) => <option key={d.id} value={d.id}>{d.titulo} — {d.tipo === "avaliacao" ? "prova" : "atividade"}</option>)}</select></label>
            <label className="block text-sm font-bold">Tamanho da letra<select name="tamanho" defaultValue="16" className="field mt-1 font-normal"><option value="14">14 pt</option><option value="16">16 pt</option><option value="18">18 pt</option></select></label>
            <label className="block text-sm font-bold sm:col-span-2">Orientações de apoio (aparecem nas instruções)
              <textarea name="apoios" rows={3} maxLength={1500} placeholder="Ex.: Leia uma questão por vez. Você pode responder oralmente ou com desenho nas questões 3 e 4." className="field mt-1 font-normal" />
            </label>
            <div><button type="submit" className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)]">Criar versão adaptada</button></div>
          </form>
        )}
      </section>

      <section aria-labelledby="estrategias" className="mt-12">
        <h2 id="estrategias" className="text-2xl font-bold">Estratégias de participação</h2>
        <p className="mt-1 text-[var(--muted)]">Baseadas nos princípios do Desenho Universal para a Aprendizagem: planejar desde o início para que mais estudantes participem.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {ESTRATEGIAS.map((e) => (
            <div key={e.titulo} className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">
              <h3 className="font-bold">{e.titulo}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.97rem]">{e.itens.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="recursos" className="mt-12">
        <h2 id="recursos" className="text-2xl font-bold">Recursos acessíveis gratuitos</h2>
        <ul className="mt-3 space-y-2">
          {RECURSOS_ACESSIVEIS.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">{r.nome}</a> — {r.descricao}</li>)}
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Precisa de ideias para um caso específico? O <Link href="/assistente" className="font-bold underline">assistente pedagógico</Link> sugere adaptações a partir das barreiras que você descrever, sem dados do estudante.
        </p>
      </section>
    </div>
  );
}
