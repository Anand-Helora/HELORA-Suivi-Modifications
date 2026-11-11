// Cas de tests prioritaires de la spécification (docs/specification-modele-mvp.md, § 8).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CODES_ERREUR,
  calculerCompteurs,
  calculerDelaiMiseAJour,
  calculerStatutDocumentaire,
  deriverStatutPhysiqueOperation,
  estUriFictive,
  problemesPublication,
} from "../src/domaine/index.js";
import { COLLECTIONS } from "../src/donnees/adaptateur-memoire.js";
import { ACTEURS_DEMO, creerFixturesDemo } from "../src/donnees/fixtures-demo.js";
import { AUTEURS, adaptateurTest, avecCode, saisieMaintenance } from "./aide-domaine.js";

const GARDE = avecCode(CODES_ERREUR.GARDE_NON_SATISFAITE);

const statutDoc = (a, id) => calculerStatutDocumentaire(a.instantane(), id);

function realiser(a, id) {
  a.changerStatutPhysique(id, "EN_COURS", AUTEURS.cdp);
  a.changerStatutPhysique(id, "REALISEE", { ...AUTEURS.cdp, dateExecution: "2026-10-20T16:00:00+02:00" });
}

function amenerEnControleBim(a, id) {
  a.avancerTraitement(id, "EN_COURS", AUTEURS.bim);
  a.avancerTraitement(id, "SOUMIS_A_CONTROLE", AUTEURS.bim);
  a.avancerTraitement(id, "CONTROLE_BIM", AUTEURS.bim);
}

function valider(a, cibleId, nature, roleAuMoment, decision = "APPROUVEE", commentaire) {
  return a.enregistrerValidation({
    cibleType: nature === "TECHNIQUE" || nature === "SANS_IMPACT" ? "MODIFICATION" : "TRAITEMENT",
    cibleId,
    nature,
    decision,
    roleAuMoment,
    commentaire,
    auteurId: "demo-acteur-test",
  });
}

describe("§ 8.1 — une opération de chantier regroupe 3 modifications et plusieurs disciplines", () => {
  it("expose les modifications, disciplines et un statut physique dérivé", () => {
    const a = adaptateurTest();
    const op = a.creerOperation({ origine: "CHANTIER", titre: "Chantier fictif" }, AUTEURS.cdp);
    for (const [titre, disciplineCode] of [["Câblage", "ELEC"], ["Ventilation", "CVC"], ["Évacuation", "PLOMBERIE"]]) {
      a.ajouterModification(op.id, { titre, disciplineCode }, AUTEURS.cdp);
    }
    const compteurs = calculerCompteurs(a.instantane(), { operationId: op.id });
    assert.equal(compteurs.total, 3);
    assert.deepEqual({ ...compteurs.parDiscipline }, { ELEC: 1, CVC: 1, PLOMBERIE: 1 });
    assert.equal(deriverStatutPhysiqueOperation(a.instantane(), op.id).statut, "PLANIFIEE");
  });

  it("le statut physique de l'opération est dérivé ; un mélange reste explicite (mixte)", () => {
    const a = adaptateurTest();
    a.changerStatutPhysique("demo-mod-1", "EN_COURS", AUTEURS.cdp);
    const derive = deriverStatutPhysiqueOperation(a.instantane(), "demo-op-1");
    assert.equal(derive.statut, null);
    assert.equal(derive.mixte, true);
    assert.deepEqual({ ...derive.compteurs }, { PLANIFIEE: 2, EN_COURS: 1, REALISEE: 0, ANNULEE: 0 });

    a.changerStatutPhysique("demo-mod-2", "ANNULEE", { ...AUTEURS.cdp, motif: "Abandon fictif" });
    a.changerStatutPhysique("demo-mod-3", "ANNULEE", { ...AUTEURS.cdp, motif: "Abandon fictif" });
    assert.equal(deriverStatutPhysiqueOperation(a.instantane(), "demo-op-1").statut, "EN_COURS");
  });

  it("une opération sans modification n'a pas de statut physique", () => {
    const a = adaptateurTest();
    const op = a.creerOperation({ origine: "CHANTIER", titre: "Vide" }, AUTEURS.cdp);
    assert.deepEqual(
      { ...deriverStatutPhysiqueOperation(a.instantane(), op.id), compteurs: undefined },
      { statut: null, mixte: false, total: 0, compteurs: undefined },
    );
  });
});

describe("§ 8.2 — une modification affecte 3 locaux et une zone sans duplicata", () => {
  it("un seul enregistrement de modification, quatre liens, doublon de lien refusé", () => {
    const a = adaptateurTest();
    const avant = a.lister("modifications").length;
    const liens = a.lister("liensLocalisation").filter((l) => l.modificationId === "demo-mod-2");
    assert.equal(liens.length, 4);
    assert.equal(a.lister("modifications").filter((m) => m.id === "demo-mod-2").length, 1);
    assert.throws(
      () => a.associerLocalisation("demo-mod-2", "demo-loc-1", "RECHERCHE", AUTEURS.cdp),
      avecCode(CODES_ERREUR.DOUBLON),
    );
    assert.equal(a.lister("modifications").length, avant);
  });
});

describe("§ 8.3 — un traitement couvre 2 modifications d'un même chantier", () => {
  it("une seule révision, plusieurs liens, association en double refusée", () => {
    const a = adaptateurTest();
    const tr = a.creerTraitement(
      { documentId: "demo-doc-2", indiceCible: "A", modificationIds: ["demo-mod-1", "demo-mod-2", "demo-mod-1"] },
      AUTEURS.cdp,
    );
    assert.equal(a.lister("traitements").filter((t) => t.documentId === "demo-doc-2").length, 1);
    assert.equal(a.lister("liensTraitement").filter((l) => l.traitementId === tr.id).length, 2);
    assert.throws(() => a.associerTraitement("demo-mod-2", tr.id, AUTEURS.cdp), avecCode(CODES_ERREUR.DOUBLON));
  });

  it("une modification non qualifiée en mise à jour requise ne peut pas être liée", () => {
    const a = adaptateurTest();
    assert.throws(() => a.associerTraitement("demo-mod-3", "demo-tr-1", AUTEURS.cdp), avecCode(CODES_ERREUR.RELATION_INVALIDE));
  });
});

describe("§ 8.4 — maintenance déclarée après travaux", () => {
  it("est REALISEE physiquement mais A_QUALIFIER documentairement", () => {
    const a = adaptateurTest();
    const { modification } = a.declarerMaintenance(saisieMaintenance(), { ...AUTEURS.agent, cleIdempotence: "form-1" });
    assert.equal(modification.statutPhysique, "REALISEE");
    assert.equal(modification.impactDocumentaire, "A_QUALIFIER");
    assert.equal(statutDoc(a, modification.id), "A_QUALIFIER");
    assert.equal(calculerCompteurs(a.instantane()).realiseesNonAJour, 2);
  });
});

describe("§ 8.5 — SANS_IMPACT sans justification ou sans validation du responsable", () => {
  it("refuse la décision sans justification", () => {
    const a = adaptateurTest();
    assert.throws(() => a.qualifierImpact("demo-mod-4", "SANS_IMPACT", AUTEURS.rm), GARDE);
    assert.equal(a.lire("modifications", "demo-mod-4").impactDocumentaire, "A_QUALIFIER");
  });

  it("reste en attente tant que le responsable de la source n'a pas validé", () => {
    const a = adaptateurTest();
    a.qualifierImpact("demo-mod-4", "SANS_IMPACT", { ...AUTEURS.agent, justification: "Remplacement à l'identique" });
    assert.equal(statutDoc(a, "demo-mod-4"), "SANS_IMPACT_EN_ATTENTE");
    // Maintenance : le chef de projet n'est pas le responsable compétent.
    assert.throws(() => valider(a, "demo-mod-4", "SANS_IMPACT", "CHEF_PROJET"), GARDE);
    valider(a, "demo-mod-4", "SANS_IMPACT", "RESPONSABLE_MAINTENANCE", "REFUSEE", "Plan à vérifier");
    assert.equal(statutDoc(a, "demo-mod-4"), "SANS_IMPACT_EN_ATTENTE");
    valider(a, "demo-mod-4", "SANS_IMPACT", "RESPONSABLE_MAINTENANCE");
    assert.equal(statutDoc(a, "demo-mod-4"), "SANS_IMPACT_VALIDE");
    assert.equal(calculerCompteurs(a.instantane()).realiseesNonAJour, 0);
  });

  it("une décision révisée conserve sa trace et exige une nouvelle validation", () => {
    const a = adaptateurTest();
    a.qualifierImpact("demo-mod-4", "SANS_IMPACT", { ...AUTEURS.agent, justification: "À l'identique" });
    valider(a, "demo-mod-4", "SANS_IMPACT", "RESPONSABLE_MAINTENANCE");
    a.qualifierImpact("demo-mod-4", "MISE_A_JOUR_REQUISE", { ...AUTEURS.rm, raison: "Le modèle diffère" });
    a.qualifierImpact("demo-mod-4", "SANS_IMPACT", { ...AUTEURS.rm, justification: "Finalement identique" });
    assert.equal(statutDoc(a, "demo-mod-4"), "SANS_IMPACT_EN_ATTENTE");
    const qualifications = a.historique("MODIFICATION", "demo-mod-4").filter((e) => e.action === "QUALIFICATION_IMPACT");
    assert.equal(qualifications.length, 3);
    assert.equal(qualifications[1].avant.justificationSansImpact, "À l'identique");
  });

  it("une validation SANS_IMPACT exige une modification qualifiée SANS_IMPACT", () => {
    const a = adaptateurTest();
    assert.throws(() => valider(a, "demo-mod-4", "SANS_IMPACT", "RESPONSABLE_MAINTENANCE"), GARDE);
  });
});

describe("§ 8.6 — justificatifs manquants", () => {
  it("déclaration acceptée sans pièce, publication bloquée lorsque la pièce est exigée", () => {
    const a = adaptateurTest();
    const { modification } = a.declarerMaintenance(saisieMaintenance(), { ...AUTEURS.agent, cleIdempotence: "f" });
    a.qualifierImpact(modification.id, "MISE_A_JOUR_REQUISE", {
      ...AUTEURS.rm,
      exigences: { controleTechnique: false, justificatifs: ["AS_BUILT"] },
    });
    const tr = a.creerTraitement({ documentId: "demo-doc-2", indiceCible: "B", modificationIds: [modification.id] }, AUTEURS.rm);
    amenerEnControleBim(a, tr.id);
    valider(a, tr.id, "BIM", "REFERENT_BIM");
    valider(a, tr.id, "FINALE", "RESPONSABLE_MAINTENANCE");
    a.avancerTraitement(tr.id, "AUTORISE", AUTEURS.rm);
    assert.throws(() => a.avancerTraitement(tr.id, "PUBLIE", AUTEURS.rm), GARDE);
    assert.match(problemesPublication(a.instantane(), tr.id).join(), /AS_BUILT/);

    a.ajouterJustificatif(
      { cibleType: "TRAITEMENT", cibleId: tr.id, categorie: "AS_BUILT", libelle: "As-built fictif", referenceFichierDemo: "asbuilt-demo.pdf" },
      AUTEURS.agent,
    );
    const publie = a.avancerTraitement(tr.id, "PUBLIE", AUTEURS.rm);
    assert.equal(publie.statut, "PUBLIE");
    assert.equal(statutDoc(a, modification.id), "A_JOUR");
  });

  it("un contrôle technique requis doit être attesté avant publication", () => {
    const a = adaptateurTest();
    a.qualifierImpact("demo-mod-4", "MISE_A_JOUR_REQUISE", { ...AUTEURS.rm, exigences: { controleTechnique: true, justificatifs: [] } });
    const tr = a.creerTraitement({ documentId: "demo-doc-2", indiceCible: "B", modificationIds: ["demo-mod-4"] }, AUTEURS.rm);
    amenerEnControleBim(a, tr.id);
    valider(a, tr.id, "BIM", "REFERENT_BIM");
    valider(a, tr.id, "FINALE", "RESPONSABLE_MAINTENANCE");
    a.avancerTraitement(tr.id, "AUTORISE", AUTEURS.rm);
    assert.throws(() => a.avancerTraitement(tr.id, "PUBLIE", AUTEURS.rm), /contrôle technique requis/);
    assert.throws(() => valider(a, "demo-mod-4", "TECHNIQUE", "REFERENT_BIM"), GARDE);
    valider(a, "demo-mod-4", "TECHNIQUE", "RESPONSABLE_TECHNIQUE");
    assert.equal(a.avancerTraitement(tr.id, "PUBLIE", AUTEURS.rm).statut, "PUBLIE");
  });
});

describe("§ 8.7 — document non identifié", () => {
  it("affiche DOCUMENT_NON_IDENTIFIE sans créer de dossier d'anomalie", () => {
    const a = adaptateurTest();
    a.qualifierImpact("demo-mod-3", "MISE_A_JOUR_REQUISE", AUTEURS.cdp);
    const avant = a.instantane();
    assert.equal(statutDoc(a, "demo-mod-3"), "DOCUMENT_NON_IDENTIFIE");
    assert.equal(calculerCompteurs(a.instantane()).parStatutDocumentaire.DOCUMENT_NON_IDENTIFIE, 1);
    assert.deepEqual(Object.keys(a.instantane()), [...COLLECTIONS]);
    for (const collection of COLLECTIONS.filter((c) => c !== "evenements")) {
      assert.equal(a.instantane()[collection].length, avant[collection].length);
    }
  });
});

describe("§ 8.8 — refus du contrôle BIM ou de l'autorisation finale", () => {
  it("aucune autorisation ni publication ; décision et motif visibles ; rejet tracé", () => {
    const a = adaptateurTest();
    realiser(a, "demo-mod-1");
    realiser(a, "demo-mod-2");
    amenerEnControleBim(a, "demo-tr-1");
    valider(a, "demo-tr-1", "BIM", "REFERENT_BIM", "REFUSEE", "Nomenclature fictive incorrecte");
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET");
    assert.throws(() => a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp), /contrôle BIM a été refusé/);

    const refus = a.lister("validations").find((v) => v.decision === "REFUSEE");
    assert.equal(refus.commentaire, "Nomenclature fictive incorrecte");

    a.rejeterTraitement("demo-tr-1", { ...AUTEURS.bim, motif: "Reprendre la nomenclature" });
    assert.equal(a.lire("traitements", "demo-tr-1").statut, "EN_COURS");
    const rejet = a.historique("TRAITEMENT", "demo-tr-1").find((e) => e.action === "REJET");
    assert.equal(rejet.raison, "Reprendre la nomenclature");

    // Après nouvelle soumission, les décisions antérieures ne comptent plus.
    a.avancerTraitement("demo-tr-1", "SOUMIS_A_CONTROLE", AUTEURS.bim);
    a.avancerTraitement("demo-tr-1", "CONTROLE_BIM", AUTEURS.bim);
    valider(a, "demo-tr-1", "BIM", "REFERENT_BIM");
    assert.throws(() => a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp), /autorisation finale CHANTIER manquante/);
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET", "REFUSEE", "Attendre la réception");
    assert.throws(() => a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp), /autorisation finale CHANTIER refusée/);
    assert.equal(a.lire("traitements", "demo-tr-1").statut, "CONTROLE_BIM");
  });

  it("la présence d'un fichier ne suffit pas à publier", () => {
    const a = adaptateurTest();
    a.ajouterJustificatif(
      { cibleType: "TRAITEMENT", cibleId: "demo-tr-1", categorie: "AS_BUILT", libelle: "Fichier fictif" },
      AUTEURS.agent,
    );
    assert.throws(() => a.avancerTraitement("demo-tr-1", "PUBLIE", AUTEURS.cdp), avecCode(CODES_ERREUR.TRANSITION_INTERDITE));
  });

  it("les validations BIM / finales ne sont admises qu'au contrôle BIM", () => {
    const a = adaptateurTest();
    assert.throws(() => valider(a, "demo-tr-1", "BIM", "REFERENT_BIM"), GARDE);
  });
});

describe("§ 8.9 — révision commune à une maintenance et à un chantier", () => {
  it("exige une autorisation finale distincte par origine", () => {
    const a = adaptateurTest();
    realiser(a, "demo-mod-1");
    realiser(a, "demo-mod-2");
    a.qualifierImpact("demo-mod-4", "MISE_A_JOUR_REQUISE", AUTEURS.rm);
    a.associerTraitement("demo-mod-4", "demo-tr-1", AUTEURS.rm);
    amenerEnControleBim(a, "demo-tr-1");
    valider(a, "demo-tr-1", "BIM", "REFERENT_BIM");
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET");
    assert.throws(() => a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp), /autorisation finale MAINTENANCE manquante/);
    assert.throws(() => valider(a, "demo-tr-1", "FINALE", "RESPONSABLE_TECHNIQUE"), GARDE);
    valider(a, "demo-tr-1", "FINALE", "RESPONSABLE_MAINTENANCE");
    a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp);
    assert.equal(statutDoc(a, "demo-mod-1"), "EN_VALIDATION");
    a.avancerTraitement("demo-tr-1", "PUBLIE", AUTEURS.cdp);
    for (const id of ["demo-mod-1", "demo-mod-2", "demo-mod-4"]) assert.equal(statutDoc(a, id), "A_JOUR");
    assert.equal(a.historique("TRAITEMENT", "demo-tr-1").filter((e) => e.action === "PUBLICATION").length, 1);
  });

  it("une modification non réalisée bloque la publication", () => {
    const a = adaptateurTest();
    realiser(a, "demo-mod-1");
    amenerEnControleBim(a, "demo-tr-1");
    valider(a, "demo-tr-1", "BIM", "REFERENT_BIM");
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET");
    a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp);
    assert.throws(() => a.avancerTraitement("demo-tr-1", "PUBLIE", AUTEURS.cdp), /MOD-2026-0002 : travaux non réalisés/);
  });
});

describe("§ 8.10 — double clic et enregistrement partiel", () => {
  it("deux clics avec la même clé : une seule opération et une seule modification", () => {
    const a = adaptateurTest();
    const avant = { op: a.lister("operations").length, mod: a.lister("modifications").length };
    const options = { ...AUTEURS.agent, cleIdempotence: "formulaire-42" };
    const premier = a.declarerMaintenance(saisieMaintenance(), options);
    const second = a.declarerMaintenance(saisieMaintenance(), options);
    assert.equal(second, premier);
    assert.equal(a.lister("operations").length, avant.op + 1);
    assert.equal(a.lister("modifications").length, avant.mod + 1);
    assert.equal(premier.modification.operationId, premier.operation.id);
  });

  it("une clé réutilisée pour une autre saisie est refusée", () => {
    const a = adaptateurTest();
    a.declarerMaintenance(saisieMaintenance(), { ...AUTEURS.agent, cleIdempotence: "k" });
    assert.throws(
      () => a.declarerMaintenance(saisieMaintenance({ operation: { titre: "Autre" } }), { ...AUTEURS.agent, cleIdempotence: "k" }),
      avecCode(CODES_ERREUR.DOUBLON),
    );
  });

  it("aucune opération vide n'est créée si la modification est invalide", () => {
    const a = adaptateurTest();
    const avant = a.instantane();
    const cas = [
      saisieMaintenance({ modification: { titre: "  " } }),
      saisieMaintenance({ localisations: [] }),
      saisieMaintenance({ localisations: [{ localisationId: "inexistante", modeIdentification: "RECHERCHE" }] }),
      saisieMaintenance({ justificatifs: [{ categorie: "VIDEO", libelle: "x" }] }),
      saisieMaintenance({ operation: { titre: "" } }),
    ];
    for (const [i, saisie] of cas.entries()) {
      assert.throws(() => a.declarerMaintenance(saisie, { ...AUTEURS.agent, cleIdempotence: `cas-${i}` }));
    }
    assert.deepEqual(a.instantane(), avant);
    // Les clés des tentatives échouées restent utilisables pour une saisie corrigée.
    assert.doesNotThrow(() => a.declarerMaintenance(saisieMaintenance(), { ...AUTEURS.agent, cleIdempotence: "cas-0" }));
  });

  it("sans clé d'idempotence, la déclaration est refusée", () => {
    const a = adaptateurTest();
    assert.throws(() => a.declarerMaintenance(saisieMaintenance(), AUTEURS.agent), avecCode(CODES_ERREUR.VALIDATION));
  });

  it("le rattachement à une opération existante ne crée pas d'opération", () => {
    const a = adaptateurTest();
    const nb = a.lister("operations").length;
    const { operation } = a.declarerMaintenance(saisieMaintenance({ operationId: "demo-op-2" }), {
      ...AUTEURS.agent,
      cleIdempotence: "r",
    });
    assert.equal(operation.id, "demo-op-2");
    assert.equal(a.lister("operations").length, nb);
    assert.throws(
      () => a.declarerMaintenance(saisieMaintenance({ operationId: "demo-op-1" }), { ...AUTEURS.agent, cleIdempotence: "s" }),
      avecCode(CODES_ERREUR.RELATION_INVALIDE),
    );
  });
});

describe("§ 8.11 — compteurs sans multiplication par les associations", () => {
  it("compte des modifications distinctes malgré plusieurs locaux et documents", () => {
    const a = adaptateurTest();
    a.creerTraitement({ documentId: "demo-doc-2", modificationIds: ["demo-mod-2"] }, AUTEURS.cdp);
    const compteurs = calculerCompteurs(a.instantane());
    assert.equal(compteurs.total, 4);
    assert.equal(Object.values(compteurs.parStatutDocumentaire).reduce((s, n) => s + n, 0), 4);
    assert.equal(Object.values(compteurs.parStatutPhysique).reduce((s, n) => s + n, 0), 4);
    assert.equal(compteurs.parSite["SITE-DEMO"], 3);
    assert.equal(calculerCompteurs(a.instantane(), { site: "SITE-DEMO-B" }).total, 1);
    assert.equal(calculerCompteurs(a.instantane(), { origine: "CHANTIER" }).total, 3);
  });
});

describe("§ 8.12 — données strictement fictives", () => {
  it("toutes les URI des fixtures sont sur des domaines réservés et tous les identifiants sont repérables", () => {
    const fixtures = creerFixturesDemo();
    const texte = JSON.stringify(fixtures) + JSON.stringify(ACTEURS_DEMO);
    for (const uri of texte.match(/[a-z][a-z0-9+.-]*:\/\/[^"\s]+/gi) ?? []) {
      assert.ok(estUriFictive(uri), `URI non fictive : ${uri}`);
    }
    for (const collection of Object.values(fixtures)) {
      for (const enregistrement of collection) {
        for (const [champ, valeur] of Object.entries(enregistrement)) {
          if (champ === "id" || champ.endsWith("Id")) assert.match(valeur, /^demo-/);
        }
      }
    }
  });
});

describe("adaptateur en mémoire", () => {
  it("historique non destructif : la déclaration initiale reste consultable après correction", () => {
    const a = adaptateurTest();
    const { modification } = a.declarerMaintenance(saisieMaintenance(), { ...AUTEURS.agent, cleIdempotence: "h" });
    assert.throws(() => a.corrigerModification(modification.id, { titre: "Corrigé" }, AUTEURS.rm), avecCode(CODES_ERREUR.VALIDATION));
    assert.throws(
      () => a.corrigerModification(modification.id, { statutPhysique: "PLANIFIEE" }, { ...AUTEURS.rm, raison: "x" }),
      avecCode(CODES_ERREUR.VALIDATION),
    );
    a.corrigerModification(modification.id, { titre: "Prise fictive double" }, { ...AUTEURS.rm, raison: "Précision" });
    const historique = a.historique("MODIFICATION", modification.id);
    assert.equal(historique[0].action, "CREATION");
    assert.equal(historique[0].apres.titre, "Prise fictive ajoutée");
    const correction = historique.find((e) => e.action === "CORRECTION");
    assert.equal(correction.avant.titre, "Prise fictive ajoutée");
    assert.equal(correction.apres.titre, "Prise fictive double");
    assert.equal(a.lire("modifications", modification.id).titre, "Prise fictive double");
  });

  it("les données exposées sont figées (aucune modification hors API)", () => {
    const a = adaptateurTest();
    assert.throws(() => a.lister("evenements").push({}), TypeError);
    assert.throws(() => {
      a.lire("modifications", "demo-mod-1").titre = "piraté";
    }, TypeError);
  });

  it("est réinitialisable et chaque instance est indépendante", () => {
    const a = adaptateurTest();
    const b = adaptateurTest();
    const initial = a.instantane();
    a.declarerMaintenance(saisieMaintenance(), { ...AUTEURS.agent, cleIdempotence: "z" });
    assert.notDeepEqual(a.instantane(), initial);
    assert.deepEqual(b.instantane(), initial);
    a.reinitialiser();
    assert.deepEqual(a.instantane(), initial);
  });

  it("réserve des références lisibles sans réutiliser celles des fixtures", () => {
    const a = adaptateurTest();
    const op = a.creerOperation({ origine: "CHANTIER", titre: "Nouveau" }, AUTEURS.cdp);
    const mod = a.ajouterModification(op.id, { titre: "Nouvelle" }, AUTEURS.cdp);
    assert.equal(op.reference, "OP-2026-0003");
    assert.equal(mod.reference, "MOD-2026-0005");
    assert.notEqual(op.id, op.reference);
  });

  it("une modification de chantier ne peut pas être créée directement réalisée", () => {
    const a = adaptateurTest();
    assert.throws(
      () => a.ajouterModification("demo-op-1", { titre: "x", statutPhysique: "REALISEE" }, AUTEURS.cdp),
      avecCode(CODES_ERREUR.TRANSITION_INTERDITE),
    );
  });

  it("une modification validée doit comporter au moins une localisation", () => {
    const a = adaptateurTest();
    const mod = a.ajouterModification("demo-op-2", { titre: "Sans lieu", statutPhysique: "REALISEE" }, AUTEURS.agent);
    a.qualifierImpact(mod.id, "SANS_IMPACT", { ...AUTEURS.rm, justification: "À l'identique" });
    assert.throws(() => valider(a, mod.id, "SANS_IMPACT", "RESPONSABLE_MAINTENANCE"), /au moins une localisation/);
  });

  it("refuse les actions sans auteur, sur entité inconnue ou avec des fixtures incohérentes", () => {
    const a = adaptateurTest();
    assert.throws(() => a.creerOperation({ origine: "CHANTIER", titre: "x" }), avecCode(CODES_ERREUR.VALIDATION));
    assert.throws(() => a.lire("modifications", "absent"), avecCode(CODES_ERREUR.INTROUVABLE));
    assert.throws(() => a.lister("anomalies"), avecCode(CODES_ERREUR.VALIDATION));
    assert.throws(
      () => adaptateurTest({ fixtures: () => ({ ...creerFixturesDemo(), liensTraitement: [{ modificationId: "demo-mod-1", traitementId: "x" }] }) }),
      avecCode(CODES_ERREUR.INTROUVABLE),
    );
    assert.throws(
      () => adaptateurTest({ fixtures: () => ({ ...creerFixturesDemo(), documents: [] }) }),
      avecCode(CODES_ERREUR.INTROUVABLE),
    );
  });

  it("refuse un document dont la référence stable existe déjà", () => {
    const a = adaptateurTest();
    assert.throws(
      () => a.creerDocument({ referenceStable: "DEMO-A-MAQUETTE", type: "RVT", origine: "MANUEL" }, AUTEURS.cdp),
      avecCode(CODES_ERREUR.DOUBLON),
    );
  });
});

describe("indicateur de délai (§ 7)", () => {
  it("non calculable tant que la publication n'existe pas ; jamais de zéro inventé", () => {
    const a = adaptateurTest();
    assert.equal(calculerDelaiMiseAJour(a.instantane(), "demo-mod-4"), null);
    assert.equal(calculerDelaiMiseAJour(a.instantane(), "demo-mod-1"), null);
    realiser(a, "demo-mod-1");
    realiser(a, "demo-mod-2");
    amenerEnControleBim(a, "demo-tr-1");
    valider(a, "demo-tr-1", "BIM", "REFERENT_BIM");
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET");
    a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp);
    a.avancerTraitement("demo-tr-1", "PUBLIE", AUTEURS.cdp);
    const delai = calculerDelaiMiseAJour(a.instantane(), "demo-mod-1");
    assert.ok(delai > 0);
  });
});

describe("retours de revue Codex (PR #7)", () => {
  it("le périmètre d'un traitement est figé dès sa soumission", () => {
    const a = adaptateurTest();
    a.qualifierImpact("demo-mod-3", "MISE_A_JOUR_REQUISE", AUTEURS.cdp);
    amenerEnControleBim(a, "demo-tr-1");
    assert.throws(() => a.associerTraitement("demo-mod-3", "demo-tr-1", AUTEURS.cdp), avecCode(CODES_ERREUR.TRANSITION_INTERDITE));
    // Après rejet, le traitement redevient modifiable ; la nouvelle soumission exige de nouvelles validations.
    a.rejeterTraitement("demo-tr-1", { ...AUTEURS.bim, motif: "Ajouter MOD-2026-0003" });
    assert.doesNotThrow(() => a.associerTraitement("demo-mod-3", "demo-tr-1", AUTEURS.cdp));
  });

  it("l'indice cible peut être renseigné après création, avant soumission uniquement", () => {
    const a = adaptateurTest();
    a.qualifierImpact("demo-mod-4", "MISE_A_JOUR_REQUISE", AUTEURS.rm);
    const tr = a.creerTraitement({ documentId: "demo-doc-2", modificationIds: ["demo-mod-4"] }, AUTEURS.rm);
    assert.throws(() => a.preparerTraitement(tr.id, { statut: "PUBLIE" }, AUTEURS.rm), avecCode(CODES_ERREUR.VALIDATION));
    const prepare = a.preparerTraitement(tr.id, { indiceCible: "A" }, { ...AUTEURS.rm, raison: "Indice connu" });
    assert.equal(prepare.indiceCible, "A");
    const evenement = a.historique("TRAITEMENT", tr.id).find((e) => e.action === "PREPARATION");
    assert.equal(evenement.avant.indiceCible, undefined);
    assert.equal(evenement.apres.indiceCible, "A");
    amenerEnControleBim(a, tr.id);
    assert.throws(() => a.preparerTraitement(tr.id, { indiceCible: "B" }, AUTEURS.rm), avecCode(CODES_ERREUR.TRANSITION_INTERDITE));
    valider(a, tr.id, "BIM", "REFERENT_BIM");
    valider(a, tr.id, "FINALE", "RESPONSABLE_MAINTENANCE");
    a.avancerTraitement(tr.id, "AUTORISE", AUTEURS.rm);
    assert.equal(a.avancerTraitement(tr.id, "PUBLIE", AUTEURS.rm).statut, "PUBLIE");
  });

  it("avec une horloge constante, une nouvelle soumission exige de nouvelles validations", () => {
    const a = adaptateurTest({ horloge: () => "2026-11-01T08:00:00Z" });
    realiser(a, "demo-mod-1");
    realiser(a, "demo-mod-2");
    amenerEnControleBim(a, "demo-tr-1");
    valider(a, "demo-tr-1", "BIM", "REFERENT_BIM");
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET");
    a.rejeterTraitement("demo-tr-1", { ...AUTEURS.bim, motif: "Reprise" });
    a.avancerTraitement("demo-tr-1", "SOUMIS_A_CONTROLE", AUTEURS.bim);
    a.avancerTraitement("demo-tr-1", "CONTROLE_BIM", AUTEURS.bim);
    assert.throws(() => a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp), /contrôle BIM non réalisé/);
    valider(a, "demo-tr-1", "BIM", "REFERENT_BIM");
    assert.throws(() => a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp), /autorisation finale CHANTIER manquante/);
    // À horodatage égal, c'est l'ordre d'enregistrement qui départage les décisions.
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET", "REFUSEE", "Attendre");
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET");
    assert.equal(a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp).statut, "AUTORISE");
  });

  it("avec une horloge constante, une décision SANS_IMPACT révisée exige une nouvelle validation", () => {
    const a = adaptateurTest({ horloge: () => "2026-11-01T08:00:00Z" });
    a.qualifierImpact("demo-mod-4", "SANS_IMPACT", { ...AUTEURS.agent, justification: "À l'identique" });
    valider(a, "demo-mod-4", "SANS_IMPACT", "RESPONSABLE_MAINTENANCE");
    assert.equal(statutDoc(a, "demo-mod-4"), "SANS_IMPACT_VALIDE");
    a.qualifierImpact("demo-mod-4", "MISE_A_JOUR_REQUISE", AUTEURS.rm);
    a.qualifierImpact("demo-mod-4", "SANS_IMPACT", { ...AUTEURS.rm, justification: "Finalement identique" });
    assert.equal(statutDoc(a, "demo-mod-4"), "SANS_IMPACT_EN_ATTENTE");
  });
});

describe("revue complémentaire du propriétaire (PR #7)", () => {
  it("traitement élargi après autorisation : un seul traitement, aucune publication avec les validations périmées", () => {
    const a = adaptateurTest({ horloge: () => "2026-11-01T08:00:00Z" });
    realiser(a, "demo-mod-1");
    realiser(a, "demo-mod-2");
    amenerEnControleBim(a, "demo-tr-1");
    valider(a, "demo-tr-1", "BIM", "REFERENT_BIM");
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET");
    a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp);

    // Élargissement interdit tant que le traitement est autorisé…
    a.qualifierImpact("demo-mod-3", "MISE_A_JOUR_REQUISE", AUTEURS.cdp);
    assert.throws(() => a.associerTraitement("demo-mod-3", "demo-tr-1", AUTEURS.cdp), avecCode(CODES_ERREUR.TRANSITION_INTERDITE));

    // … et possible seulement via un nouveau cycle (rejet → préparation → nouvelle soumission).
    a.rejeterTraitement("demo-tr-1", { ...AUTEURS.cdp, motif: "Ajout de MOD-2026-0003" });
    a.associerTraitement("demo-mod-3", "demo-tr-1", AUTEURS.cdp);
    realiser(a, "demo-mod-3");
    a.avancerTraitement("demo-tr-1", "SOUMIS_A_CONTROLE", AUTEURS.bim);
    a.avancerTraitement("demo-tr-1", "CONTROLE_BIM", AUTEURS.bim);
    assert.throws(() => a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp), GARDE);
    assert.throws(() => a.avancerTraitement("demo-tr-1", "PUBLIE", AUTEURS.cdp), avecCode(CODES_ERREUR.TRANSITION_INTERDITE));
    const problemes = problemesPublication(a.instantane(), "demo-tr-1");
    assert.ok(problemes.includes("contrôle BIM non réalisé"));
    assert.ok(problemes.includes("autorisation finale CHANTIER manquante (CHEF_PROJET)"));
    assert.equal(statutDoc(a, "demo-mod-3"), "EN_CONTROLE");

    // Une seule révision documentaire couvre désormais les trois modifications.
    assert.equal(a.lister("traitements").filter((t) => t.documentId === "demo-doc-1").length, 1);
    assert.equal(a.lister("liensTraitement").filter((l) => l.traitementId === "demo-tr-1").length, 3);

    valider(a, "demo-tr-1", "BIM", "REFERENT_BIM");
    valider(a, "demo-tr-1", "FINALE", "CHEF_PROJET");
    a.avancerTraitement("demo-tr-1", "AUTORISE", AUTEURS.cdp);
    a.avancerTraitement("demo-tr-1", "PUBLIE", AUTEURS.cdp);
    for (const id of ["demo-mod-1", "demo-mod-2", "demo-mod-3"]) assert.equal(statutDoc(a, id), "A_JOUR");
    // L'historique conserve les deux cycles.
    assert.equal(a.lister("validations").filter((v) => v.cibleId === "demo-tr-1").length, 4);
  });

  it("le contrôle BIM relève d'un rôle déclaré distinct (déclaratif, pas une authentification)", () => {
    const a = adaptateurTest();
    amenerEnControleBim(a, "demo-tr-1");
    for (const role of ["CHEF_PROJET", "RESPONSABLE_MAINTENANCE", "RESPONSABLE_TECHNIQUE"]) {
      assert.throws(() => valider(a, "demo-tr-1", "BIM", role), /contrôle BIM relève du REFERENT_BIM/);
    }
    assert.doesNotThrow(() => valider(a, "demo-tr-1", "BIM", "REFERENT_BIM"));
    // Le référent BIM ne peut pas non plus donner l'autorisation finale.
    assert.throws(() => valider(a, "demo-tr-1", "FINALE", "REFERENT_BIM"), GARDE);
  });
});
