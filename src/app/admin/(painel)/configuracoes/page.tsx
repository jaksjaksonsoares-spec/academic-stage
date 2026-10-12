import { requireAdmin } from "@/lib/session";
import { LimitesForm } from "./limites-form";

type Limites = Record<"gratuito" | "profissional" | "institucional", { assistente: number; edital: number }>;

export default async function ConfiguracoesPage() {
  const { supabase } = await requireAdmin("/admin/configuracoes");
  const { data } = await supabase.from("config_plataforma").select("valor,updated_at").eq("chave", "limites_ia").maybeSingle();
  const padrao: Limites = { gratuito: { assistente: 20, edital: 3 }, profissional: { assistente: 150, edital: 20 }, institucional: { assistente: 300, edital: 40 } };
  const v = { ...padrao, ...((data?.valor ?? {}) as Partial<Limites>) };

  return (
    <div className="space-y-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Configurações</h1>
      <section aria-labelledby="ia">
        <h2 id="ia" className="text-xl font-bold">Limites diários de IA por plano</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Controlam o custo com a API de IA. Os planos pagos ainda não são vendidos; todos os usuários estão no gratuito até a cobrança ser ativada.
          {data?.updated_at && ` Última alteração em ${new Date(data.updated_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`}
        </p>
        <LimitesForm limites={v} />
      </section>
    </div>
  );
}
