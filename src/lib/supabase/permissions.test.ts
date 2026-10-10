// Tests de permissions sur la vraie base Supabase locale (RLS).
// Nécessite `npm run db:start`. Sans base locale, ces tests sont ignorés.
import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function lireCleLocales(): Record<string, string> | null {
  try {
    const sortie = execSync("npx supabase status -o env", {
      env: {
        ...process.env,
        DOCKER_HOST: `unix://${process.env.XDG_RUNTIME_DIR}/podman/podman.sock`,
      },
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 30_000,
    }).toString();
    const cles: Record<string, string> = {};
    for (const ligne of sortie.split("\n")) {
      const m = ligne.match(/^([A-Z_0-9]+)="?(.*?)"?$/);
      if (m) cles[m[1]] = m[2];
    }
    return cles.API_URL && cles.ANON_KEY && cles.SERVICE_ROLE_KEY ? cles : null;
  } catch {
    return null;
  }
}

const cles = lireCleLocales();
const suffixe = Date.now();
const MOT_DE_PASSE = "motdepasse-de-test-123";

describe.skipIf(!cles)("permissions de la table profiles (RLS)", () => {
  let admin: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let anonyme: SupabaseClient;
  let idA: string;
  let idB: string;
  let idPirate: string;

  async function creerUtilisateur(nom: string, metadata: Record<string, string>) {
    const email = `${nom}-${suffixe}@test.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: MOT_DE_PASSE,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    return { id: data.user.id, email };
  }

  async function connecter(email: string) {
    const c = createClient(cles!.API_URL, cles!.ANON_KEY, { auth: { persistSession: false } });
    const { error } = await c.auth.signInWithPassword({ email, password: MOT_DE_PASSE });
    if (error) throw error;
    return c;
  }

  beforeAll(async () => {
    admin = createClient(cles!.API_URL, cles!.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    anonyme = createClient(cles!.API_URL, cles!.ANON_KEY, { auth: { persistSession: false } });

    const a = await creerUtilisateur("alice", { display_name: "Alice", role: "client" });
    const b = await creerUtilisateur("bob", { display_name: "Bob", role: "provider" });
    // Tentative de se faire passer pour admin via les métadonnées d'inscription.
    const p = await creerUtilisateur("pirate", { display_name: "Pirate", role: "admin" });
    idA = a.id;
    idB = b.id;
    idPirate = p.id;
    clientA = await connecter(a.email);
    clientB = await connecter(b.email);
  });

  afterAll(async () => {
    for (const id of [idA, idB, idPirate]) if (id) await admin.auth.admin.deleteUser(id);
  });

  it("crée automatiquement un profil avec le bon rôle", async () => {
    const { data } = await admin.from("profiles").select("role").eq("id", idB).single();
    expect(data?.role).toBe("provider");
  });

  it("refuse le rôle admin demandé à l'inscription (devient client)", async () => {
    const { data } = await admin.from("profiles").select("role").eq("id", idPirate).single();
    expect(data?.role).toBe("client");
  });

  it("un utilisateur ne voit que son propre profil", async () => {
    const { data } = await clientA.from("profiles").select("id");
    expect(data).toEqual([{ id: idA }]);
  });

  it("un utilisateur ne peut pas lire le profil d'un autre", async () => {
    const { data } = await clientA.from("profiles").select("*").eq("id", idB);
    expect(data).toEqual([]);
  });

  it("un utilisateur ne peut pas modifier le profil d'un autre", async () => {
    await clientA.from("profiles").update({ display_name: "Piraté" }).eq("id", idB);
    const { data } = await clientB.from("profiles").select("display_name").eq("id", idB).single();
    expect(data?.display_name).toBe("Bob");
  });

  it("un utilisateur peut modifier son propre nom affiché", async () => {
    const { error } = await clientA.from("profiles").update({ display_name: "Alice M." }).eq("id", idA);
    expect(error).toBeNull();
    const { data } = await clientA.from("profiles").select("display_name").eq("id", idA).single();
    expect(data?.display_name).toBe("Alice M.");
  });

  it("un utilisateur ne peut pas se donner le rôle admin", async () => {
    const { error } = await clientA.from("profiles").update({ role: "admin" }).eq("id", idA);
    expect(error).not.toBeNull();
    const { data } = await admin.from("profiles").select("role").eq("id", idA).single();
    expect(data?.role).toBe("client");
  });

  it("un utilisateur ne peut pas créer ni supprimer de profil directement", async () => {
    const ajout = await clientA
      .from("profiles")
      .insert({ id: crypto.randomUUID(), display_name: "Faux", role: "client" });
    expect(ajout.error).not.toBeNull();
    const suppression = await clientA.from("profiles").delete().eq("id", idA);
    expect(suppression.error).not.toBeNull();
  });

  it("un visiteur non connecté ne peut rien lire", async () => {
    const { data, error } = await anonyme.from("profiles").select("*");
    expect(error !== null || data?.length === 0).toBe(true);
  });
});
