import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/app/actions/auth";

export const metadata = { title: "Créer un compte — Services Québec" };

export default function InscriptionPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Créer un compte</h1>
      <AuthForm action={signUp} mode="inscription" />
      <p className="mt-6 text-sm">
        Déjà inscrit ? <Link href="/connexion" className="underline">Se connecter</Link>
      </p>
    </main>
  );
}
