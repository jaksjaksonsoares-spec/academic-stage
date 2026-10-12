"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { MODELOS_INCLUSAO, type ModeloInclusao } from "@/lib/inclusao";
import { lerConteudo, type Atividade, type Avaliacao } from "@/lib/documentos";
import { limiteDocumentos } from "@/lib/limites";

export async function criarModelo(fd: FormData) {
  const { supabase } = await requireUser("/inclusao");
  const modelo = z.enum(Object.keys(MODELOS_INCLUSAO) as [ModeloInclusao, ...ModeloInclusao[]]).parse(fd.get("modelo"));
  if ((await limiteDocumentos(supabase)).restantes <= 0) redirect("/inclusao?erro=limite");
  const m = MODELOS_INCLUSAO[modelo];
  const { data } = await supabase.from("documentos").insert({ tipo: "texto", titulo: m.titulo, conteudo: { corpo: m.corpo, origem: "" } }).select("id").single();
  if (!data) redirect("/inclusao?erro=criar");
  revalidatePath("/painel/documentos");
  redirect(`/painel/documentos/${data.id}`);
}

const adaptarSchema = z.object({
  id: z.string().uuid(),
  apoios: z.string().trim().max(1500).optional().default(""),
  tamanho: z.enum(["14", "16", "18"]).default("16"),
});

/**
 * Cria uma versão adaptada de uma atividade ou prova: letra maior, fonte de
 * alta legibilidade, espaçamento amplo e instruções de apoio escritas pelo
 * professor. O original não é alterado. O conteúdo das questões é revisado
 * pelo professor no editor — a plataforma não muda o objetivo de aprendizagem.
 */
export async function adaptarDocumento(fd: FormData) {
  const { supabase } = await requireUser("/inclusao");
  const p = adaptarSchema.parse(Object.fromEntries(fd.entries()));
  if ((await limiteDocumentos(supabase)).restantes <= 0) redirect("/inclusao?erro=limite");
  const { data: doc } = await supabase.from("documentos").select("tipo,titulo,turma_id,conteudo").eq("id", p.id).maybeSingle();
  if (!doc || (doc.tipo !== "atividade" && doc.tipo !== "avaliacao")) redirect("/inclusao?erro=tipo");

  let conteudo: Atividade | Avaliacao;
  if (doc.tipo === "avaliacao") {
    const a = lerConteudo("avaliacao", doc.conteudo) as Avaliacao;
    conteudo = {
      ...a,
      versoes: 1,
      layout: { ...a.layout, fonte: "legivel", tamanho: p.tamanho, espacamento: "amplo" },
      instrucoes: [a.instrucoes, p.apoios].filter(Boolean).join("\n\n"),
      questoes: a.questoes.map((q) => (q.tipo === "discursiva" ? { ...q, linhas: Math.min(40, q.linhas + 3) } : q)),
    };
  } else {
    const a = lerConteudo("atividade", doc.conteudo) as Atividade;
    conteudo = {
      ...a,
      instrucoes: [a.instrucoes, p.apoios].filter(Boolean).join("\n\n"),
      tamanhoGrade: Math.min(a.tamanhoGrade, 12),
      direcoes: a.direcoes.filter((d) => d === "horizontal" || d === "vertical"),
      questoes: a.questoes.map((q) => (q.tipo === "discursiva" ? { ...q, linhas: Math.min(40, q.linhas + 3) } : q)),
    };
  }

  const { data } = await supabase
    .from("documentos")
    .insert({ tipo: doc.tipo, titulo: `${doc.titulo} (versão adaptada)`.slice(0, 160), turma_id: doc.turma_id, conteudo })
    .select("id")
    .single();
  if (!data) redirect("/inclusao?erro=criar");
  revalidatePath("/painel/documentos");
  redirect(`/painel/documentos/${data.id}?adaptado=1`);
}
