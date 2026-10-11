import { execSync } from "node:child_process";

// Lit les clés de la base Supabase locale (npm run db:start). Renvoie null si elle ne tourne pas.
export function lireCleLocales(): Record<string, string> | null {
  try {
    const sortie = execSync("npx supabase status -o env", {
      env: {
        ...process.env,
        DOCKER_HOST: `unix://${process.env.XDG_RUNTIME_DIR}/podman/podman.sock`,
      },
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 30_000,
    }).toString();
    const cles: Record<string, string> = {};
    for (const ligne of sortie.split("\n")) {
      const m = ligne.match(/^([A-Z_0-9]+)="?(.*?)"?$/);
      if (m) cles[m[1]] = m[2];
    }
    return cles.API_URL && cles.ANON_KEY && cles.SERVICE_ROLE_KEY ? cles : null;
  } catch {
    return null;
  }
}
