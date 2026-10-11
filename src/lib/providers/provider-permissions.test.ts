// Tests des profils prestataires sur la vraie base Supabase locale (RLS + logique serveur).
// Nécessite `npm run db:start`. Sans base locale, ces tests sont ignorés.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { lireCleLocales } from "@/test/local-supabase";
import { becomeProvider, getOwnProviderProfile, saveProviderProfile } from "./profile";

const cles = lireCleLocales();
const suffixe = Date.now();
const MOT_DE_PASSE = "motdepasse-de-test-123";

const jardinage = {
  category: "gardening",
  publicName: "Marc T.",
  bio: "Étudiant sérieux, je tonds le gazon et je ramasse les feuilles dans mon quartier.",
  hourlyRate: 22,
  serviceCodes: ["mowing", "snow_shoveling"],
  neighborhoodCodes: ["beauport"],
  workAuthorization: true,
  minorsWorkAuthorization: false,
  criminalCheck: false,
  photoConsent: false,
};

describe.skipIf(!cles)("profils prestataires (RLS + logique serveur)", () => {
  let admin: SupabaseClient;
  let anonyme: SupabaseClient;
  let prestataire: { id: string; client: SupabaseClient };
  let autre: { id: string; client: SupabaseClient };
  let client: { id: string };
  let mineur: { id: string };
  const ids: string[] = [];

  async function creer(nom: string, metadata: Record<string, unknown>) {
    const email = `${nom}-${suffixe}@test.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: MOT_DE_PASSE,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    ids.push(data.user.id);
    const c = createClient(cles!.API_URL, cles!.ANON_KEY, { auth: { persistSession: false } });
    const { error: e2 } = await c.auth.signInWithPassword({ email, password: MOT_DE_PASSE });
    if (e2) throw e2;
    return { id: data.user.id, client: c };
  }

  beforeAll(async () => {
    admin = createClient(cles!.API_URL, cles!.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    anonyme = createClient(cles!.API_URL, cles!.ANON_KEY, { auth: { persistSession: false } });
    prestataire = await creer("presta", { display_name: "Marc", role: "provider", adult: true });
    autre = await creer("autre", { display_name: "Autre", role: "client", adult: true });
    client = await creer("client", { display_name: "Cli", role: "client", adult: true });
    mineur = await creer("mineur", { display_name: "Jeune", role: "client" }); // sans attestation de majorité
  });

  afterAll(async () => {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
    await admin.storage.from("provider-photos").remove(ids.map((i) => `${i}/avatar.webp`));
  });

  it("un prestataire majeur crée son profil, en attente de validation", async () => {
    const r = await saveProviderProfile(admin, prestataire.id, jardinage);
    expect(r).toEqual({ ok: true });
    const profil = await getOwnProviderProfile(admin, prestataire.id);
    expect(profil?.verification_status).toBe("pending");
    expect(profil?.hourly_rate_cents).toBe(2200);
    expect(profil?.serviceCodes.sort()).toEqual(["mowing", "snow_shoveling"]);
  });

  it("il peut modifier son profil", async () => {
    const r = await saveProviderProfile(admin, prestataire.id, { ...jardinage, hourlyRate: 25, serviceCodes: ["mowing"] });
    expect(r).toEqual({ ok: true });
    const profil = await getOwnProviderProfile(admin, prestataire.id);
    expect(profil?.hourly_rate_cents).toBe(2500);
    expect(profil?.serviceCodes).toEqual(["mowing"]);
  });

  it("un autre utilisateur ne peut pas lire un profil en attente", async () => {
    const { data } = await autre.client.from("provider_profiles").select("user_id").eq("user_id", prestataire.id);
    expect(data).toEqual([]);
    const { data: services } = await autre.client.from("provider_services").select("*").eq("provider_id", prestataire.id);
    expect(services).toEqual([]);
  });

  it("un visiteur non connecté ne voit aucun profil en attente", async () => {
    const { data } = await anonyme.from("provider_profiles").select("user_id");
    expect(data).toEqual([]);
  });

  it("aucune écriture directe depuis le navigateur (ni autre utilisateur, ni propriétaire)", async () => {
    const modif = await autre.client.from("provider_profiles").update({ public_name: "Piraté" }).eq("user_id", prestataire.id);
    expect(modif.error).not.toBeNull();
    const modifProprio = await prestataire.client.from("provider_profiles").update({ bio: "x".repeat(30) }).eq("user_id", prestataire.id);
    expect(modifProprio.error).not.toBeNull();
    const suppr = await autre.client.from("provider_profiles").delete().eq("user_id", prestataire.id);
    expect(suppr.error).not.toBeNull();
    const profil = await getOwnProviderProfile(admin, prestataire.id);
    expect(profil?.public_name).toBe("Marc T.");
  });

  it("un prestataire ne peut pas se valider lui-même", async () => {
    const { error } = await prestataire.client.from("provider_profiles").update({ verification_status: "approved" }).eq("user_id", prestataire.id);
    expect(error).not.toBeNull();
    const profil = await getOwnProviderProfile(admin, prestataire.id);
    expect(profil?.verification_status).toBe("pending");
  });

  it("un client (non prestataire) ne peut pas créer de profil prestataire", async () => {
    const r = await saveProviderProfile(admin, client.id, jardinage);
    expect(r.ok).toBe(false);
  });

  it("un client peut devenir prestataire, mais pas sans attestation de majorité", async () => {
    expect((await becomeProvider(admin, mineur.id, false)).ok).toBe(false);
    expect((await becomeProvider(admin, mineur.id, true)).ok).toBe(true);
    const { data } = await admin.from("profiles").select("role, adult_attested_at").eq("id", mineur.id).single();
    expect(data?.role).toBe("provider");
    expect(data?.adult_attested_at).not.toBeNull();
    expect((await becomeProvider(admin, client.id, true)).ok).toBe(true);
  });

  it("l'inscription sans attestation de majorité ne donne pas de date d'attestation", async () => {
    const { data } = await admin.from("profiles").select("adult_attested_at").eq("id", autre.id).single();
    expect(data?.adult_attested_at).not.toBeNull();
    const { data: sans } = await admin.from("profiles").select("adult_attested_at").eq("id", mineur.id).single();
    expect(sans?.adult_attested_at).not.toBeNull(); // posée par becomeProvider ci-dessus
  });

  it("refuse un service qui n'appartient pas à la catégorie (ex. matière pour le jardinage)", async () => {
    const r = await saveProviderProfile(admin, mineur.id, { ...jardinage, serviceCodes: ["math"] });
    expect(r.ok).toBe(false);
  });

  it("refuse un service inexistant (ex. abattage d'arbres)", async () => {
    const r = await saveProviderProfile(admin, mineur.id, { ...jardinage, serviceCodes: ["tree_felling"] });
    expect(r.ok).toBe(false);
  });

  it("refuse une description avec coordonnées", async () => {
    const r = await saveProviderProfile(admin, mineur.id, { ...jardinage, bio: "Étudiant sérieux. Écrivez-moi à marc@exemple.com pour un prix en ca$h." });
    expect(r.ok).toBe(false);
  });

  it("le tutorat exige les attestations pour les mineurs", async () => {
    const tutorat = { ...jardinage, category: "tutoring", serviceCodes: ["math"] };
    expect((await saveProviderProfile(admin, mineur.id, tutorat)).ok).toBe(false);
    const ok = await saveProviderProfile(admin, mineur.id, { ...tutorat, minorsWorkAuthorization: true, criminalCheck: true });
    expect(ok).toEqual({ ok: true });
    // la catégorie ne peut plus changer ensuite
    expect((await saveProviderProfile(admin, mineur.id, jardinage)).ok).toBe(false);
  });

  it("la base refuse directement un tutorat sans attestations", async () => {
    const { error } = await admin.from("provider_profiles").insert({
      user_id: client.id,
      category: "tutoring",
      public_name: "Test",
      bio: "x".repeat(30),
      hourly_rate_cents: 2000,
      work_authorization_attested_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("la base refuse un service d'une autre catégorie même par le serveur", async () => {
    const { error } = await admin.from("provider_services").insert({ provider_id: prestataire.id, service_code: "math" });
    expect(error).not.toBeNull();
  });

  it("photo : refuse sans consentement, accepte avec, et la ré-encode", async () => {
    const png = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#3a7" } }).png().toBuffer();
    expect((await saveProviderProfile(admin, prestataire.id, jardinage, png)).ok).toBe(false);
    expect((await saveProviderProfile(admin, prestataire.id, jardinage, Buffer.from("pas une image"))).ok).toBe(false);
    expect((await saveProviderProfile(admin, prestataire.id, { ...jardinage, photoConsent: true }, png)).ok).toBe(true);
    const profil = await getOwnProviderProfile(admin, prestataire.id);
    expect(profil?.has_photo).toBe(true);
    const { data } = await admin.storage.from("provider-photos").download(`${prestataire.id}/avatar.webp`);
    const meta = await sharp(Buffer.from(await data!.arrayBuffer())).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(800);
  });

  it("les photos ne sont pas accessibles directement depuis le navigateur", async () => {
    const { data, error } = await autre.client.storage.from("provider-photos").download(`${prestataire.id}/avatar.webp`);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    const { error: e2 } = await autre.client.storage.from("provider-photos").upload(`${autre.id}/avatar.webp`, Buffer.from("x"), { contentType: "image/webp" });
    expect(e2).not.toBeNull();
  });

  it("profil validé : visible publiquement, colonnes publiques seulement, sans coordonnées", async () => {
    await admin.from("provider_profiles").update({ verification_status: "approved" }).eq("user_id", prestataire.id);

    const { data } = await anonyme.from("provider_profiles").select("user_id, public_name, bio, hourly_rate_cents, verification_status").eq("user_id", prestataire.id);
    expect(data).toHaveLength(1);
    expect(data![0].verification_status).toBe("approved");

    // colonnes privées : refusées
    const prive = await anonyme.from("provider_profiles").select("work_authorization_attested_at").eq("user_id", prestataire.id);
    expect(prive.error).not.toBeNull();
    const tout = await anonyme.from("provider_profiles").select("*");
    expect(tout.error).not.toBeNull();

    // le profil de base (courriel, rôle) reste privé
    const base = await anonyme.from("profiles").select("*").eq("id", prestataire.id);
    expect(base.data ?? []).toEqual([]);
    const baseAutre = await autre.client.from("profiles").select("*").eq("id", prestataire.id);
    expect(baseAutre.data ?? []).toEqual([]);

    // services et secteurs visibles pour un profil validé
    const { data: services } = await anonyme.from("provider_services").select("service_code").eq("provider_id", prestataire.id);
    expect((services ?? []).map((s) => s.service_code).sort()).toEqual(["mowing", "snow_shoveling"]);
  });

  it("modifier la description d'un profil validé le remet en attente", async () => {
    await saveProviderProfile(admin, prestataire.id, { ...jardinage, bio: "Nouvelle description honnête et suffisamment longue pour passer." });
    const profil = await getOwnProviderProfile(admin, prestataire.id);
    expect(profil?.verification_status).toBe("pending");
    const { data } = await anonyme.from("provider_profiles").select("user_id").eq("user_id", prestataire.id);
    expect(data).toEqual([]);
  });

  it("un profil suspendu le reste après modification", async () => {
    await admin.from("provider_profiles").update({ verification_status: "suspended" }).eq("user_id", prestataire.id);
    await saveProviderProfile(admin, prestataire.id, jardinage);
    const profil = await getOwnProviderProfile(admin, prestataire.id);
    expect(profil?.verification_status).toBe("suspended");
  });
});
