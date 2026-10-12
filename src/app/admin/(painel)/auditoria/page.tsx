import { requireAdmin } from "@/lib/session";

const ACOES: Record<string, string> = {
  papel_concedido: "Papel concedido",
  papel_removido: "Papel removido",
  suporte_respondido: "Atendimento respondido",
  suporte_atualizado: "Atendimento atualizado",
  anexo_baixado: "Anexo baixado",
  link_criado: "Link criado",
  link_editado: "Link editado",
  link_excluido: "Link excluído",
  config_alterada: "Configuração alterada",
  concurso_criado: "Concurso criado",
  concurso_editado: "Concurso editado",
  concurso_verificado: "Verificação registrada",
  concurso_publicado: "Concurso publicado",
  concurso_despublicado: "Concurso despublicado",
  concurso_excluido: "Concurso excluído",
};

export default async function AuditoriaPage() {
  const { supabase } = await requireAdmin("/admin/auditoria");
  const { data } = await supabase.from("auditoria").select("id,ator_id,acao,alvo_tipo,alvo_id,detalhes,created_at").order("created_at", { ascending: false }).limit(300);
  const atores = [...new Set((data ?? []).map((a) => a.ator_id).filter(Boolean))] as string[];
  const { data: perfis } = atores.length ? await supabase.rpc("admin_usuarios", { _limit: 100 }) : { data: [] };
  const nome = new Map(((perfis ?? []) as { id: string; email: string }[]).map((p) => [p.id, p.email]));

  return (
    <div className="space-y-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Auditoria</h1>
      <p className="max-w-2xl text-[var(--muted)]">Registro das ações administrativas e editoriais. Não pode ser alterado nem apagado pelo painel.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b-2 border-[var(--text)]"><tr><th className="py-2 pr-4">Quando</th><th className="py-2 pr-4">Quem</th><th className="py-2 pr-4">Ação</th><th className="py-2">Alvo</th></tr></thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id} className="border-b border-[var(--line)] align-top">
                <td className="py-2 pr-4 whitespace-nowrap">{new Date(a.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</td>
                <td className="py-2 pr-4">{a.ator_id ? nome.get(a.ator_id) ?? a.ator_id.slice(0, 8) : "—"}</td>
                <td className="py-2 pr-4 font-bold">{ACOES[a.acao] ?? a.acao}</td>
                <td className="py-2"><span className="font-mono">{[a.alvo_tipo, a.alvo_id].filter(Boolean).join(" · ")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
