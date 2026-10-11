import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_BUCKET, photoPath } from "@/lib/providers/profile";
import { STATUS_LABELS } from "@/lib/providers/status";

const CATEGORIES = { tutoring: "Tutorat", gardening: "Jardinage léger" } as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PrestatairePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // Lecture avec les droits de l'utilisateur : la base ne renvoie que les profils validés
  // (ou le sien), et uniquement les colonnes publiques — jamais de coordonnées.
  const supabase = await createClient();
  const { data: profil } = await supabase
    .from("provider_profiles")
    .select(
      "user_id, category, public_name, bio, hourly_rate_cents, verification_status, has_photo, provider_services(services(label_fr)), provider_neighborhoods(neighborhoods(label_fr))",
    )
    .eq("user_id", id)
    .maybeSingle();
  if (!profil) notFound();

  let photoUrl: string | null = null;
  if (profil.has_photo) {
    const { data } = await createAdminClient()
      .storage.from(PHOTO_BUCKET)
      .createSignedUrl(photoPath(profil.user_id), 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  const statut = STATUS_LABELS[profil.verification_status as keyof typeof STATUS_LABELS];
  const labels = (rows: unknown, cle: string) =>
    ((rows ?? []) as Record<string, { label_fr: string } | null>[])
      .map((r) => r[cle]?.label_fr)
      .filter(Boolean) as string[];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <div className="flex items-center gap-4">
        {photoUrl && (
          <Image src={photoUrl} alt={`Photo de ${profil.public_name}`} width={96} height={96} unoptimized className="h-24 w-24 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{profil.public_name}</h1>
          <p className="text-zinc-600">{CATEGORIES[profil.category as keyof typeof CATEGORIES]}</p>
          <span className={`mt-1 inline-block rounded px-2 py-0.5 text-sm ${statut.style}`}>{statut.label}</span>
        </div>
      </div>
      <p className="mt-6 whitespace-pre-line">{profil.bio}</p>
      <dl className="mt-6 grid gap-3">
        <div>
          <dt className="font-medium">Tarif horaire</dt>
          <dd>{(profil.hourly_rate_cents / 100).toFixed(2).replace(".", ",")} $</dd>
        </div>
        <div>
          <dt className="font-medium">Services</dt>
          <dd>{labels(profil.provider_services, "services").join(", ")}</dd>
        </div>
        <div>
          <dt className="font-medium">Secteurs</dt>
          <dd>{labels(profil.provider_neighborhoods, "neighborhoods").join(", ")}</dd>
        </div>
      </dl>
      <p className="mt-8 text-sm text-zinc-500">
        Les coordonnées du prestataire sont communiquées après une réservation payée.
      </p>
    </main>
  );
}
