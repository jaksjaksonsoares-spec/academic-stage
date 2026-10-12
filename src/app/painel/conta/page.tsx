import Link from "next/link";
import { requireUser } from "@/lib/session";
import { signOutEverywhere } from "@/app/(auth)/actions";
import { Icon } from "@/components/icon";
import { buttonSecondary } from "@/components/styles";
import { DeleteAccountForm } from "../forms";

export default async function ContaPage() {
  const { user } = await requireUser("/painel/conta");

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Conta e privacidade</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Conta vinculada a <strong className="text-[var(--text)]">{user.email}</strong>. Veja na{" "}
          <Link href="/privacidade" className="font-bold underline">Política de Privacidade</Link> como tratamos seus dados.
        </p>
      </header>

      <section aria-labelledby="exportar" className="border-t border-[var(--line)] pt-10">
        <h2 id="exportar" className="text-xl font-bold">Baixar meus dados</h2>
        <p className="mt-2 mb-5 max-w-2xl text-[var(--muted)]">
          Um arquivo JSON com tudo o que guardamos sobre você: perfil, preferências, itens salvos, consentimentos e registros de acesso.
        </p>
        <a href="/api/conta/exportar" download className={buttonSecondary}>
          <Icon name="download" /> Baixar meus dados
        </a>
      </section>

      <section aria-labelledby="senha" className="border-t border-[var(--line)] pt-10">
        <h2 id="senha" className="text-xl font-bold">Senha e sessões</h2>
        <p className="mt-2 mb-5 max-w-2xl text-[var(--muted)]">
          Para trocar a senha, enviamos um link para o seu e-mail. Se acha que alguém acessou sua conta, saia de todos os dispositivos.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/recuperar-senha" className={buttonSecondary}>Trocar senha</Link>
          <form action={signOutEverywhere}>
            <button type="submit" className={buttonSecondary}>
              <Icon name="logout" /> Sair de todos os dispositivos
            </button>
          </form>
        </div>
      </section>

      <section aria-labelledby="excluir" className="rounded-[var(--radius-card)] border-[1.5px] border-[color-mix(in_srgb,var(--color-danger)_45%,transparent)] p-6 sm:p-8">
        <h2 id="excluir" className="text-xl font-bold text-[var(--color-danger)]">Excluir conta</h2>
        <p className="mt-2 mb-6 max-w-2xl text-[var(--muted)]">
          Apaga sua conta e todos os dados ligados a ela, de forma imediata e permanente. Não há como desfazer.
          Se quiser guardar uma cópia, baixe seus dados antes.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
