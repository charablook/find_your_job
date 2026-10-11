"use client";

import { useActionState, useState } from "react";
import { saveProviderProfileAction } from "@/app/actions/provider";
import { ATTESTATION_TEXTS } from "@/lib/validation/provider";

type Option = { code: string; label: string };
type Service = Option & { category: "tutoring" | "gardening" };

export type ProviderFormValues = {
  category: "tutoring" | "gardening";
  publicName: string;
  bio: string;
  hourlyRate: string;
  serviceCodes: string[];
  neighborhoodCodes: string[];
  hasPhoto: boolean;
  exists: boolean; // le profil est déjà enregistré
};

const champ = "w-full rounded border border-zinc-300 px-3 py-2";

export function ProviderForm({
  services,
  neighborhoods,
  initial,
}: {
  services: Service[];
  neighborhoods: Option[];
  initial: ProviderFormValues | null;
}) {
  const [state, formAction, pending] = useActionState(saveProviderProfileAction, undefined);
  const [category, setCategory] = useState<"tutoring" | "gardening">(initial?.category ?? "tutoring");
  const exists = initial?.exists ?? false;
  const categorieFixe = exists; // la catégorie ne change plus après la création
  const tutorat = category === "tutoring";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-1" disabled={categorieFixe}>
        <legend className="mb-1 font-medium">Catégorie</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="category" value="tutoring" checked={tutorat} onChange={() => setCategory("tutoring")} /> Tutorat
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="category" value="gardening" checked={!tutorat} onChange={() => setCategory("gardening")} /> Jardinage léger
        </label>
        {categorieFixe && <input type="hidden" name="category" value={category} />}
      </fieldset>

      <label className="flex flex-col gap-1">
        Nom affiché publiquement (ex. : prénom et initiale)
        <input name="publicName" required minLength={2} maxLength={60} defaultValue={initial?.publicName} className={champ} />
      </label>

      <label className="flex flex-col gap-1">
        Description (20 à 1000 caractères)
        <textarea name="bio" required minLength={20} maxLength={1000} rows={5} defaultValue={initial?.bio} className={champ} />
        <span className="text-sm text-zinc-500">
          N’indiquez ni téléphone, ni courriel, ni lien : ils sont refusés. Les coordonnées sont échangées après une réservation payée.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        Tarif horaire ($)
        <input name="hourlyRate" type="number" required min={5} max={200} step="0.5" defaultValue={initial?.hourlyRate} className={champ} />
        <span className="text-sm text-zinc-500">Vous fixez librement votre tarif.</span>
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">{tutorat ? "Matières enseignées" : "Tâches offertes"}</legend>
        {services
          .filter((s) => s.category === category)
          .map((s) => (
            <label key={s.code} className="flex items-center gap-2">
              <input type="checkbox" name="serviceCodes" value={s.code} defaultChecked={initial?.serviceCodes.includes(s.code)} />
              {s.label}
            </label>
          ))}
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">Secteurs desservis</legend>
        {neighborhoods.map((n) => (
          <label key={n.code} className="flex items-center gap-2">
            <input type="checkbox" name="neighborhoodCodes" value={n.code} defaultChecked={initial?.neighborhoodCodes.includes(n.code)} />
            {n.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-4">
        <legend className="px-1 font-medium">Attestations</legend>
        <p className="text-xs text-amber-900">Textes provisoires — À FAIRE RELIRE PAR UN AVOCAT.</p>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="workAuthorization" required className="mt-1" defaultChecked={exists} />
          {ATTESTATION_TEXTS.workAuthorization}
        </label>
        {tutorat && (
          <>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="minorsWorkAuthorization" required className="mt-1" defaultChecked={exists} />
              {ATTESTATION_TEXTS.minorsWork}
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="criminalCheck" required className="mt-1" defaultChecked={exists} />
              {ATTESTATION_TEXTS.criminalCheck}
            </label>
          </>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Photo de profil (facultative)</legend>
        {initial?.hasPhoto && <p className="text-sm text-zinc-600">Une photo est déjà enregistrée. Choisir un fichier la remplace (et demande une nouvelle validation).</p>}
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
        <span className="text-sm text-zinc-500">JPEG, PNG ou WebP, 3 Mo au maximum. Elle est recadrée et ses métadonnées sont supprimées.</span>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="photoConsent" className="mt-1" />
          Je consens à ce que ma photo soit affichée publiquement sur mon profil, une fois celui-ci validé.
        </label>
      </fieldset>

      {state?.error && <p role="alert" className="text-red-700">{state.error}</p>}
      {state?.message && <p role="status" className="text-green-800">{state.message}</p>}
      <button disabled={pending} className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-60">
        {pending ? "Un instant…" : "Enregistrer mon profil"}
      </button>
    </form>
  );
}
