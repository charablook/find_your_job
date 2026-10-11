export const STATUS_LABELS = {
  pending: { label: "En attente de validation", style: "bg-amber-100 text-amber-900" },
  approved: { label: "Profil vérifié", style: "bg-green-100 text-green-900" },
  suspended: { label: "Suspendu", style: "bg-red-100 text-red-900" },
} as const;

export type VerificationStatus = keyof typeof STATUS_LABELS;
