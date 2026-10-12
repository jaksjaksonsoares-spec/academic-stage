import Link from "next/link";
import { requireUser, type Profile } from "@/lib/session";
import { AREAS, PHASE_LABEL } from "@/lib/areas";
import { Icon } from "@/components/icon";
import { FormMessage } from "@/components/ui";

/** Liga cada interesse do onboarding às áreas que o atendem. */
const INTERESSE_PARA_AREAS: Record<string, string[]> = {
  "preparar-aulas": ["planejamento", "biblioteca"],
  "atividades-provas": ["atividades", "avaliacoes"],
  "encontrar-concursos": ["concursos", "editais"],
  "estudar-concursos": ["estudos", "editais"],
  cursos: ["formacao"],
  rotina: ["planejamento", "assistente"],
  inclusao: ["inclusao"],
  novidades: ["links", "biblioteca"],
};

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;

  const [{ data: profile }, { data: events }, { count: favCount }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("security_events").select("event_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const name = profile?.display_name || user.email?.split("@")[0] || "professor(a)";
  const interesses = profile?.interesses ?? [];
  const slugs = [...new Set(interesses.flatMap((i) => INTERESSE_PARA_AREAS[i] ?? []))];
  const recomendadas = AREAS.filter((a) => slugs.includes(a.slug));
  const perfilIncompleto = !profile?.uf || (profile?.etapas?.length ?? 0) === 0;

  return (
    <div className="space-y-10">
      {sp.senha === "atualizada" && <FormMessage status="success" message="Senha atualizada. As outras sessões foram encerradas." />}

      <header>
        <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-extrabold">Olá, {name}</h1>
        <p className="mt-2 text-[var(--muted)]">
          Este é o seu espaço. As ferramentas aparecem aqui conforme entram no ar.
        </p>
      </header>

      {!profile?.onboarding_completed_at && (
        <Callout icon="spark" title="Conte o que te interessa" action={{ href: "/boas-vindas", label: "Escolher interesses" }}>
          Leva menos de um minuto e deixa o painel com a sua cara.
        </Callout>
      )}

      {perfilIncompleto && profile?.onboarding_completed_at && (
        <Callout icon="user" title="Complete seu perfil" action={{ href: "/painel/perfil", label: "Completar perfil" }}>
          Com estado e etapa de ensino, vamos priorizar concursos e materiais da sua realidade quando eles chegarem.
        </Callout>
      )}

      <section aria-labelledby="para-voce">
        <h2 id="para-voce" className="text-xl font-bold">Para você</h2>
        {recomendadas.length === 0 ? (
          <p className="mt-3 text-[var(--muted)]">
            Escolha seus interesses para ver aqui as áreas que mais combinam com você.{" "}
            <Link href="/painel/preferencias" className="font-bold text-[var(--action)] underline">Escolher interesses</Link>
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {recomendadas.map((a) => (
              <li key={a.slug}>
                <Link href={`/${a.slug}`} className="lift flex h-full gap-4 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-5">
                  <Icon name={a.icon} className="h-6 w-6 shrink-0 text-[var(--action)]" />
                  <span>
                    <span className="block font-bold">{a.title}</span>
                    <span className="mt-1 block text-sm text-[var(--muted)]">
                      {a.status === "disponivel" ? a.description : `Chega na ${PHASE_LABEL[a.phase].toLowerCase()}.`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="salvos" className="rounded-[var(--radius-card)] border border-[var(--line)] p-6">
          <h2 id="salvos" className="text-lg font-bold">Itens salvos</h2>
          <p className="mt-2 text-[var(--muted)]">
            {favCount
              ? `${favCount} ${favCount === 1 ? "item salvo" : "itens salvos"}.`
              : "Quando a busca de concursos e a biblioteca entrarem no ar, o que você salvar aparece aqui."}
          </p>
        </section>

        <section aria-labelledby="atividade" className="rounded-[var(--radius-card)] border border-[var(--line)] p-6">
          <h2 id="atividade" className="text-lg font-bold">Atividade recente da conta</h2>
          {events && events.length > 0 ? (
            <ul className="mt-3 space-y-2 text-[0.95rem]">
              {events.map((e, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>{EVENT_LABEL[e.event_type] ?? e.event_type}</span>
                  <time dateTime={e.created_at} className="text-[var(--muted)]">
                    {new Date(e.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[var(--muted)]">Nenhum registro ainda.</p>
          )}
        </section>
      </div>
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  cadastro: "Conta criada",
  login: "Entrada na conta",
  logout: "Saída da conta",
  senha_redefinida: "Senha alterada",
  perfil_atualizado: "Perfil atualizado",
  dados_exportados: "Dados exportados",
  preferencias_atualizadas: "Notificações alteradas",
};

function Callout({ icon, title, children, action }: { icon: "spark" | "user"; title: string; children: React.ReactNode; action: { href: string; label: string } }) {
  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-[var(--color-ink)] p-6 text-white sm:flex-row sm:items-center">
      <Icon name={icon} className="h-7 w-7 shrink-0 text-[var(--color-spot)]" />
      <div className="flex-1">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-[#c3cce3]">{children}</p>
      </div>
      <Link href={action.href} className="rounded-[var(--radius-control)] bg-[var(--color-spot)] px-5 py-2.5 text-center font-bold text-[var(--color-midnight)]">
        {action.label}
      </Link>
    </section>
  );
}
