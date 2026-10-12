import { isSupabaseConfigured } from "@/lib/env";
import { Icon } from "@/components/icon";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-md px-4 py-14 sm:py-20">
      {!isSupabaseConfigured() && (
        <div role="note" className="mb-8 flex gap-3 rounded-[var(--radius-control)] border border-dashed border-[var(--color-danger)] p-4 text-sm">
          <Icon name="alert" className="h-5 w-5 shrink-0 text-[var(--color-danger)]" />
          <p>
            <strong>Autenticação pendente de configuração.</strong> As contas ainda não funcionam neste ambiente porque o Supabase
            não foi conectado. Veja a seção “Ativar o Supabase” no README.
          </p>
        </div>
      )}
      {children}
    </div>
  );
}
