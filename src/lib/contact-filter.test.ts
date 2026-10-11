import { describe, expect, it } from "vitest";
import { findContactInfo } from "./contact-filter";

const bloque = (t: string) => expect(findContactInfo(t).length, t).toBeGreaterThan(0);
const permis = (t: string) => expect(findContactInfo(t), t).toEqual([]);

describe("findContactInfo — à bloquer", () => {
  it("numéros de téléphone", () => {
    bloque("Appelez-moi au 514-555-1234");
    bloque("(418) 555 1234");
    bloque("4185551234");
    bloque("418.555.1234");
    bloque("cinq un quatre cinq cinq cinq un deux trois quatre");
    bloque("four one eight five five five one two three four");
  });

  it("courriels", () => {
    bloque("marie@gmail.com");
    bloque("marie arobase gmail point com");
    bloque("marie (at) exemple");
  });

  it("liens", () => {
    bloque("Visitez https://exemple.com/moi");
    bloque("www.exemple.ca");
    bloque("mon site : exemple.ca");
  });

  it("paiement hors plateforme, y compris déguisé", () => {
    bloque("Je prends du cash");
    bloque("ca$h seulement");
    bloque("c$sh seulement");
    bloque("c@sh");
    bloque("c.a.s.h");
    bloque("C A S H");
    bloque("caaasssh");
    bloque("paiement comptant");
    bloque("c0mpt@nt");
    bloque("on peut payer hors site");
    bloque("h0rs s1te");
    bloque("hors-plateforme");
    bloque("paypal ou interac");
    bloque("e-transfer");
    bloque("écrivez-moi sur WhatsApp");
  });
});

describe("findContactInfo — à laisser passer", () => {
  it("textes normaux de profil", () => {
    permis("J'ai 5 ans d'expérience en mathématiques et j'aime travailler avec les enfants.");
    permis("Tarif de 25 $ de l'heure, négociable pour plusieurs séances.");
    permis("Disponible les soirs et les fins de semaine. Sérieux et ponctuel.");
    permis("Je tonds le gazon, je ramasse les feuilles et je pelte les entrées.");
    permis("Étudiant en 3e année à l'Université Laval, 2 ans d'expérience. Dispo.Ca me va très bien.");
    permis("Un chat, deux chiens et trois enfants : j'adore les animaux !");
  });
});
