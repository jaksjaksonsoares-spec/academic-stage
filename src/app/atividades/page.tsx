import type { Metadata } from "next";
import { ToolLanding } from "@/components/tool-landing";

export const metadata: Metadata = {
  title: "Criador de atividades",
  description: "Crie listas de exercícios, caça-palavras e cruzadinhas editáveis, com gabarito e exportação para PDF e Word.",
  alternates: { canonical: "/atividades" },
};

export default function Page() {
  return (
    <ToolLanding
      tipo="atividade"
      recursos={[
        "Questões de múltipla escolha, verdadeiro ou falso, associação e discursivas",
        "Caça-palavras gerado a partir das suas palavras, com direções configuráveis",
        "Cruzadinha montada automaticamente a partir de respostas e pistas",
        "Sortear outra grade para ter versões diferentes",
        "Gabarito em página separada",
        "Exportação para PDF e Word",
      ]}
      aviso="Nesta fase, você escreve o conteúdo e a plataforma monta, organiza e exporta. A geração de questões com inteligência artificial chega na fase 3, sempre identificada como sugestão para revisão."
    />
  );
}
