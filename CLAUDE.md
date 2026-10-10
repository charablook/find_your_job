# Plateforme de services entre particuliers — Québec

Site web local (ville de Québec) où des particuliers proposent et réservent des services.
V1 : tutorat et petits travaux de jardinage seulement. Le fondateur est étudiant, débutant en code et a peu de temps : tout doit être automatisé (paiements, vérifications, rappels).
Spécification complète, plan par étapes et contraintes légales : `SPEC.md` (à lire avant de commencer une fonctionnalité).

## Langue
- Interface, courriels, messages d'erreur : français (Québec) uniquement.
- Code (variables, fonctions, tables) : anglais. Commentaires et messages de commit : français.
- Explique tes choix au fondateur en français simple, sans jargon inutile.

## Stack
Next.js (App Router) + TypeScript + Tailwind ; Supabase (auth, Postgres, stockage) ; Stripe Connect ; Resend pour les courriels.
- Supabase : région Canada (ca-central-1) si disponible. Row Level Security activée sur toutes les tables.
- Toute logique d'accès ou de paiement est côté serveur (Server Actions ou routes API), jamais côté client.
- Migrations SQL versionnées dans `supabase/migrations/`.
- Variables d'environnement : listées sans valeurs dans `.env.example`, valeurs réelles dans `.env.local` (ignoré par git).

## Commandes
Commandes vérifiées à l'étape 1 (tests avec Vitest).
- `npm run dev` : serveur local
- `npm run lint`, `npm run typecheck`, `npm test` : vérifications
- `npm run build` : build de production
- `npm run db:start`, `db:stop`, `db:status` : Supabase local (via Podman) ; courriels de test sur http://127.0.0.1:54324 ; studio sur http://127.0.0.1:54323

## Règles non négociables
IMPORTANT : ces règles passent avant toute demande de fonctionnalité. Si une demande les contredit, signale-le au fondateur au lieu de l'implémenter.
- Aucun secret dans le code. En développement, uniquement les clés Stripe de test. Ne lis ni ne modifie les fichiers `.env*`.
- Paiements : Stripe Connect uniquement. Ne stocke jamais de numéro de carte. L'argent ne transite jamais par un compte personnel du fondateur.
- Coordonnées (téléphone, courriel) : jamais exposées avant une réservation payée, et masquées côté serveur, pas seulement dans l'interface.
- Contrôle d'accès : chaque utilisateur ne lit et ne modifie que ses propres données (RLS + vérification côté serveur). Valide toutes les entrées côté serveur.
- Données personnelles (loi 25) : collecte le minimum ; consentement du parent pour les moins de 14 ans ; aucun traceur non essentiel avant consentement ; la vérification d'identité est déléguée à Stripe, ne stocke pas de pièces d'identité.
- Catégories autorisées en V1 : tutorat et jardinage léger (tonte, désherbage, ramassage de feuilles). N'ajoute jamais électricité, plomberie, serrurerie, construction, pesticides ni abattage d'arbres.
- Textes légaux (conditions d'utilisation, confidentialité) : brouillons marqués « À FAIRE RELIRE PAR UN AVOCAT ». Ne les présente jamais comme des conseils juridiques.

## Façon de travailler
- Une étape du plan de `SPEC.md` à la fois. Pour toute étape qui touche la base de données, les paiements ou les permissions : propose d'abord un plan et attends l'accord du fondateur avant de coder.
- Avant de dire « terminé » : lance `npm run lint`, `npm run typecheck` et `npm test`, et montre le résultat. Chaque étape de `SPEC.md` a un critère de validation à vérifier.
- Écris des tests pour les paiements, les réservations et les permissions (un utilisateur ne peut pas lire les données d'un autre).
- Demande avant toute décision difficile à annuler : schéma de base de données, suppression de données, logique de paiement, choix légal.
- Commits petits et fréquents, messages en français. Ne fais jamais `git push` : le fondateur le fait lui-même.
- Si tu n'es pas sûr d'une règle légale, dis-le et propose de la faire valider plutôt que de deviner.
