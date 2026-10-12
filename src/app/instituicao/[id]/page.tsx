import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { TIPOS_RECURSO } from "@/lib/biblioteca";
import { FormMessage } from "@/components/ui";
import { alterarMembro, excluirOrganizacao, revogarConvite } from "../actions";
import { NovoConvite } from "../forms";

export const metadata: Metadata = { title: "Organização", robots: { index: false } };

type Membro = { user_id: string; nome: string; email: string | null; papel: string; desde: string };

export default async function OrgPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ bemvindo?: string; ok?: string; erro?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const { supabase, user } = await requireUser(`/instituicao/${id}`);
  const { data: org } = await supabase.from("organizacoes").select("*").eq("id", id).maybeSingle();
  if (!org) notFound();
  const { data: gestor } = await supabase.rpc("is_org_gestor", { _org: id });
  const [{ data: membrosRaw }, { data: materiais }, { data: convites }] = await Promise.all([
    supabase.rpc("membros_organizacao", { _org: id }),
    supabase.from("recursos").select("id,titulo,tipo,autor_nome,created_at").eq("org_id", id).eq("status", "publicado").order("created_at", { ascending: false }).limit(200),
    gestor ? supabase.from("org_convites").select("id,papel,expira_em,usos,usos_max,revogado").eq("org_id", id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
  ]);
  const membros = (membrosRaw ?? []) as Membro[];
  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/instituicao" className="text-sm text-[var(--muted)] hover:underline">Escolas e redes</Link>
      <h1 className="mt-3 text-[clamp(1.9rem,4.5vw,2.75rem)] font-extrabold">{org.nome}</h1>
      <p className="mt-1 text-[var(--muted)]">
        {org.tipo === "escola" ? "Escola" : org.tipo === "rede" ? "Rede de ensino" : "Instituição"}{org.municipio ? ` · ${org.municipio}` : ""}{org.uf ? `/${org.uf}` : ""} ·{" "}
        {org.plano_ativo ? <strong className="text-[var(--color-success)]">plano institucional ativo</strong> : "plano gratuito"}
      </p>
      <div className="mt-4 space-y-2">
        {sp.bemvindo && <FormMessage status="success" message="Você agora faz parte desta organização." />}
        {sp.ok && <FormMessage status="success" message="Alteração salva." />}
        {sp.erro === "gestor" && <FormMessage status="error" message="A organização precisa de pelo menos um gestor. Nomeie outra pessoa antes." />}
        {sp.erro === "confirmacao" && <FormMessage status="error" message="Digite EXCLUIR para confirmar." />}
        {sp.erro === "membro" && <FormMessage status="error" message="Não foi possível alterar o membro." />}
      </div>

      <section aria-labelledby="mat" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="mat" className="text-2xl font-bold">Biblioteca da organização</h2>
          <Link href="/biblioteca/compartilhar" className="rounded-[var(--radius-control)] bg-[var(--action)] px-4 py-2 font-bold text-[var(--action-text)]">Compartilhar material</Link>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">Visível só para os membros. Ao compartilhar, escolha “Só para {org.nome}”. Modelos institucionais (planos, provas, comunicados padrão) também ficam aqui.</p>
        {(materiais ?? []).length === 0 ? <p className="mt-3 text-[var(--muted)]">Nenhum material ainda.</p> : (
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {(materiais ?? []).map((m) => (
              <li key={m.id}><Link href={`/biblioteca/${m.id}`} className="flex flex-wrap justify-between gap-2 py-3 hover:underline"><span className="font-bold">{m.titulo}</span><span className="text-sm text-[var(--muted)]">{TIPOS_RECURSO[m.tipo as keyof typeof TIPOS_RECURSO]} · {m.autor_nome ?? "—"} · {fmt(m.created_at)}</span></Link></li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="membros" className="mt-12">
        <h2 id="membros" className="text-2xl font-bold">Membros ({membros.length})</h2>
        <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {membros.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span><strong>{m.nome}</strong>{m.user_id === user.id && " (você)"}{m.email && <span className="block text-sm text-[var(--muted)]">{m.email}</span>}</span>
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold">{m.papel === "gestor" ? "Gestão" : "Membro"}</span>
                {gestor && m.user_id !== user.id && (
                  <>
                    <form action={alterarMembro}><input type="hidden" name="org" value={id} /><input type="hidden" name="membro" value={m.user_id} /><input type="hidden" name="acao" value={m.papel === "gestor" ? "tornar_membro" : "tornar_gestor"} /><button type="submit" className="rounded-lg border border-[var(--line)] px-2 py-1">{m.papel === "gestor" ? "Tornar membro" : "Tornar gestor"}</button></form>
                    <form action={alterarMembro}><input type="hidden" name="org" value={id} /><input type="hidden" name="membro" value={m.user_id} /><input type="hidden" name="acao" value="remover" /><button type="submit" className="rounded-lg border border-[var(--line)] px-2 py-1 text-[var(--color-danger)]">Remover</button></form>
                  </>
                )}
                {m.user_id === user.id && (
                  <form action={alterarMembro}><input type="hidden" name="org" value={id} /><input type="hidden" name="membro" value={m.user_id} /><input type="hidden" name="acao" value="sair" /><button type="submit" className="rounded-lg border border-[var(--line)] px-2 py-1">Sair da organização</button></form>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {gestor && (
        <>
          <section aria-labelledby="convites" className="mt-12">
            <h2 id="convites" className="text-2xl font-bold">Convidar pessoas</h2>
            <p className="mt-1 mb-4 text-sm text-[var(--muted)]">Envie o link pelo canal da escola. Quem abrir precisa entrar ou criar conta e confirmar a entrada.</p>
            <NovoConvite org={id} />
            {(convites ?? []).length > 0 && (
              <ul className="mt-6 space-y-2 text-sm">
                {(convites ?? []).map((c) => {
                  const ativo = !c.revogado && new Date(c.expira_em) > new Date() && c.usos < c.usos_max;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3">
                      <span>Convite para {c.papel === "gestor" ? "gestão" : "membro"} · {c.usos} uso(s) · {ativo ? `válido até ${fmt(c.expira_em)}` : c.revogado ? "revogado" : "encerrado"}</span>
                      {ativo && <form action={revogarConvite}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="org" value={id} /><button type="submit" className="font-bold text-[var(--color-danger)] underline">Revogar</button></form>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="excluir" className="mt-12 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-danger)_45%,transparent)] p-6">
            <h2 id="excluir" className="text-xl font-bold text-[var(--color-danger)]">Excluir organização</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Remove todos os membros e a biblioteca interna. Os documentos pessoais de cada membro não são afetados.</p>
            <form action={excluirOrganizacao} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="org" value={id} />
              <label className="block text-sm">Digite EXCLUIR<input name="confirmar" autoComplete="off" className="field mt-1 py-2" /></label>
              <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--color-danger)] px-4 py-2.5 font-bold text-white">Excluir</button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
