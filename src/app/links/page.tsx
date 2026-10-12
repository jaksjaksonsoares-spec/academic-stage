import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";

export const metadata: Metadata = {
  title: "Links úteis para educadores",
  description: "Fontes oficiais para professores: legislação educacional, BNCC, Inep, Diário Oficial, formação e pesquisa — com verificação automática de disponibilidade.",
  alternates: { canonical: "/links" },
};

const CATEGORIAS: Record<string, string> = {
  legislacao: "Legislação",
  concursos: "Concursos",
  planejamento: "Planejamento",
  avaliacao: "Avaliação",
  formacao: "Formação",
  inclusao: "Inclusão",
  pesquisa: "Pesquisa",
  tecnologia: "Tecnologia",
};

type Link = {
  id: number; titulo: string; url: string; descricao: string; orgao: string; categoria: string;
  ultimo_status: number | null; ultima_verificacao_em: string | null; falhas_consecutivas: number;
};

export default async function LinksPage() {
  const supabase = await createClient();
  const { data, error } = supabase
    ? await supabase.from("links_uteis").select("id,titulo,url,descricao,orgao,categoria,ultimo_status,ultima_verificacao_em,falhas_consecutivas").order("titulo")
    : { data: null, error: null };
  const links = (data ?? []) as Link[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Links úteis</h1>
        <p className="mt-3 text-lg text-[var(--muted)]">
          Fontes oficiais e confiáveis, organizadas por assunto. Uma rotina diária testa cada endereço e mostra quando foi a última conferência.
        </p>
      </header>

      {!supabase && <p className="mt-10 text-[var(--muted)]">O diretório aparece aqui depois que o banco de dados for conectado.</p>}
      {error && <p role="alert" className="mt-10 text-[var(--color-danger)]">Não foi possível carregar os links. Tente recarregar a página.</p>}

      <nav aria-label="Categorias" className="mt-8 flex flex-wrap gap-2">
        {Object.entries(CATEGORIAS)
          .filter(([k]) => links.some((l) => l.categoria === k))
          .map(([k, v]) => (
            <a key={k} href={`#${k}`} className="rounded-full border border-[var(--line)] px-4 py-1.5 font-bold hover:border-[var(--muted)]">{v}</a>
          ))}
      </nav>

      <div className="mt-10 space-y-14">
        {Object.entries(CATEGORIAS).map(([cat, nome]) => {
          const items = links.filter((l) => l.categoria === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} id={cat} aria-labelledby={`t-${cat}`} className="scroll-mt-24">
              <h2 id={`t-${cat}`} className="border-b-2 border-[var(--text)] pb-2 text-2xl font-bold">{nome}</h2>
              <ul className="divide-y divide-[var(--line)]">
                {items.map((l) => (
                  <li key={l.id} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:gap-8">
                    <div>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-lg font-bold hover:underline">
                        {l.titulo} <Icon name="link" className="h-4 w-4 text-[var(--action)]" />
                      </a>
                      <p className="text-sm text-[var(--muted)]">{l.orgao}</p>
                      <p className="mt-1">{l.descricao}</p>
                    </div>
                    <Status l={l} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Status({ l }: { l: Link }) {
  if (!l.ultima_verificacao_em) return <span className="text-sm text-[var(--muted)] sm:text-right">Aguardando 1ª verificação automática</span>;
  const quando = new Date(l.ultima_verificacao_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  if (l.falhas_consecutivas > 0)
    return <span className="text-sm font-bold text-[#8a5a00] dark:text-[#f0c060] sm:text-right">Fora do ar na verificação de {quando}</span>;
  return <span className="text-sm text-[var(--muted)] sm:text-right">No ar em {quando}</span>;
}
