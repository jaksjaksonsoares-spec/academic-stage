/**
 * Registra falhas do servidor na tabela erros_app (visível no painel
 * administrativo). Guarda só a rota, a mensagem e o código digest — nada
 * de corpo de requisição, cabeçalhos ou dados pessoais.
 */
export async function register() {}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    if (!admin) return;
    const e = err as { message?: string; digest?: string };
    const rota = `${request.method} ${request.path.split("?")[0]}`.slice(0, 300);
    const mensagem = (e?.message ?? "Erro desconhecido").replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]").slice(0, 1000);
    await admin.from("erros_app").insert({ rota, mensagem, digest: e?.digest?.slice(0, 100) ?? null });
  } catch {
    // Registrar a falha nunca pode causar outra falha.
  }
}
