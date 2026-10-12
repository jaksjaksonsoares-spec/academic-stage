import { requireAdmin } from "@/lib/session";
import { LimitesForm } from "./limites-form";

type Plano = "gratuito" | "profissional" | "institucional";
const PLANOS: Plano[] = ["gratuito", "profissional", "institucional"];
const PADRAO_IA = { gratuito: { assistente: 20, edital: 3 }, profissional: { assistente: 150, edital: 20 }, institucional: { assistente: 300, edital: 40 } };
const PADRAO_DOC = { gratuito: 300, profissional: 3000, institucional: 3000 };

export default async function ConfiguracoesPage() {
  const { supabase } = await requireAdmin("/admin/configuracoes");
  const { data } = await supabase.from("config_plataforma").select("chave,valor,updated_at").in("chave", ["limites_ia", "limites_planos"]);
  const ia = (data?.find((d) => d.chave === "limites_ia")?.valor ?? {}) as Partial<Record<Plano, { assistente?: number; edital?: number }>>;
  const pl = (data?.find((d) => d.chave === "limites_planos")?.valor ?? {}) as Partial<Record<Plano, { documentos?: number }>>;
  const limites = Object.fromEntries(
    PLANOS.map((p) => [p, {
      assistente: ia[p]?.assistente ?? PADRAO_IA[p].assistente,
      edital: ia[p]?.edital ?? PADRAO_IA[p].edital,
      documentos: pl[p]?.documentos ?? PADRAO_DOC[p],
    }]),
  ) as Record<Plano, { assistente: number; edital: number; documentos: number }>;
  const ultima = data?.map((d) => d.updated_at).sort().at(-1);

  return (
    <div className="space-y-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Configurações</h1>
      <section aria-labelledby="ia">
        <h2 id="ia" className="text-xl font-bold">Limites por plano</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          IA: limites diários (controlam o custo com a API). Documentos: total salvo por conta. Não há cobrança ativa; os planos Profissional e Institucional
          só valem quando a administração os atribui a uma pessoa ou ativa numa organização. Estes números aparecem na página pública de planos.
          {ultima && ` Última alteração em ${new Date(ultima).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`}
        </p>
        <LimitesForm limites={limites} />
      </section>
    </div>
  );
}
