import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProviderProfile } from "@/lib/providers/profile";
import { STATUS_LABELS, type VerificationStatus } from "@/lib/providers/status";
import { ProviderForm } from "@/components/provider-form";
import { BecomeProviderForm } from "@/components/become-provider-form";

export const metadata = { title: "Mon profil prestataire — Services Québec" };

export default async function ProfilPrestatairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: compte } = await supabase
    .from("profiles")
    .select("display_name, role, adult_attested_at")
    .eq("id", user.id)
    .single();

  if (compte?.role !== "provider") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
        <h1 className="mb-6 text-2xl font-semibold">Devenir prestataire</h1>
        <BecomeProviderForm needsAdultAttestation={!compte?.adult_attested_at} />
      </main>
    );
  }

  const [{ data: services }, { data: secteurs }, profil] = await Promise.all([
    supabase.from("services").select("code, category, label_fr").order("label_fr"),
    supabase.from("neighborhoods").select("code, label_fr").order("label_fr"),
    getOwnProviderProfile(createAdminClient(), user.id),
  ]);

  const statut = (profil?.verification_status ?? null) as VerificationStatus | null;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Mon profil prestataire</h1>
      {statut && (
        <p className="mb-6 flex flex-wrap items-center gap-3">
          <span className={`rounded px-2 py-1 text-sm ${STATUS_LABELS[statut].style}`}>{STATUS_LABELS[statut].label}</span>
          {statut === "approved" && (
            <Link href={`/prestataires/${user.id}`} className="underline">Voir ma page publique</Link>
          )}
        </p>
      )}
      <ProviderForm
        services={(services ?? []).map((s) => ({ code: s.code, category: s.category, label: s.label_fr }))}
        neighborhoods={(secteurs ?? []).map((n) => ({ code: n.code, label: n.label_fr }))}
        initial={
          profil
            ? {
                category: profil.category,
                publicName: profil.public_name,
                bio: profil.bio,
                hourlyRate: String(profil.hourly_rate_cents / 100),
                serviceCodes: profil.serviceCodes,
                neighborhoodCodes: profil.neighborhoodCodes,
                hasPhoto: profil.has_photo,
                exists: true,
              }
            : { category: "tutoring", publicName: compte.display_name, bio: "", hourlyRate: "", serviceCodes: [], neighborhoodCodes: [], hasPhoto: false, exists: false }
        }
      />
    </main>
  );
}
