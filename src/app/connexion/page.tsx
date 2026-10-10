import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signIn } from "@/app/actions/auth";

export const metadata = { title: "Connexion — Services Québec" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Se connecter</h1>
      {erreur === "lien" && (
        <p role="alert" className="mb-4 text-red-700">
          Le lien de confirmation est invalide ou expiré. Essayez de vous connecter ou de vous réinscrire.
        </p>
      )}
      <AuthForm action={signIn} mode="connexion" />
      <p className="mt-6 text-sm">
        Pas encore de compte ? <Link href="/inscription" className="underline">Créer un compte</Link>
      </p>
    </main>
  );
}
