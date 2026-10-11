"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

const champ = "w-full rounded border border-zinc-300 px-3 py-2";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "inscription" | "connexion";
};

export function AuthForm({ action, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const inscription = mode === "inscription";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {inscription && (
        <>
          <label className="flex flex-col gap-1">
            Nom affiché
            <input name="displayName" required minLength={2} maxLength={60} className={champ} />
          </label>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1">Type de compte</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="client" defaultChecked /> Client (je cherche un service)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="provider" /> Prestataire (j’offre un service)
            </label>
          </fieldset>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="isAdult" required className="mt-1" />
            J’atteste avoir 18 ans ou plus. (Un parent peut réserver le tutorat de son enfant.)
          </label>
        </>
      )}
      <label className="flex flex-col gap-1">
        Courriel
        <input name="email" type="email" required autoComplete="email" className={champ} />
      </label>
      <label className="flex flex-col gap-1">
        Mot de passe
        <input
          name="password"
          type="password"
          required
          minLength={inscription ? 10 : undefined}
          autoComplete={inscription ? "new-password" : "current-password"}
          className={champ}
        />
        {inscription && <span className="text-sm text-zinc-500">Au moins 10 caractères.</span>}
      </label>
      {state?.error && <p role="alert" className="text-red-700">{state.error}</p>}
      {state?.message && <p role="status" className="text-green-800">{state.message}</p>}
      <button disabled={pending} className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-60">
        {pending ? "Un instant…" : inscription ? "Créer mon compte" : "Se connecter"}
      </button>
    </form>
  );
}
