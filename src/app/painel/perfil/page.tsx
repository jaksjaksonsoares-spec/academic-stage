import { requireUser, type Profile } from "@/lib/session";
import { ProfileForm } from "../forms";

export default async function PerfilPage() {
  const { supabase, user } = await requireUser("/painel/perfil");
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();

  return (
    <div>
      <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] font-extrabold">Perfil</h1>
      <p className="mt-2 mb-8 max-w-2xl text-[var(--muted)]">
        Tudo aqui é opcional, exceto o nome. Usamos essas informações só para priorizar o que aparece para você — nunca para publicidade.
      </p>
      {profile ? (
        <ProfileForm profile={profile} />
      ) : (
        <p role="alert" className="text-[var(--color-danger)]">
          {error ? "Não foi possível carregar o perfil. Recarregue a página." : "Perfil não encontrado."}
        </p>
      )}
    </div>
  );
}
