import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client à droits complets : SERVEUR SEULEMENT, après avoir vérifié l'utilisateur connecté.
// Ne jamais l'utiliser dans un composant client ni le renvoyer au navigateur.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
