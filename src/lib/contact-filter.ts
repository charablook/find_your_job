// Détecteur de coordonnées et de contournement du paiement (numéros, courriels, liens, « cash »...).
// Réutilisé par les profils (étape 2) et la messagerie (étape 6).
// Aucun filtre n'est parfait : il s'ajoute à la suspension de compte et à l'argent retenu jusqu'à la fin.

export type ContactReason = "phone" | "email" | "link" | "offsite_payment";

const SEP = "[\\s.\\-_,/]*";

// Lettres de remplacement courantes (« c@sh », « h0rs s1te ») + symboles joker (« c$sh », « ca$h »).
const LEET: Record<string, string> = {
  a: "a4@$",
  e: "e3€",
  i: "i1!|",
  l: "l1|",
  o: "o0",
  s: "s5$§",
  t: "t7+",
};
const JOKER = "*#%?";

function lettre(c: string): string {
  return `[${LEET[c] ?? c}${JOKER}]+`;
}

function motRegex(mot: string, limites: boolean): RegExp {
  const corps = [...mot].map(lettre).join(SEP);
  return new RegExp(limites ? `(?<![a-z])${corps}(?![a-z])` : corps, "u");
}

// Mots courts : on exige des frontières pour éviter les faux positifs.
const MOTS_COURTS = ["cash"];
const MOTS_LONGS = [
  "comptant",
  "horssite",
  "horsplateforme",
  "paypal",
  "interac",
  "etransfer",
  "virement",
  "whatsapp",
  "telegram",
  "snapchat",
  "instagram",
  "facebook",
  "messenger",
  "venmo",
];
const REGEX_PAIEMENT = [
  ...MOTS_COURTS.map((m) => motRegex(m, true)),
  ...MOTS_LONGS.map((m) => motRegex(m, false)),
];

const NOMBRES: Record<string, string> = {
  zero: "0", un: "1", une: "1", deux: "2", trois: "3", quatre: "4", cinq: "5",
  six: "6", sept: "7", huit: "8", neuf: "9",
  one: "1", two: "2", three: "3", four: "4", five: "5", seven: "7", eight: "8", nine: "9",
};

function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(/\p{M}/gu, "");
}

// Suite de chiffres ou de nombres écrits en lettres (« cinq un quatre... ») totalisant 7 chiffres ou plus.
function contientNumeroTelephone(texte: string): boolean {
  const mots = sansAccents(texte.toLowerCase()).match(/[a-z]+|\d+/g) ?? [];
  let total = 0;
  for (const mot of mots) {
    if (/^\d+$/.test(mot)) total += mot.length;
    else if (NOMBRES[mot]) total += 1;
    else total = 0;
    if (total >= 7) return true;
  }
  return false;
}

function contientCourriel(texte: string): boolean {
  const bas = sansAccents(texte.toLowerCase());
  return (
    /@/.test(texte) ||
    /\barobase\b/.test(bas) ||
    /[(\[]\s*at\s*[)\]]/.test(bas) ||
    /\bpoint\s+(com|ca|net|org)\b/.test(bas)
  );
}

function contientLien(texte: string): boolean {
  const bas = texte.toLowerCase();
  return (
    /https?:|www\./.test(bas) ||
    // Domaine collé (« exemple.ca ») ; la casse évite « dispo.Ca » écrit sans espace.
    /\b[a-z0-9-]+\.(?:com|ca|net|org|qc\.ca)\b/.test(texte)
  );
}

function contientPaiementHorsPlateforme(texte: string): boolean {
  const bas = sansAccents(texte.toLowerCase());
  return REGEX_PAIEMENT.some((r) => r.test(bas));
}

export function findContactInfo(texte: string): ContactReason[] {
  const raisons: ContactReason[] = [];
  if (contientNumeroTelephone(texte)) raisons.push("phone");
  if (contientCourriel(texte)) raisons.push("email");
  if (contientLien(texte)) raisons.push("link");
  if (contientPaiementHorsPlateforme(texte)) raisons.push("offsite_payment");
  return raisons;
}

export const CONTACT_INFO_MESSAGE =
  "Ce texte ne doit pas contenir de numéro de téléphone, de courriel, de lien ni de mention de paiement hors plateforme.";
