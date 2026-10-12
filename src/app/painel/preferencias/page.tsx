import { requireUser, type NotificationPrefs, type Profile } from "@/lib/session";
import { InterestsForm, NotificationsForm } from "../forms";

export default async function PreferenciasPage() {
  const { supabase, user } = await requireUser("/painel/preferencias");
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase.from("profiles").select("interesses").eq("id", user.id).single<Pick<Profile, "interesses">>(),
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).single<NotificationPrefs>(),
  ]);

  return (
    <div className="space-y-14">
      <section aria-labelledby="interesses-titulo">
        <h1 id="interesses-titulo" className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Interesses</h1>
        <p className="mt-2 mb-6 max-w-2xl text-[var(--muted)]">Definem o que aparece em “Para você” no seu painel.</p>
        <InterestsForm selected={profile?.interesses ?? []} />
      </section>

      <section aria-labelledby="notif-titulo" className="border-t border-[var(--line)] pt-12">
        <h2 id="notif-titulo" className="text-[clamp(1.6rem,3vw,2rem)] font-bold">Notificações</h2>
        <p className="mt-2 mb-6 max-w-2xl text-[var(--muted)]">Você decide o que receber e com que frequência. Pode mudar a qualquer momento.</p>
        {prefs ? (
          <NotificationsForm prefs={prefs} />
        ) : (
          <p role="alert" className="text-[var(--color-danger)]">Não foi possível carregar suas preferências. Recarregue a página.</p>
        )}
      </section>
    </div>
  );
}
