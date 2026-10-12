import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  REGIOES,
  hojeSaoPaulo,
  situacaoConcurso,
  type Filtros,
  type Situacao,
} from "./concursos";

export const POR_PAGINA = 20;

export type CargoRow = {
  cargo: string;
  area: string;
  escolaridade: string;
  formacao_exigida: string | null;
  requisitos: string | null;
  vagas: number | null;
  cadastro_reserva: boolean;
  remuneracao: number | null;
  carga_horaria: string | null;
  regime: string | null;
};

export type ConcursoRow = {
  id: string;
  slug: string;
  titulo: string;
  orgao: string;
  esfera: string;
  uf: string;
  municipio: string | null;
  tipo_selecao: string;
  fase: "previsto" | "edital_publicado" | "encerrado" | "suspenso" | "cancelado";
  banca: string | null;
  modalidade: string | null;
  data_publicacao: string | null;
  inscricao_inicio: string | null;
  inscricao_fim: string | null;
  data_prova: string | null;
  taxa_inscricao: number | null;
  edital_url: string | null;
  inscricao_url: string | null;
  fonte_nome: string;
  fonte_url: string;
  conteudo_programatico: string | null;
  observacoes: string | null;
  publicado: boolean;
  ultima_verificacao_em: string | null;
  updated_at: string;
  concurso_cargos: CargoRow[];
};

export function situacaoDe(c: Pick<ConcursoRow, "fase" | "inscricao_inicio" | "inscricao_fim" | "ultima_verificacao_em">, hoje = hojeSaoPaulo()): Situacao {
  return situacaoConcurso(c.fase, c.inscricao_inicio, c.inscricao_fim, c.ultima_verificacao_em, hoje);
}

export async function buscarConcursos(f: Filtros) {
  const supabase = await createClient();
  if (!supabase) return { configured: false as const, rows: [] as (ConcursoRow & { situacao: Situacao })[], total: 0 };

  const { data: page, error } = await supabase.rpc("buscar_concursos", {
    _q: f.q ?? null,
    _ufs: f.uf ? [f.uf] : f.regiao ? REGIOES[f.regiao] : null,
    _tipo: f.tipo ?? null,
    _modalidade: f.modalidade ?? null,
    _banca: f.banca ?? null,
    _ate: f.ate ?? null,
    _area: f.area ?? null,
    _escolaridade: f.escolaridade ?? null,
    _regime: f.regime ?? null,
    _salario: f.salario ?? null,
    _situacao: f.situacao ?? null,
    _limit: POR_PAGINA,
    _offset: (f.pagina - 1) * POR_PAGINA,
  });

  if (error) {
    console.error("[buscarConcursos]", error.code);
    return { configured: true as const, rows: [], total: 0, error: true as const };
  }

  const ordem = (page ?? []) as { id: string; situacao: Situacao; total: number }[];
  if (ordem.length === 0) return { configured: true as const, rows: [], total: 0 };

  const { data, error: e2 } = await supabase
    .from("concursos")
    .select("*, concurso_cargos(cargo,area,escolaridade,formacao_exigida,requisitos,vagas,cadastro_reserva,remuneracao,carga_horaria,regime)")
    .in("id", ordem.map((o) => o.id));

  if (e2) return { configured: true as const, rows: [], total: 0, error: true as const };

  const byId = new Map(((data ?? []) as ConcursoRow[]).map((c) => [c.id, c]));
  const rows = ordem.filter((o) => byId.has(o.id)).map((o) => ({ ...byId.get(o.id)!, situacao: o.situacao }));
  return { configured: true as const, rows, total: Number(ordem[0].total) };
}

export async function obterConcurso(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("concursos")
    .select("*, concurso_cargos(*), concurso_verificacoes(verificado_em,fonte_url,observacao)")
    .eq("slug", slug)
    .eq("publicado", true)
    .order("verificado_em", { referencedTable: "concurso_verificacoes", ascending: false })
    .maybeSingle();
  return data as (ConcursoRow & { concurso_verificacoes: { verificado_em: string; fonte_url: string; observacao: string | null }[] }) | null;
}
