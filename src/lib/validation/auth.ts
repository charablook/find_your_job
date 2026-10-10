import { z } from "zod";

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(60, "Le nom ne peut pas dépasser 60 caractères."),
  email: z.string().trim().toLowerCase().email("Adresse courriel invalide."),
  password: z
    .string()
    .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
    .max(72, "Le mot de passe ne peut pas dépasser 72 caractères."),
  // Seuls ces deux rôles sont permis à l'inscription (jamais « admin »).
  role: z.enum(["client", "provider"], {
    message: "Choisissez un type de compte.",
  }),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse courriel invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});
