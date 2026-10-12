import Link from "next/link";
import { AREAS, AREA_GROUPS, PHASE_LABEL } from "@/lib/areas";
import { Spotlight } from "@/components/spotlight";
import { Icon } from "@/components/icon";

const CURRENT_PHASE = 3;

const PHASES: { n: 1 | 2 | 3 | 4 | 5; what: string }[] = [
  { n: 1, what: "Conta segura, painel pessoal, preferências e seus dados sob seu controle." },
  { n: 2, what: "Busca de concursos com fonte oficial, links úteis, planos de aula, atividades e provas." },
  { n: 3, what: "Assistente pedagógico, leitura de editais em PDF e cronogramas de estudo." },
  { n: 4, what: "Atendimento com protocolo por e-mail, painel administrativo e verificação de fontes." },
  { n: 5, what: "Biblioteca colaborativa, formação continuada, inclusão e planos para escolas." },
];

export default function HomePage() {
  return (
    <>
      <Spotlight className="-mt-px">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-32 lg:pt-24">
          <div>
            <h1 className="rise text-[clamp(2.6rem,6.5vw,5rem)] font-extrabold text-white">
              Menos tempo procurando.
              <span className="block text-[var(--color-spot)]">Mais tempo ensinando.</span>
            </h1>
            <p className="rise rise-2 mt-6 max-w-xl text-lg text-[#c3cce3] sm:text-xl">
              Concursos com link para o edital oficial, ferramentas para planejar aulas e avaliações e um painel para organizar a
              sua carreira — num só lugar, feito para quem trabalha com educação no Brasil.
            </p>

            <form action="/busca" method="get" role="search" className="rise rise-3 mt-9 max-w-xl">
              <label htmlFor="q-hero" className="sr-only">
                Buscar na plataforma
              </label>
              <div className="flex rounded-[14px] bg-white p-1.5 shadow-[var(--shadow-float)]">
                <Icon name="search" className="ml-3 h-5 w-5 self-center text-[var(--color-slate)]" />
                <input
                  id="q-hero"
                  name="q"
                  type="search"
                  placeholder="Concurso, plano de aula, BNCC, prova…"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[var(--color-ink)] placeholder:text-[var(--color-slate)] focus:outline-none"
                />
                <button type="submit" className="rounded-[10px] bg-[var(--color-ink)] px-5 font-bold text-white hover:bg-[#13285e]">
                  Buscar
                </button>
              </div>
            </form>

            <div className="rise rise-4 mt-6 flex flex-wrap gap-3">
              <Link href="/cadastro" className="rounded-[var(--radius-control)] bg-[var(--color-spot)] px-5 py-3 font-bold text-[var(--color-midnight)] hover:brightness-110">
                Criar conta gratuita
              </Link>
              <a href="#roteiro" className="rounded-[var(--radius-control)] px-5 py-3 font-bold text-white ring-1 ring-white/25 hover:bg-white/10">
                Ver o que já funciona
              </a>
            </div>
          </div>

          <StageComposition />
        </div>
      </Spotlight>

      {/* Atalhos por área */}
      <section aria-labelledby="areas-titulo" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 id="areas-titulo" className="text-[clamp(1.9rem,3.5vw,2.75rem)] font-bold">
            Comece pelo que você precisa hoje
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            Cada área mostra se já está disponível ou em que fase chega. Nada aparece como pronto antes de funcionar.
          </p>
        </div>

        <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {AREA_GROUPS.map((group) => (
            <div key={group}>
              <h3 className="border-b-2 border-[var(--text)] pb-2 text-xl font-bold">{group}</h3>
              <ul>
                {AREAS.filter((a) => a.group === group).map((a) => (
                  <li key={a.slug} className="border-b border-[var(--line)]">
                    <Link href={`/${a.slug}`} className="group flex items-start gap-4 py-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--action)_12%,transparent)] text-[var(--action)]">
                        <Icon name={a.icon} />
                      </span>
                      <span className="flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-3">
                          <span className="font-bold group-hover:underline group-hover:underline-offset-4">{a.title}</span>
                          <span className="text-sm text-[var(--muted)]">
                            {a.status === "disponivel" ? "Disponível" : `Fase ${a.phase}`}
                          </span>
                        </span>
                        <span className="mt-1 block text-[0.97rem] text-[var(--muted)]">{a.description}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Compromissos de confiança */}
      <section aria-labelledby="confianca-titulo" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 rounded-[var(--radius-stage)] bg-[var(--surface)] p-8 shadow-[var(--shadow-lift)] sm:p-12 lg:grid-cols-[0.9fr_1.1fr]">
          <h2 id="confianca-titulo" className="text-[clamp(1.8rem,3vw,2.5rem)] font-bold">
            Informação que você pode conferir
          </h2>
          <dl className="grid gap-6 sm:grid-cols-2">
            {[
              ["Fonte sempre visível", "Todo concurso e curso traz o link oficial e a data em que foi verificado pela última vez."],
              ["Nada inventado", "Sem vagas, salários, datas ou códigos da BNCC preenchidos por suposição. Se falta informação, mostramos que falta."],
              ["Seus dados, suas regras", "Exporte ou exclua sua conta a qualquer momento. Não pedimos dados de estudantes."],
              ["IA com identificação", "O que a IA escreve vem marcado como sugestão e separado de fatos verificáveis. Dados de estudantes não são enviados."],
            ].map(([t, d]) => (
              <div key={t}>
                <dt className="font-bold">{t}</dt>
                <dd className="mt-1 text-[var(--muted)]">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Roteiro de fases — é uma sequência, por isso numerado */}
      <section id="roteiro" aria-labelledby="roteiro-titulo" className="mx-auto mt-24 max-w-7xl scroll-mt-24 px-4 sm:px-6">
        <h2 id="roteiro-titulo" className="max-w-2xl text-[clamp(1.9rem,3.5vw,2.75rem)] font-bold">
          Construído em etapas, cada uma funcionando
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-5">
          {PHASES.map((p) => {
            const done = p.n <= CURRENT_PHASE;
            return (
              <li
                key={p.n}
                aria-current={p.n === CURRENT_PHASE ? "step" : undefined}
                className={`relative rounded-[var(--radius-card)] border p-5 ${
                  done ? "border-[var(--action)] bg-[color-mix(in_srgb,var(--action)_8%,var(--surface))]" : "border-[var(--line)]"
                }`}
              >
                <span className={`font-[family-name:var(--font-display)] text-4xl font-extrabold ${done ? "text-[var(--action)]" : "text-[var(--line)]"}`}>
                  {p.n}
                </span>
                <h3 className="mt-2 font-bold">{PHASE_LABEL[p.n].split("— ")[1]}</h3>
                <p className="mt-2 text-[0.95rem] text-[var(--muted)]">{p.what}</p>
                <p className="mt-3 text-sm font-bold">{done ? "No ar" : "Em construção"}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Chamada para conta */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 border-t-2 border-[var(--text)] pt-10 md:flex-row md:items-end">
          <div className="max-w-xl">
            <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-bold">Seu painel já está pronto para você</h2>
            <p className="mt-3 text-[var(--muted)]">
              Crie a conta com e-mail, diga o que te interessa e receba as novas ferramentas assim que entrarem no ar.
            </p>
          </div>
          <Link href="/cadastro" className="rounded-[var(--radius-control)] bg-[var(--action)] px-6 py-3.5 font-bold text-[var(--action-text)] hover:brightness-110">
            Criar conta gratuita
          </Link>
        </div>
      </section>
    </>
  );
}

/** Composição em camadas: o que a plataforma organiza, mostrado como estrutura — sem dados fictícios. */
function StageComposition() {
  return (
    <div className="relative mx-auto hidden h-[440px] w-full max-w-md sm:block" aria-hidden="true">
      <div className="layer absolute left-0 top-6 w-[78%] rounded-[var(--radius-card)] bg-white/[0.07] p-5 shadow-[var(--shadow-float)] ring-1 ring-white/10 backdrop-blur" data-depth="14">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-spot)]">
          <Icon name="trophy" className="h-4 w-4" /> Concurso acompanhado
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="h-3 w-4/5 rounded bg-white/25" />
          <div className="h-3 w-3/5 rounded bg-white/15" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-[#a3afcc]">
          <span>Edital oficial</span><span className="h-3 rounded bg-white/15" />
          <span>Última verificação</span><span className="h-3 rounded bg-white/15" />
          <span>Inscrições até</span><span className="h-3 rounded bg-[var(--color-spot)]/40" />
        </div>
      </div>

      <div className="layer absolute right-0 top-40 w-[70%] rounded-[var(--radius-card)] bg-white p-5 text-[var(--color-ink)] shadow-[var(--shadow-float)]" data-depth="28">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-spot-deep)]">
          <Icon name="compass" className="h-4 w-4" /> Plano de aula
        </div>
        <ol className="mt-3 space-y-1.5 text-sm">
          {["Objetivos de aprendizagem", "Habilidades da BNCC", "Desenvolvimento", "Avaliação"].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-paper)] text-[0.7rem] font-bold">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <div className="layer absolute bottom-0 left-8 w-[56%] rounded-[var(--radius-card)] bg-[var(--color-violet)] p-4 text-white shadow-[var(--shadow-float)]" data-depth="42">
        <div className="text-sm font-bold">Semana de estudos</div>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {[40, 65, 30, 80, 55, 20, 0].map((h, i) => (
            <span key={i} className="flex-1 rounded-sm bg-white/70" style={{ height: `${Math.max(h, 6)}%`, opacity: h ? 1 : 0.3 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
