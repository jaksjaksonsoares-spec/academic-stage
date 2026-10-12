import type { Metadata } from "next";
import { requireUser, type Profile } from "@/lib/session";
import { OnboardingForm } from "@/app/painel/forms";

export const metadata: Metadata = { title: "Boas-vindas", robots: { index: false } };

export default async function BoasVindasPage() {
  const { supabase, user } = await requireUser("/boas-vindas");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,interesses")
    .eq("id", user.id)
    .single<Pick<Profile, "display_name" | "interesses">>();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-[clamp(2.1rem,5vw,3.25rem)] font-extrabold">
        {profile?.display_name ? `Boas-vindas, ${profile.display_name}.` : "Boas-vindas."}
      </h1>
      <p className="mt-3 mb-10 max-w-xl text-lg text-[var(--muted)]">
        O que você quer resolver por aqui? Marque quantas opções quiser — dá para mudar depois nas preferências.
      </p>
      <OnboardingForm selected={profile?.interesses ?? []} />
    </div>
  );
}
