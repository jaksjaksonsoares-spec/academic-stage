import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { emailConfigurado, destinoSuporte } from "@/lib/email";
import { iaConfigurada } from "@/lib/ia";

type Metricas = Record<string, number>;

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_metricas");
  const m = (data ?? {}) as Metricas;

  const cards: { rotulo: string; valor: number | undefined; detalhe?: string; href?: string; alerta?: boolean }[] = [
    { rotulo: "Usuários", valor: m.usuarios, detalhe: `${m.usuarios_7d ?? 0} novos e ${m.ativos_7d ?? 0} ativos em 7 dias`, href: "/admin/usuarios" },
    { rotulo: "Atendimentos abertos", valor: m.suporte_abertas, detalhe: m.suporte_email_falhou ? `${m.suporte_email_falhou} sem aviso por e-mail` : undefined, href: "/admin/suporte", alerta: (m.suporte_abertas ?? 0) > 0 },
    { rotulo: "Concursos publicados", valor: m.concursos_publicados, detalhe: `${m.concursos_verificacao_pendente ?? 0} precisam de nova verificação`, href: "/admin/concursos", alerta: (m.concursos_verificacao_pendente ?? 0) > 0 },
    { rotulo: "Links fora do ar", valor: m.links_fora_do_ar, href: "/admin/links", alerta: (m.links_fora_do_ar ?? 0) > 0 },
    { rotulo: "Falhas nas últimas 24h", valor: m.erros_24h, href: "/admin/erros", alerta: (m.erros_24h ?? 0) > 0 },
    { rotulo: "Uso de IA hoje", valor: m.ia_hoje },
    { rotulo: "Documentos criados", valor: m.documentos },
    { rotulo: "Planos de estudo", valor: m.planos_estudo, detalhe: `${m.editais_analisados ?? 0} editais analisados` },
  ];

  const servicos = [
    { nome: "E-mail transacional", ok: emailConfigurado(), falta: "RESEND_API_KEY e EMAIL_FROM" },
    { nome: "Destino do atendimento", ok: !!destinoSuporte(), falta: "SUPPORT_EMAIL_TO" },
    { nome: "Inteligência artificial", ok: iaConfigurada(), falta: "ANTHROPIC_API_KEY" },
    { nome: "Rotinas agendadas", ok: !!process.env.CRON_SECRET, falta: "CRON_SECRET" },
    { nome: "Antispam do formulário", ok: !!process.env.FORM_SECRET, falta: "FORM_SECRET" },
    { nome: "Chave de serviço", ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY, falta: "SUPABASE_SERVICE_ROLE_KEY" },
  ];

  return (
    <div className="space-y-10">
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Visão geral</h1>
      {error && <p role="alert" className="font-bold text-[var(--color-danger)]">Não foi possível carregar as métricas.</p>}

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const conteudo = (
            <>
              <dt className="text-sm text-[var(--muted)]">{c.rotulo}</dt>
              <dd className={`font-[family-name:var(--font-display)] text-4xl font-extrabold ${c.alerta ? "text-[var(--color-danger)]" : ""}`}>{c.valor ?? "—"}</dd>
              {c.detalhe && <dd className="text-sm text-[var(--muted)]">{c.detalhe}</dd>}
            </>
          );
          return c.href ? (
            <Link key={c.rotulo} href={c.href} className="lift block rounded-[var(--radius-card)] border border-[var(--line)] p-5">{conteudo}</Link>
          ) : (
            <div key={c.rotulo} className="rounded-[var(--radius-card)] border border-[var(--line)] p-5">{conteudo}</div>
          );
        })}
      </dl>

      <section aria-labelledby="servicos">
        <h2 id="servicos" className="text-xl font-bold">Serviços externos</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Indica se a configuração existe, não se o serviço está respondendo. Use a rota /api/saude para monitoramento.</p>
        <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {servicos.map((s) => (
            <li key={s.nome} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-bold">{s.nome}</span>
              {s.ok ? <span className="font-bold text-[var(--color-success)]">Configurado</span> : <span className="text-sm font-bold text-[var(--color-danger)]">Pendente — defina {s.falta}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
