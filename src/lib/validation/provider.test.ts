import { describe, expect, it } from "vitest";
import { providerProfileSchema } from "./provider";

const valide = {
  category: "gardening",
  publicName: "Marc T.",
  bio: "Étudiant sérieux, je tonds le gazon et je ramasse les feuilles dans mon quartier.",
  hourlyRate: 22,
  serviceCodes: ["mowing"],
  neighborhoodCodes: ["beauport"],
  workAuthorization: true,
  minorsWorkAuthorization: false,
  criminalCheck: false,
  photoConsent: false,
};

const tutorat = {
  ...valide,
  category: "tutoring",
  serviceCodes: ["math"],
  minorsWorkAuthorization: true,
  criminalCheck: true,
};

describe("providerProfileSchema", () => {
  it("accepte un profil de jardinage valide", () => {
    expect(providerProfileSchema.safeParse(valide).success).toBe(true);
  });

  it("accepte un profil de tutorat avec les deux attestations", () => {
    expect(providerProfileSchema.safeParse(tutorat).success).toBe(true);
  });

  it("refuse le tutorat sans attestation pour les mineurs", () => {
    expect(providerProfileSchema.safeParse({ ...tutorat, minorsWorkAuthorization: false }).success).toBe(false);
    expect(providerProfileSchema.safeParse({ ...tutorat, criminalCheck: false }).success).toBe(false);
  });

  it("refuse sans attestation d'autorisation de travail", () => {
    expect(providerProfileSchema.safeParse({ ...valide, workAuthorization: false }).success).toBe(false);
  });

  it("refuse une catégorie hors liste (ex. plomberie)", () => {
    expect(providerProfileSchema.safeParse({ ...valide, category: "plumbing" }).success).toBe(false);
  });

  it("refuse un tarif hors bornes techniques", () => {
    expect(providerProfileSchema.safeParse({ ...valide, hourlyRate: 1 }).success).toBe(false);
    expect(providerProfileSchema.safeParse({ ...valide, hourlyRate: 500 }).success).toBe(false);
  });

  it("refuse une description avec numéro, courriel ou « cash »", () => {
    const bio = (t: string) => ({ ...valide, bio: `Étudiant sérieux et ponctuel. ${t}` });
    expect(providerProfileSchema.safeParse(bio("Appelez le 418-555-1234")).success).toBe(false);
    expect(providerProfileSchema.safeParse(bio("marc@exemple.com")).success).toBe(false);
    expect(providerProfileSchema.safeParse(bio("Paiement en ca$h")).success).toBe(false);
  });

  it("refuse un nom affiché avec coordonnées", () => {
    expect(providerProfileSchema.safeParse({ ...valide, publicName: "Marc 418 555 1234" }).success).toBe(false);
  });

  it("exige au moins un service et un secteur", () => {
    expect(providerProfileSchema.safeParse({ ...valide, serviceCodes: [] }).success).toBe(false);
    expect(providerProfileSchema.safeParse({ ...valide, neighborhoodCodes: [] }).success).toBe(false);
  });
});
