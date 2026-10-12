import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { LIMITES_DIARIOS, LIMITE_DOCUMENTOS_PADRAO } from "@/lib/limites";
import { alternarInteresse } from "./actions";

export const metadata: Metadata = {
  title: "Planos",
  description: "O que cada plano do AcademiC Stage inclui. Todas as ferramentas são gratuitas; os planos pagos ampliam limites.",
  alternates: { canonical: "/planos" },
};

type Plano = "gratuito" | "profissional" | "institucional";
const PLANOS: { id: Plano; nome: string; para: string; extras: string[] }[] = [
  { id: "gratuito", nome: "Gratuito", para: "Para todo professor e professora.", extras: ["Todas as ferramentas da plataforma", "Biblioteca colaborativa e formação", "Concursos, editais e estudos"] },
  { id: "profissional", nome: "Profissional", para: "Para quem usa a IA todos os dias.", extras: ["Tudo do gratuito", "Limites ampliados de IA", "Mais documentos salvos"] },
  { id: "institucional", nome: "Institucional", para: "Para escolas e redes.", extras: ["Vale para todos os membros da organização", "Biblioteca interna e modelos da escola", "Gestão de membros e convites"] },
];

export default async function PlanosPage() {
  const { supabase, user } = await getUser();
  let config: { chave: string; valor: unknown }[] = [];
  let plano: string | null = null;
  let interesses: string[] = [];
  if (supabase) {
    const [c, pe, it] = await Promise.all([
      supabase.from("config_plataforma").select("chave,valor").in("chave", ["limites_ia", "limites_planos"]),
      user ? supabase.rpc("plano_efetivo") : Promise.resolve({ data: null }),
      user ? supabase.from("interesse_planos").select("plano").eq("user_id", user.id) : Promise.resolve({ data: [] as { plano: string }[] }),
    ]);
    config = c.data ?? [];
    plano = user ? (typeof pe.data === "string" ? pe.data : "gratuito") : null;
    interesses = (it.data ?? []).map((i) => i.plano);
  }
  const ia = (config.find((c) => c.chave === "limites_ia")?.valor ?? {}) as Partial<Record<Plano, { assistente?: number; edital?: number }>>;
  const pl = (config.find((c) => c.chave === "limites_planos")?.valor ?? {}) as Partial<Record<Plano, { documentos?: number }>>;
  const num = (n: number) => n.toLocaleString("pt-BR");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Planos</h1>
      <p className="mt-3 max-w-2xl text-lg text-[var(--muted)]">
        Todas as ferramentas são gratuitas. Os planos pagos ampliam os limites de uso da IA e de documentos salvos.
      </p>
      <div role="note" className="mt-6 max-w-3xl rounded-[var(--radius-card)] border-l-4 border-[var(--action)] bg-[var(--surface)] p-4">
        <p className="font-bold">Ainda não há cobrança.</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Os planos Profissional e Institucional ainda não estão à venda e não têm preço definido. Hoje são concedidos apenas pela equipe da plataforma, em pilotos e parcerias.
          Se tiver interesse, registre abaixo: isso ajuda a equipe a planejar. Nenhum dado de pagamento é pedido.
        </p>
      </div>
      {plano && <p className="mt-6">Seu plano atual: <strong>{PLANOS.find((p) => p.id === plano)?.nome ?? "Gratuito"}</strong>{plano === "institucional" && " (pela sua organização ou concedido pela equipe)"}.</p>}

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {PLANOS.map((p) => {
          const assistente = ia[p.id]?.assistente ?? LIMITES_DIARIOS[p.id].assistente;
          const edital = ia[p.id]?.edital ?? LIMITES_DIARIOS[p.id].edital;
          const documentos = pl[p.id]?.documentos ?? LIMITE_DOCUMENTOS_PADRAO[p.id];
          const atual = plano === p.id;
          const temInteresse = interesses.includes(p.id);
          return (
            <section key={p.id} aria-labelledby={`p-${p.id}`} className={`flex flex-col rounded-[var(--radius-card)] border p-6 ${atual ? "border-[var(--action)] border-2" : "border-[var(--line)]"}`}>
              <h2 id={`p-${p.id}`} className="text-2xl font-extrabold">{p.nome}</h2>
              <p className="mt-1 text-[var(--muted)]">{p.para}</p>
              <p className="mt-4 text-lg font-bold">{p.id === "gratuito" ? "Gratuito" : "Preço ainda não definido"}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3 border-b border-[var(--line)] pb-2"><dt>Mensagens ao assistente por dia</dt><dd className="font-bold">{num(assistente)}</dd></div>
                <div className="flex justify-between gap-3 border-b border-[var(--line)] pb-2"><dt>Análises de edital com IA por dia</dt><dd className="font-bold">{num(edital)}</dd></div>
                <div className="flex justify-between gap-3 border-b border-[var(--line)] pb-2"><dt>Documentos salvos</dt><dd className="font-bold">{num(documentos)}</dd></div>
              </dl>
              <ul className="mt-4 flex-1 list-disc space-y-1 pl-5 text-sm">{p.extras.map((e) => <li key={e}>{e}</li>)}</ul>
              <div className="mt-6">
                {p.id === "gratuito" ? (
                  user ? (atual ? <p className="font-bold">Você está neste plano.</p> : null) : <Link href="/cadastro" className="inline-block rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-2.5 font-bold text-[var(--action-text)]">Criar conta gratuita</Link>
                ) : atual ? (
                  <p className="font-bold">Você está neste plano.</p>
                ) : user ? (
                  <form action={alternarInteresse}>
                    <input type="hidden" name="plano" value={p.id} />
                    <input type="hidden" name="acao" value={temInteresse ? "remover" : "registrar"} />
                    <button type="submit" className={`rounded-[var(--radius-control)] px-5 py-2.5 font-bold ${temInteresse ? "border-[1.5px] border-[var(--line)]" : "bg-[var(--action)] text-[var(--action-text)]"}`}>
                      {temInteresse ? "Interesse registrado · retirar" : "Tenho interesse"}
                    </button>
                  </form>
                ) : (
                  <Link href="/entrar?next=/planos" className="inline-block rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-5 py-2.5 font-bold">Entre para registrar interesse</Link>
                )}
                {p.id === "institucional" && <p className="mt-3 text-sm"><Link href="/instituicao" className="font-bold underline">Criar a organização da sua escola</Link> (gratuito).</p>}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-8 max-w-3xl text-sm text-[var(--muted)]">
        Os limites de IA existem porque cada uso tem custo real com o provedor do modelo. Os números acima vêm da configuração atual da plataforma e podem ser ajustados; mudanças aparecem aqui.
      </p>
    </div>
  );
}
