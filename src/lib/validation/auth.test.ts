import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./auth";

const valide = {
  displayName: "Marie Tremblay",
  email: "Marie@Exemple.ca",
  password: "motdepasse-solide",
  role: "client",
  isAdult: "on",
};

describe("signUpSchema", () => {
  it("accepte une inscription valide et met le courriel en minuscules", () => {
    const r = signUpSchema.safeParse(valide);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("marie@exemple.ca");
  });

  it("refuse le rôle admin", () => {
    expect(signUpSchema.safeParse({ ...valide, role: "admin" }).success).toBe(false);
  });

  it("refuse l'inscription sans attestation de majorité", () => {
    expect(signUpSchema.safeParse({ ...valide, isAdult: undefined }).success).toBe(false);
  });

  it("refuse un mot de passe trop court", () => {
    expect(signUpSchema.safeParse({ ...valide, password: "court" }).success).toBe(false);
  });

  it("refuse un courriel invalide", () => {
    expect(signUpSchema.safeParse({ ...valide, email: "pas-un-courriel" }).success).toBe(false);
  });

  it("refuse un nom trop court", () => {
    expect(signUpSchema.safeParse({ ...valide, displayName: "A" }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepte une connexion valide", () => {
    expect(signInSchema.safeParse({ email: "a@b.ca", password: "x" }).success).toBe(true);
  });

  it("refuse un mot de passe vide", () => {
    expect(signInSchema.safeParse({ email: "a@b.ca", password: "" }).success).toBe(false);
  });
});
