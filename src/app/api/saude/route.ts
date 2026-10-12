import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailConfigurado } from "@/lib/email";
import { iaConfigurada } from "@/lib/ia";

export const dynamic = "force-dynamic";

/**
 * Verificação de saúde para monitores de disponibilidade (UptimeRobot,
 * Better Stack…). Responde 200 se o banco respondeu e 503 se não.
 * Não expõe segredos — só se cada serviço está configurado.
 */
export async function GET() {
  const inicio = Date.now();
  let banco: "ok" | "falhou" | "nao_configurado" = "nao_configurado";
  const supabase = await createClient();
  if (supabase) {
    const { error } = await supabase.from("config_plataforma").select("chave").limit(1);
    banco = error ? "falhou" : "ok";
  }
  const corpo = {
    status: banco === "ok" ? "ok" : "degradado",
    banco,
    email: emailConfigurado() ? "configurado" : "nao_configurado",
    ia: iaConfigurada() ? "configurada" : "nao_configurada",
    tempo_ms: Date.now() - inicio,
    em: new Date().toISOString(),
  };
  return NextResponse.json(corpo, { status: banco === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
