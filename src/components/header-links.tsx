import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

export async function HeaderLinks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link href="/compte">Mon compte</Link>
        <form action={signOut}>
          <button type="submit" className="underline">
            Se déconnecter
          </button>
        </form>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4 text-sm">
      <Link href="/connexion">Se connecter</Link>
      <Link href="/inscription" className="rounded bg-green-700 px-3 py-1.5 text-white">
        Créer un compte
      </Link>
    </div>
  );
}
