import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Limites diários por plano. Valores configuráveis aqui; os planos pagos
 * ainda não são vendidos, mas a estrutura já respeita o plano do perfil.
 */
export const LIMITES_DIARIOS = {
  gratuito: { assistente: 20, edital: 3 },
  profissional: { assistente: 150, edital: 20 },
  institucional: { assistente: 300, edital: 40 },
} as const;

export type Recurso = "assistente" | "edital";
type Plano = keyof typeof LIMITES_DIARIOS;

function inicioDoDiaSaoPaulo(now = new Date()): string {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
  return new Date(`${dia}T00:00:00-03:00`).toISOString();
}

export async function consultarCota(supabase: SupabaseClient, userId: string, recurso: Recurso) {
  const [{ data: planoEf }, { count }, { data: config }] = await Promise.all([
    supabase.rpc("plano_efetivo"),
    supabase.from("ia_uso").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("recurso", recurso).gte("created_at", inicioDoDiaSaoPaulo()),
    supabase.from("config_plataforma").select("valor").eq("chave", "limites_ia").maybeSingle(),
  ]);
  const plano = (typeof planoEf === "string" && planoEf in LIMITES_DIARIOS ? planoEf : "gratuito") as Plano;
  // Valor configurado no painel administrativo; sem ele, vale o padrão do código.
  const configurado = (config?.valor as Record<string, Record<string, unknown>> | undefined)?.[plano]?.[recurso];
  const limite = typeof configurado === "number" && configurado >= 0 ? configurado : LIMITES_DIARIOS[plano][recurso];
  const usados = count ?? 0;
  return { limite, usados, restantes: Math.max(0, limite - usados) };
}

export async function registrarUso(supabase: SupabaseClient, recurso: Recurso) {
  await supabase.from("ia_uso").insert({ recurso });
}

export const LIMITE_DOCUMENTOS_PADRAO = { gratuito: 300, profissional: 3000, institucional: 3000 } as const;

/** Quantos documentos a pessoa ainda pode criar, pelo plano efetivo. */
export async function limiteDocumentos(supabase: SupabaseClient) {
  const [{ data: planoEf }, { data: config }, { count }] = await Promise.all([
    supabase.rpc("plano_efetivo"),
    supabase.from("config_plataforma").select("valor").eq("chave", "limites_planos").maybeSingle(),
    supabase.from("documentos").select("id", { count: "exact", head: true }),
  ]);
  const plano = (typeof planoEf === "string" && planoEf in LIMITE_DOCUMENTOS_PADRAO ? planoEf : "gratuito") as keyof typeof LIMITE_DOCUMENTOS_PADRAO;
  const conf = (config?.valor as Record<string, Record<string, unknown>> | undefined)?.[plano]?.documentos;
  const limite = typeof conf === "number" && conf >= 0 ? conf : LIMITE_DOCUMENTOS_PADRAO[plano];
  return { plano, limite, usados: count ?? 0, restantes: Math.max(0, limite - (count ?? 0)) };
}
