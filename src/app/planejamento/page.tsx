import type { Metadata } from "next";
import { ToolLanding } from "@/components/tool-landing";

export const metadata: Metadata = {
  title: "Laboratório de planejamento",
  description: "Monte planos de aula, planos semanais e mensais e sequências didáticas com as 12 seções essenciais e habilidades da BNCC conferidas.",
  alternates: { canonical: "/planejamento" },
};

export default function Page() {
  return (
    <ToolLanding
      tipo="plano"
      recursos={[
        "Plano de aula, semanal, mensal ou sequência didática",
        "As 12 seções: objetivos, habilidades, desenvolvimento, avaliação, intervenções e referências",
        "Habilidades da BNCC com conferência de formato, etapa e ano",
        "Desenvolvimento em etapas com tempo de cada uma",
        "Organização por turma, duplicação para reaproveitar",
        "Exportação para PDF e Word",
      ]}
      aviso="A plataforma não preenche códigos nem descrições da BNCC: você copia do documento oficial e nós conferimos se o código é válido para a etapa e o ano. Verifique também as diretrizes curriculares da sua rede de ensino."
    />
  );
}
