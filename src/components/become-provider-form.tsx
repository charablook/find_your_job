"use client";

import { useActionState } from "react";
import { becomeProviderAction } from "@/app/actions/provider";

export function BecomeProviderForm({ needsAdultAttestation }: { needsAdultAttestation: boolean }) {
  const [state, formAction, pending] = useActionState(becomeProviderAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p>
        Vous avez un compte client. Pour offrir vos services (tutorat ou jardinage), devenez prestataire.
      </p>
      {needsAdultAttestation && (
        <label className="flex items-start gap-2">
          <input type="checkbox" name="isAdult" required className="mt-1" />
          J’atteste avoir 18 ans ou plus.
        </label>
      )}
      {state?.error && <p role="alert" className="text-red-700">{state.error}</p>}
      {state?.message && <p role="status" className="text-green-800">{state.message}</p>}
      <button disabled={pending} className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-60">
        {pending ? "Un instant…" : "Devenir prestataire"}
      </button>
    </form>
  );
}
