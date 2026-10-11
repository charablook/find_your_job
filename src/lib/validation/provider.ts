import { z } from "zod";
import { CONTACT_INFO_MESSAGE, findContactInfo } from "@/lib/contact-filter";

export const CATEGORIES = ["tutoring", "gardening"] as const;

// Textes des attestations. À FAIRE RELIRE PAR UN AVOCAT avant le lancement public.
export const ATTESTATION_TEXTS = {
  workAuthorization: "J’atteste être autorisé(e) à travailler au Canada.",
  minorsWork:
    "J’atteste que mon permis ou mon statut ne m’interdit pas de travailler auprès de mineurs.",
  criminalCheck:
    "J’atteste avoir fait vérifier mes antécédents judiciaires (vérification du secteur vulnérable).",
} as const;

export const providerProfileSchema = z
  .object({
    category: z.enum(CATEGORIES, { message: "Choisissez une catégorie." }),
    publicName: z
      .string()
      .trim()
      .min(2, "Le nom affiché doit contenir au moins 2 caractères.")
      .max(60, "Le nom affiché ne peut pas dépasser 60 caractères."),
    bio: z
      .string()
      .trim()
      .min(20, "La description doit contenir au moins 20 caractères.")
      .max(1000, "La description ne peut pas dépasser 1000 caractères."),
    // En dollars. Bornes techniques seulement : la plateforme ne fixe pas les prix.
    hourlyRate: z
      .number({ message: "Indiquez un tarif horaire valide." })
      .min(5, "Le tarif horaire doit être d’au moins 5 $.")
      .max(200, "Le tarif horaire ne peut pas dépasser 200 $."),
    serviceCodes: z.array(z.string()).min(1, "Choisissez au moins un service."),
    neighborhoodCodes: z.array(z.string()).min(1, "Choisissez au moins un secteur."),
    workAuthorization: z.literal(true, { message: "Cette attestation est obligatoire." }),
    minorsWorkAuthorization: z.boolean(),
    criminalCheck: z.boolean(),
    photoConsent: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (findContactInfo(v.bio).length > 0) {
      ctx.addIssue({ code: "custom", path: ["bio"], message: CONTACT_INFO_MESSAGE });
    }
    if (findContactInfo(v.publicName).length > 0) {
      ctx.addIssue({ code: "custom", path: ["publicName"], message: CONTACT_INFO_MESSAGE });
    }
    if (v.category === "tutoring" && !(v.minorsWorkAuthorization && v.criminalCheck)) {
      ctx.addIssue({
        code: "custom",
        path: ["minorsWorkAuthorization"],
        message: "Pour le tutorat, les deux attestations concernant le travail auprès de mineurs sont obligatoires.",
      });
    }
  });

export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;
