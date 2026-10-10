import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mon compte — Services Québec" };

export default async function ComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // La RLS garantit qu'on ne reçoit que son propre profil.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  const roleLabel = profile?.role === "provider" ? "Prestataire" : "Client";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="mb-4 text-2xl font-semibold">Bonjour {profile?.display_name} !</h1>
      <p>Type de compte : {roleLabel}</p>
      <p className="text-zinc-600">Courriel : {user.email}</p>
    </main>
  );
}
