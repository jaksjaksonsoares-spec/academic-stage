import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { iaConfigurada } from "@/lib/ia";
import { consultarCota } from "@/lib/limites";
import { Icon } from "@/components/icon";
import { EnviarEdital } from "./enviar";

export const metadata: Metadata = {
  title: "Central de editais",
  description: "Envie o PDF ou o endereço de um edital e veja datas, requisitos, conteúdos e regras organizados com o número da página — e transforme em plano de estudos.",
  alternates: { canonical: "/editais" },
};

// A análise com IA pode levar até um minuto.
export const maxDuration = 60;

export default async function EditaisPage() {
  const { supabase, user } = await getUser();
  const analises = supabase && user
    ? ((await supabase.from("editais_analises").select("id,titulo,metodo,paginas,created_at").order("created_at", { ascending: false }).limit(30)).data ?? [])
    : [];
  const ia = iaConfigurada();
  const cota = supabase && user && ia ? await consultarCota(supabase, user.id, "edital") : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="flex items-start gap-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-ink)] text-[var(--color-spot)]">
          <Icon name="document" className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold">Central de editais</h1>
          <p className="mt-3 max-w-2xl text-lg text-[var(--muted)]">
            Envie o edital e veja, em um só lugar, cargo, requisitos, conteúdos, datas, etapas, desempate, recursos e isenção — sempre com o número da página para conferir.
          </p>
        </div>
      </div>

      <div className="mt-10">
        {user ? (
          <EnviarEdital userId={user.id} iaDisponivel={ia && (cota?.restantes ?? 0) > 0} restantes={cota?.restantes ?? 0} />
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link href="/cadastro" className="rounded-[var(--radius-control)] bg-[var(--action)] px-6 py-3 font-bold text-[var(--action-text)]">Criar conta gratuita para analisar</Link>
            <Link href="/entrar?next=/editais" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-6 py-3 font-bold">Já tenho conta</Link>
          </div>
        )}
      </div>

      <p className="mt-6 max-w-3xl rounded-[var(--radius-control)] border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
        A leitura automática ajuda a encontrar as informações, mas pode deixar passar trechos ou interpretar mal tabelas e PDFs digitalizados.
        Não é orientação jurídica: o edital oficial e suas retificações sempre prevalecem.
      </p>

      {analises.length > 0 && (
        <section aria-labelledby="minhas" className="mt-14">
          <h2 id="minhas" className="text-xl font-bold">Editais analisados</h2>
          <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {analises.map((a) => (
              <li key={a.id}>
                <Link href={`/editais/${a.id}`} className="flex flex-wrap justify-between gap-2 py-3 hover:underline">
                  <span className="font-bold">{a.titulo}</span>
                  <span className="text-sm text-[var(--muted)]">
                    {a.metodo === "ia" ? "Com IA" : "Palavras-chave"}
                    {a.paginas ? ` · ${a.paginas} páginas` : ""} · {new Date(a.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
