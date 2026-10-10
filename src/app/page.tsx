import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">
        Des services de confiance entre voisins, à Québec
      </h1>
      <p className="max-w-2xl text-lg text-zinc-600">
        Trouvez un tuteur pour vos études ou un coup de main pour l’entretien de votre terrain :
        tonte de gazon, désherbage, ramassage de feuilles. Les paiements sont sécurisés et les
        prestataires sont vérifiés.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/inscription" className="rounded bg-green-700 px-5 py-2.5 text-white">
          Créer un compte
        </Link>
        <Link href="/connexion" className="rounded border border-zinc-300 px-5 py-2.5">
          Se connecter
        </Link>
      </div>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-zinc-200 p-5">
          <h2 className="font-semibold">Tutorat</h2>
          <p className="text-zinc-600">Aide aux devoirs et soutien scolaire avec des tuteurs de votre quartier.</p>
        </div>
        <div className="rounded border border-zinc-200 p-5">
          <h2 className="font-semibold">Jardinage léger</h2>
          <p className="text-zinc-600">Tonte, désherbage et ramassage de feuilles.</p>
        </div>
      </section>
    </main>
  );
}
