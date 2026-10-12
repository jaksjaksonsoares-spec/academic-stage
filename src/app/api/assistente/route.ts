import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { iaConfigurada, IAError, streamAssistente } from "@/lib/ia";
import { consultarCota, registrarUso } from "@/lib/limites";
import { detectarDadosPessoais, descreverAchados } from "@/lib/dados-pessoais";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  mensagens: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(12000) }))
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1].role === "user", "A última mensagem precisa ser do usuário."),
});

function erro(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  if (!iaConfigurada()) return erro("O assistente ainda não foi ativado nesta plataforma.", 503);
  const { supabase, user } = await getUser();
  if (!supabase || !user) return erro("Entre na sua conta para usar o assistente.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erro("Requisição inválida.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return erro("Conversa inválida ou longa demais. Comece uma nova conversa.", 400);

  // Dados pessoais de estudantes não saem da plataforma.
  const ultima = parsed.data.mensagens[parsed.data.mensagens.length - 1].content;
  const achados = detectarDadosPessoais(ultima);
  if (achados.length > 0) return erro(descreverAchados(achados), 422);

  const cota = await consultarCota(supabase, user.id, "assistente");
  if (cota.restantes <= 0) return erro(`Você usou as ${cota.limite} mensagens de hoje. A cota renova amanhã.`, 429);
  await registrarUso(supabase, "assistente");

  try {
    const gen = await streamAssistente(parsed.data.mensagens, { signal: req.signal });
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { value, done } = await gen.next();
          if (done) controller.close();
          else controller.enqueue(enc.encode(value));
        } catch {
          controller.enqueue(enc.encode("\n\n[A resposta foi interrompida. Tente novamente.]"));
          controller.close();
        }
      },
      cancel() {
        void gen.return(undefined);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Cota-Restante": String(cota.restantes - 1),
      },
    });
  } catch (e) {
    return erro(e instanceof IAError ? e.message : "Não foi possível falar com o assistente agora.", e instanceof IAError && e.status === 429 ? 429 : 502);
  }
}
