"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { becomeProvider, saveProviderProfile } from "@/lib/providers/profile";
import type { FormState } from "./auth";

// L'utilisateur est toujours identifié côté serveur (jamais par un id envoyé par le navigateur).
async function utilisateurConnecte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function becomeProviderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await utilisateurConnecte();
  if (!user) return { error: "Vous devez être connecté." };

  const resultat = await becomeProvider(createAdminClient(), user.id, formData.get("isAdult") === "on");
  if (!resultat.ok) return { error: resultat.error };

  revalidatePath("/compte/profil");
  return { message: "Votre compte est maintenant un compte prestataire." };
}

export async function saveProviderProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await utilisateurConnecte();
  if (!user) return { error: "Vous devez être connecté." };

  const fichier = formData.get("photo");
  const photo =
    fichier instanceof File && fichier.size > 0 ? Buffer.from(await fichier.arrayBuffer()) : null;

  const tarif = Number(String(formData.get("hourlyRate") ?? "").replace(",", "."));
  const resultat = await saveProviderProfile(
    createAdminClient(),
    user.id,
    {
      category: formData.get("category"),
      publicName: formData.get("publicName"),
      bio: formData.get("bio"),
      hourlyRate: Number.isFinite(tarif) && String(formData.get("hourlyRate") ?? "").trim() !== "" ? tarif : undefined,
      serviceCodes: formData.getAll("serviceCodes").map(String),
      neighborhoodCodes: formData.getAll("neighborhoodCodes").map(String),
      workAuthorization: formData.get("workAuthorization") === "on",
      minorsWorkAuthorization: formData.get("minorsWorkAuthorization") === "on",
      criminalCheck: formData.get("criminalCheck") === "on",
      photoConsent: formData.get("photoConsent") === "on",
    },
    photo,
  );
  if (!resultat.ok) return { error: resultat.error };

  revalidatePath("/compte/profil");
  revalidatePath(`/prestataires/${user.id}`);
  return { message: "Profil enregistré. Il sera visible publiquement après validation." };
}
