import type { SupabaseClient } from "@supabase/supabase-js";
import { providerProfileSchema } from "@/lib/validation/provider";
import { processPhoto } from "./photo";

// Logique des profils prestataires. Reçoit un client à droits complets ET l'id de
// l'utilisateur déjà vérifié par le serveur : on n'agit jamais sur un autre id.

export type Result = { ok: true } | { ok: false; error: string };
const echec = (error: string): Result => ({ ok: false, error });

export const PHOTO_BUCKET = "provider-photos";
export const photoPath = (userId: string) => `${userId}/avatar.webp`;

// Un client devient prestataire (jamais l'inverse, jamais admin). Exige l'attestation de majorité.
export async function becomeProvider(
  admin: SupabaseClient,
  userId: string,
  attestsAdult: boolean,
): Promise<Result> {
  const { data: profil } = await admin
    .from("profiles")
    .select("role, adult_attested_at")
    .eq("id", userId)
    .single();
  if (!profil) return echec("Profil introuvable.");
  if (profil.role === "provider") return { ok: true };
  if (profil.role !== "client") return echec("Ce type de compte ne peut pas devenir prestataire.");

  if (!profil.adult_attested_at && !attestsAdult) {
    return echec("Vous devez attester avoir 18 ans ou plus.");
  }
  const { error } = await admin
    .from("profiles")
    .update({
      role: "provider",
      ...(profil.adult_attested_at ? {} : { adult_attested_at: new Date().toISOString() }),
    })
    .eq("id", userId)
    .eq("role", "client");
  return error ? echec("Impossible de mettre à jour le compte.") : { ok: true };
}

export async function saveProviderProfile(
  admin: SupabaseClient,
  userId: string,
  rawInput: unknown,
  photo?: Buffer | null,
): Promise<Result> {
  const parsed = providerProfileSchema.safeParse(rawInput);
  if (!parsed.success) return echec(parsed.error.issues[0].message);
  const input = parsed.data;

  const { data: compte } = await admin
    .from("profiles")
    .select("role, adult_attested_at")
    .eq("id", userId)
    .single();
  if (compte?.role !== "provider" || !compte.adult_attested_at) {
    return echec("Seul un prestataire majeur peut créer un profil prestataire.");
  }

  if (photo && !input.photoConsent) {
    return echec("Vous devez consentir à l’affichage de votre photo.");
  }
  let photoWebp: Buffer | null = null;
  if (photo) {
    try {
      photoWebp = await processPhoto(photo);
    } catch (e) {
      return echec((e as Error).message);
    }
  }

  // Services : ils doivent exister et appartenir à la catégorie choisie.
  const services = [...new Set(input.serviceCodes)];
  const { data: servicesValides } = await admin
    .from("services")
    .select("code")
    .eq("category", input.category)
    .in("code", services);
  if ((servicesValides?.length ?? 0) !== services.length) {
    return echec("Un des services choisis n’est pas permis pour cette catégorie.");
  }
  const secteurs = [...new Set(input.neighborhoodCodes)];
  const { data: secteursValides } = await admin
    .from("neighborhoods")
    .select("code")
    .in("code", secteurs);
  if ((secteursValides?.length ?? 0) !== secteurs.length) {
    return echec("Un des secteurs choisis n’existe pas.");
  }

  const { data: existant } = await admin
    .from("provider_profiles")
    .select(
      "category, public_name, bio, verification_status, has_photo, photo_consent_at, work_authorization_attested_at, minors_work_attested_at, criminal_check_attested_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (existant && existant.category !== input.category) {
    return echec("La catégorie ne peut pas être changée après la création du profil.");
  }

  const maintenant = new Date().toISOString();
  // Un profil validé dont le nom, la description ou la photo changent doit être revalidé.
  let statut = existant?.verification_status ?? "pending";
  if (
    statut === "approved" &&
    (existant?.public_name !== input.publicName || existant?.bio !== input.bio || photoWebp)
  ) {
    statut = "pending";
  }

  const hasPhoto = Boolean(photoWebp) || Boolean(existant?.has_photo);
  const { error: errProfil } = await admin.from("provider_profiles").upsert({
    user_id: userId,
    category: input.category,
    public_name: input.publicName,
    bio: input.bio,
    hourly_rate_cents: Math.round(input.hourlyRate * 100),
    verification_status: statut,
    work_authorization_attested_at: existant?.work_authorization_attested_at ?? maintenant,
    minors_work_attested_at:
      input.category === "tutoring" ? (existant?.minors_work_attested_at ?? maintenant) : null,
    criminal_check_attested_at:
      input.category === "tutoring" ? (existant?.criminal_check_attested_at ?? maintenant) : null,
    has_photo: hasPhoto,
    photo_consent_at: hasPhoto ? (photoWebp ? maintenant : (existant?.photo_consent_at ?? maintenant)) : null,
  });
  if (errProfil) return echec("Impossible d’enregistrer le profil.");

  if (photoWebp) {
    const { error } = await admin.storage
      .from(PHOTO_BUCKET)
      .upload(photoPath(userId), photoWebp, { contentType: "image/webp", upsert: true });
    if (error) return echec("Impossible d’enregistrer la photo.");
  }

  // Remplace les listes de services et de secteurs.
  await admin.from("provider_services").delete().eq("provider_id", userId);
  const { error: errServices } = await admin
    .from("provider_services")
    .insert(services.map((service_code) => ({ provider_id: userId, service_code })));
  await admin.from("provider_neighborhoods").delete().eq("provider_id", userId);
  const { error: errSecteurs } = await admin
    .from("provider_neighborhoods")
    .insert(secteurs.map((neighborhood_code) => ({ provider_id: userId, neighborhood_code })));
  if (errServices || errSecteurs) return echec("Impossible d’enregistrer les services ou les secteurs.");

  return { ok: true };
}

// Lecture complète de son propre profil (le navigateur n'a accès qu'aux colonnes publiques).
export async function getOwnProviderProfile(admin: SupabaseClient, userId: string) {
  const { data: profil } = await admin
    .from("provider_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profil) return null;
  const [{ data: services }, { data: secteurs }] = await Promise.all([
    admin.from("provider_services").select("service_code").eq("provider_id", userId),
    admin.from("provider_neighborhoods").select("neighborhood_code").eq("provider_id", userId),
  ]);
  return {
    ...profil,
    serviceCodes: (services ?? []).map((s) => s.service_code as string),
    neighborhoodCodes: (secteurs ?? []).map((s) => s.neighborhood_code as string),
  };
}
