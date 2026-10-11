# Spécification — Plateforme de services entre particuliers (Québec)

Document de référence, lu à la demande depuis `CLAUDE.md`. Les règles non négociables sont dans `CLAUDE.md` ; ici, le détail du produit, le plan et les critères de validation.

## 1. Utilisateurs
- **Client** : majeur (18 ans+), cherche un service, réserve, paie, laisse un avis. Peut être un parent (tutorat d'un mineur).
- **Prestataire** : majeur (18 ans+), crée un profil, fixe lui-même ses tarifs et ses disponibilités, reçoit des réservations, est payé automatiquement.
- **Admin** (le fondateur) : valide les prestataires, suspend des comptes.

## 2. Fonctionnalités du MVP
1. Inscription / connexion (courriel + mot de passe, vérification du courriel).
2. Profil prestataire : photo (prestataires seulement, consentement explicite, visible après validation), description, catégorie, matières (tutorat) ou types de tâches (jardinage : tonte, désherbage, ramassage de feuilles, déneigement manuel au pelle), quartier(s) de Québec, tarif horaire, disponibilités, statut de vérification visible.
3. Recherche et filtres : catégorie, matière, quartier, prix, disponibilités.
4. Réservation d'une séance (date, heure, durée) avec confirmation du prestataire.
5. Paiement en ligne à la réservation ; versement au prestataire après la séance.
6. Forfaits prépayés (ex. 5 ou 10 séances à rabais).
7. Messagerie interne entre client et prestataire.
8. Avis et notes, possibles uniquement après une séance payée.
9. Tableau de bord admin minimal.
10. Courriels automatiques : confirmation, rappel de séance, reçu.

## 3. Éviter le contournement (paiement en liquide)
- Coordonnées cachées tant qu'il n'y a pas de réservation payée.
- Messagerie avec filtre qui bloque numéros, courriels, liens et mots du type « cash », « comptant », « hors site ».
- Paiement retenu jusqu'à la fin de la séance ; remboursement si le prestataire ne se présente pas.
- Avis vérifiés et forfaits prépayés : avantages exclusifs à la plateforme.
- Commission dégressive (ex. 15 % puis 10 % après plusieurs séances avec le même client).
- Suspension du compte en cas de contournement (prévue aux conditions d'utilisation).

## 4. Contraintes légales (Québec)
Le fondateur n'est pas avocat : tout texte légal est un brouillon à faire relire avant le lancement public.
- **Langue** : tout le site en français.
- **Loi 25** : page publique avec le titre et les coordonnées du responsable de la protection des renseignements personnels ; politique de confidentialité ; bandeau de témoins (cookies) où refuser est aussi simple qu'accepter ; journal des incidents de confidentialité ; si les messages sont analysés automatiquement (filtre), le dire dans la politique.
- **Statut d'intermédiaire** : la plateforme ne fixe ni les prix ni les horaires des prestataires, qui sont indépendants. Aucune fonctionnalité qui les traite comme des employés.
- **Prestataires** : attestation (case à cocher + date) qu'ils sont autorisés à travailler au Canada ; pour le tutorat, attestation que leur permis ou statut ne leur interdit pas de travailler auprès de mineurs ; vérification d'identité via l'onboarding Stripe Connect ; pour le tutorat de mineurs, attestation de vérification des antécédents judiciaires.
- **Déclaration fiscale de plateforme** : prévoir un champ pour l'identité fiscale des prestataires, mais ne rien collecter de sensible (NAS, etc.) tant qu'un comptable n'a pas confirmé que c'est requis.
- **Pages à créer** (brouillons marqués « À FAIRE RELIRE PAR UN AVOCAT ») : conditions d'utilisation, politique de confidentialité, politique d'annulation et de remboursement.

## 5. Plan par étapes et critères de validation
Une étape à la fois. Une étape n'est terminée que si son critère est vérifié et montré (sortie des commandes).

| # | Étape | Critère de validation |
|---|-------|-----------------------|
| 1 | Squelette : projet Next.js/TypeScript/Tailwind, Supabase, authentification, accueil en français, scripts `typecheck` et `test` (Vitest) | `npm run lint`, `typecheck`, `test` et `build` passent ; inscription et connexion fonctionnent en local |
| 2 | Profils prestataires + statut de vérification | Un prestataire crée et modifie son profil ; un autre utilisateur ne peut pas le modifier (test) |
| 3 | Recherche et filtres | Les filtres renvoient les bons résultats sur des données de test ; aucune coordonnée dans les réponses (test) |
| 4 | Réservation + disponibilités + code de vérification | Impossible de réserver un créneau déjà pris (test) ; le prestataire confirme ou refuse ; à la réservation payée, le client reçoit un code à 6 chiffres que le prestataire entre sur place (essais limités, code stocké haché) |
| 5 | Paiement Stripe Connect + forfaits (mode test) | Paiement test réussi ; versement après la séance, débloqué par l'entrée du code de vérification ; remboursement en cas d'absence ; signature des webhooks vérifiée |
| 6 | Messagerie filtrée + avis | Messages avec numéro, courriel ou « cash » bloqués (tests) ; avis impossible sans séance payée (test) |
| 7 | Pages légales + bandeau de témoins | Aucun traceur avant consentement ; refuser aussi facile qu'accepter ; page du responsable vie privée accessible ; mention « À FAIRE RELIRE » présente |
| 8 | Admin minimal | Seul l'admin accède au tableau de bord ; il peut valider et suspendre (test) |
| 9 | Sécurité et déploiement | Revue des permissions ; aucune clé dans le dépôt ; build de production OK |

## 6. Hors périmètre V1
Autres catégories de services, application mobile, paiement en liquide, abonnements pour prestataires, autres villes.

## 7. Questions ouvertes (à trancher avec le fondateur)
- Nom du site et nom de domaine (.ca)
- Commission exacte et prix des forfaits
- Relecture par un avocat et un comptable avant le lancement public
