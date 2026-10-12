import type { Metadata } from "next";
import { ToolLanding } from "@/components/tool-landing";

export const metadata: Metadata = {
  title: "Provas e avaliações",
  description: "Monte provas com cabeçalho da escola, pontuação, versões equivalentes, gabarito separado e exportação para PDF e Word.",
  alternates: { canonical: "/avaliacoes" },
};

export default function Page() {
  return (
    <ToolLanding
      tipo="avaliacao"
      recursos={[
        "Cabeçalho com escola, turma, professor, data e bimestre ou trimestre",
        "Questões objetivas e discursivas, com pontos e dificuldade",
        "Até 4 versões equivalentes, com questões e alternativas embaralhadas",
        "Gabarito separado com resolução comentada e critérios de correção",
        "Fonte, tamanho e espaçamento ajustáveis; versão ampliada e econômica em tinta",
        "Aviso de questões sem alternativa correta antes de imprimir",
      ]}
      aviso="Questões com imagens e tabelas chegam junto com o armazenamento de arquivos. Por enquanto, as questões são de texto."
    />
  );
}
