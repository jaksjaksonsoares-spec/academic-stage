"use client";

import type { BlocoConteudo, DataEdital } from "@/lib/edital-analise";
import { PlanoEstudoForm } from "@/app/estudos/plano-form";

export function PlanoDoEdital({ editalId, titulo, conteudos, datas }: { editalId: string; titulo: string; conteudos: BlocoConteudo[]; datas: DataEdital[] }) {
  return (
    <>
      {conteudos.length === 0 && (
        <p className="mt-4 rounded-[var(--radius-control)] border border-dashed border-[var(--line)] p-4 text-sm">
          Não encontramos o conteúdo programático automaticamente. Copie os tópicos do anexo do edital para os campos abaixo.
        </p>
      )}
      <PlanoEstudoForm editalId={editalId} tituloInicial={`Estudos — ${titulo}`.slice(0, 160)} materiasIniciais={conteudos} sugestoesData={datas} />
    </>
  );
}
