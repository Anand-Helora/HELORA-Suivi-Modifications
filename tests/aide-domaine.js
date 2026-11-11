// Outils partagés par les tests du domaine (pas un fichier *.test.js).
import { creerAdaptateurMemoire } from "../src/donnees/adaptateur-memoire.js";

/** Horloge déterministe : chaque appel avance d'une minute. */
export function horlogeTest(depart = "2026-11-01T08:00:00Z") {
  let t = Date.parse(depart);
  return () => {
    const date = new Date(t).toISOString();
    t += 60_000;
    return date;
  };
}

export function generateurIdTest() {
  let n = 0;
  return () => `test-id-${++n}`;
}

export function adaptateurTest(options = {}) {
  return creerAdaptateurMemoire({ horloge: horlogeTest(), genererId: generateurIdTest(), ...options });
}

/** Vérifie qu'une fonction lève une ErreurDomaine portant le code attendu. */
export function avecCode(code) {
  return (erreur) => erreur?.name === "ErreurDomaine" && erreur.code === code;
}

export const AUTEURS = Object.freeze({
  agent: { auteurId: "demo-acteur-agent" },
  cdp: { auteurId: "demo-acteur-cdp" },
  rm: { auteurId: "demo-acteur-rm" },
  rt: { auteurId: "demo-acteur-rt" },
  bim: { auteurId: "demo-acteur-bim" },
});

/** Saisie minimale valide d'une déclaration rapide de maintenance. */
export function saisieMaintenance(surcharges = {}) {
  return {
    operation: { titre: "Intervention fictive" },
    modification: {
      titre: "Prise fictive ajoutée",
      statutPhysique: "REALISEE",
      dateExecution: "2026-10-30T10:00:00+01:00",
    },
    localisations: [{ localisationId: "demo-loc-1", modeIdentification: "QR_SIMULE" }],
    ...surcharges,
  };
}
