import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CODES_ERREUR,
  STATUTS_PHYSIQUES,
  STATUTS_TRAITEMENT,
  TRANSITIONS_PHYSIQUES,
  TRANSITIONS_TRAITEMENT,
  peutPasser,
  verifierRejetTraitement,
  verifierStatutPhysiqueInitial,
  verifierTransitionImpact,
  verifierTransitionPhysique,
  verifierTransitionTraitement,
} from "../src/domaine/index.js";
import { avecCode } from "./aide-domaine.js";

const INTERDITE = avecCode(CODES_ERREUR.TRANSITION_INTERDITE);
const GARDE = avecCode(CODES_ERREUR.GARDE_NON_SATISFAITE);

describe("travaux physiques", () => {
  it("suit PLANIFIEE → EN_COURS → REALISEE", () => {
    assert.doesNotThrow(() => verifierTransitionPhysique("PLANIFIEE", "EN_COURS"));
    assert.doesNotThrow(() => verifierTransitionPhysique("EN_COURS", "REALISEE"));
  });

  it("interdit sauts, retours arrière et sortie d'ANNULEE", () => {
    assert.throws(() => verifierTransitionPhysique("PLANIFIEE", "REALISEE"), INTERDITE);
    assert.throws(() => verifierTransitionPhysique("REALISEE", "EN_COURS"), INTERDITE);
    assert.throws(() => verifierTransitionPhysique("ANNULEE", "PLANIFIEE"), INTERDITE);
  });

  it("une annulation doit être motivée", () => {
    assert.throws(() => verifierTransitionPhysique("EN_COURS", "ANNULEE"), GARDE);
    assert.throws(() => verifierTransitionPhysique("EN_COURS", "ANNULEE", { motif: "  " }), GARDE);
    assert.doesNotThrow(() => verifierTransitionPhysique("EN_COURS", "ANNULEE", { motif: "Projet abandonné" }));
  });

  it("n'utilise jamais un statut documentaire comme statut physique", () => {
    for (const cibles of Object.values(TRANSITIONS_PHYSIQUES)) {
      for (const cible of cibles) assert.ok(STATUTS_PHYSIQUES.includes(cible));
    }
    assert.throws(() => verifierTransitionPhysique("REALISEE", "PUBLIE"), INTERDITE);
    assert.equal(peutPasser(TRANSITIONS_PHYSIQUES, "EN_COURS", "A_JOUR"), false);
  });

  it("maintenance déclarée après travaux : création directe en REALISEE ; chantier : PLANIFIEE", () => {
    assert.doesNotThrow(() => verifierStatutPhysiqueInitial("MAINTENANCE", "REALISEE"));
    assert.doesNotThrow(() => verifierStatutPhysiqueInitial("CHANTIER", "PLANIFIEE"));
    assert.throws(() => verifierStatutPhysiqueInitial("CHANTIER", "REALISEE"), INTERDITE);
    assert.throws(() => verifierStatutPhysiqueInitial("MAINTENANCE", "ANNULEE"), INTERDITE);
  });
});

describe("impact documentaire", () => {
  it("A_QUALIFIER → MISE_A_JOUR_REQUISE ou SANS_IMPACT justifié", () => {
    assert.doesNotThrow(() => verifierTransitionImpact("A_QUALIFIER", "MISE_A_JOUR_REQUISE"));
    assert.throws(() => verifierTransitionImpact("A_QUALIFIER", "SANS_IMPACT"), GARDE);
    assert.doesNotThrow(() => verifierTransitionImpact("A_QUALIFIER", "SANS_IMPACT", { justification: "À l'identique" }));
  });

  it("une décision peut être révisée, mais pas ramenée à A_QUALIFIER", () => {
    assert.doesNotThrow(() => verifierTransitionImpact("SANS_IMPACT", "MISE_A_JOUR_REQUISE"));
    assert.throws(() => verifierTransitionImpact("MISE_A_JOUR_REQUISE", "A_QUALIFIER"), INTERDITE);
  });
});

describe("traitement documentaire", () => {
  it("suit la chaîne A_PREPARER → … → PUBLIE sans saut", () => {
    for (let i = 0; i < STATUTS_TRAITEMENT.length - 1; i += 1) {
      assert.doesNotThrow(() => verifierTransitionTraitement(STATUTS_TRAITEMENT[i], STATUTS_TRAITEMENT[i + 1]));
    }
    assert.throws(() => verifierTransitionTraitement("EN_COURS", "PUBLIE"), INTERDITE);
    assert.deepEqual([...TRANSITIONS_TRAITEMENT.PUBLIE], []);
  });

  it("un rejet est motivé et impossible avant soumission ou après publication", () => {
    assert.throws(() => verifierRejetTraitement("CONTROLE_BIM", ""), GARDE);
    assert.doesNotThrow(() => verifierRejetTraitement("CONTROLE_BIM", "Nomenclature non conforme"));
    assert.throws(() => verifierRejetTraitement("EN_COURS", "motif"), INTERDITE);
    assert.throws(() => verifierRejetTraitement("PUBLIE", "motif"), INTERDITE);
  });

  it("signale un statut de départ inconnu", () => {
    assert.throws(() => verifierTransitionTraitement("INCONNU", "EN_COURS"), avecCode(CODES_ERREUR.VALIDATION));
  });
});
