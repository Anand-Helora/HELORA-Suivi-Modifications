import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CODES_ERREUR,
  estDateIso,
  estUriFictive,
  validerDocument,
  validerJustificatif,
  validerLocalisation,
  validerModification,
  validerModificationLocalisation,
  validerModificationTraitement,
  validerOperation,
  validerTraitement,
  validerValidation,
  validerEvenement,
} from "../src/domaine/index.js";
import { avecCode } from "./aide-domaine.js";

const VALIDATION = avecCode(CODES_ERREUR.VALIDATION);

const operation = (s = {}) => ({
  id: "o1",
  reference: "OP-2026-0001",
  origine: "CHANTIER",
  titre: "Opération fictive",
  dateCreation: "2026-11-01T08:00:00Z",
  ...s,
});

const modification = (s = {}) => ({
  id: "m1",
  operationId: "o1",
  reference: "MOD-2026-0001",
  titre: "Modification fictive",
  declareParId: "a1",
  dateDeclaration: "2026-11-01T08:00:00+01:00",
  statutPhysique: "PLANIFIEE",
  impactDocumentaire: "A_QUALIFIER",
  ...s,
});

describe("contrôles élémentaires", () => {
  it("exige des dates ISO 8601 avec fuseau", () => {
    assert.equal(estDateIso("2026-11-01T08:00:00Z"), true);
    assert.equal(estDateIso("2026-11-01T08:00:00+01:00"), true);
    assert.equal(estDateIso("2026-11-01T08:00:00"), false);
    assert.equal(estDateIso("2026-11-01"), false);
    assert.equal(estDateIso("2026-13-45T08:00:00Z"), false);
  });

  it("n'accepte que des URI de démonstration sur domaine réservé", () => {
    assert.equal(estUriFictive("https://gmao.demo.invalid/ot/1"), true);
    assert.equal(estUriFictive("https://example.com/x"), true);
    assert.equal(estUriFictive("https://intranet.entreprise.be/x"), false);
    assert.equal(estUriFictive("file:///C:/plans/a.dwg"), false);
    assert.equal(estUriFictive("https://user:pw@demo.invalid/"), false);
    assert.equal(estUriFictive("pas une uri"), false);
  });
});

describe("Operation", () => {
  it("accepte une opération minimale et ne conserve que les champs connus", () => {
    const resultat = validerOperation(operation({ inconnu: "x" }));
    assert.equal(resultat.reference, "OP-2026-0001");
    assert.equal("inconnu" in resultat, false);
    assert.ok(Object.isFrozen(resultat));
  });

  it("signale tous les problèmes en une fois", () => {
    try {
      validerOperation({ origine: "AUTRE" });
      assert.fail("une erreur était attendue");
    } catch (erreur) {
      assert.equal(erreur.code, CODES_ERREUR.VALIDATION);
      assert.ok(erreur.details.length >= 4);
    }
  });

  it("GMAO facultative, mais un numéro d'OT exige son système", () => {
    assert.doesNotThrow(() => validerOperation(operation()));
    assert.throws(() => validerOperation(operation({ gmaoNumeroOT: "OT-1" })), VALIDATION);
    assert.doesNotThrow(() => validerOperation(operation({ gmaoSysteme: "GMAO-DEMO", gmaoNumeroOT: "OT-1" })));
  });

  it("refuse une URL GMAO interne", () => {
    assert.throws(
      () => validerOperation(operation({ gmaoSysteme: "G", gmaoNumeroOT: "1", gmaoUrl: "https://gmao.interne.local/1" })),
      VALIDATION,
    );
  });

  it("distingue la référence lisible de l'identifiant", () => {
    assert.throws(() => validerOperation(operation({ id: "OP-1", reference: "OP-1" })), VALIDATION);
  });

  it("rejette une entrée qui n'est pas un objet", () => {
    assert.throws(() => validerOperation(null), VALIDATION);
    assert.throws(() => validerOperation([]), VALIDATION);
  });
});

describe("Modification", () => {
  it("garde statut physique et impact documentaire dans deux champs distincts", () => {
    assert.throws(() => validerModification(modification({ statutPhysique: "A_JOUR" })), VALIDATION);
    assert.throws(() => validerModification(modification({ impactDocumentaire: "REALISEE" })), VALIDATION);
  });

  it("SANS_IMPACT exige une justification", () => {
    assert.throws(() => validerModification(modification({ impactDocumentaire: "SANS_IMPACT" })), VALIDATION);
    assert.doesNotThrow(() =>
      validerModification(modification({ impactDocumentaire: "SANS_IMPACT", justificationSansImpact: "Remplacement à l'identique" })),
    );
  });

  it("valide les exigences et dédoublonne les catégories", () => {
    const m = validerModification(modification({ exigences: { controleTechnique: true, justificatifs: ["PHOTO", "PHOTO"] } }));
    assert.deepEqual([...m.exigences.justificatifs], ["PHOTO"]);
    assert.throws(() => validerModification(modification({ exigences: { controleTechnique: "oui", justificatifs: [] } })), VALIDATION);
    assert.throws(() => validerModification(modification({ exigences: { controleTechnique: false, justificatifs: ["VIDEO"] } })), VALIDATION);
  });
});

describe("Localisation et liens", () => {
  it("un LOCAL exige un code ou une référence HEL-ISE ; une ZONE une description", () => {
    assert.doesNotThrow(() => validerLocalisation({ id: "l1", type: "LOCAL", site: "SITE-DEMO", referenceHelIse: "DEMO/A/N00/001" }));
    assert.throws(() => validerLocalisation({ id: "l1", type: "LOCAL", site: "SITE-DEMO" }), VALIDATION);
    assert.throws(() => validerLocalisation({ id: "l2", type: "ZONE", site: "SITE-DEMO" }), VALIDATION);
    assert.doesNotThrow(() => validerLocalisation({ id: "l2", type: "ZONE", site: "SITE-DEMO", descriptionZone: "Gaine" }));
  });

  it("contrôle le mode d'identification (QR simulé uniquement)", () => {
    assert.throws(
      () => validerModificationLocalisation({ modificationId: "m", localisationId: "l", modeIdentification: "QR_CAMERA" }),
      VALIDATION,
    );
    assert.throws(() => validerModificationTraitement({ modificationId: "m" }), VALIDATION);
  });
});

describe("Document, traitement, justificatif, validation, événement", () => {
  it("document : référence stable et type obligatoires, URI fictive", () => {
    assert.doesNotThrow(() => validerDocument({ id: "d", referenceStable: "DEMO-1", type: "PDF", origine: "MANUEL" }));
    assert.throws(() => validerDocument({ id: "d", type: "PDF", origine: "MANUEL" }), VALIDATION);
    assert.throws(
      () => validerDocument({ id: "d", referenceStable: "R", type: "PDF", origine: "MANUEL", uriExterne: "https://sharepoint.interne/x" }),
      VALIDATION,
    );
  });

  it("traitement : datePublication réservée au statut PUBLIE", () => {
    const base = { id: "t", documentId: "d", statut: "AUTORISE", dateDemande: "2026-11-01T08:00:00Z" };
    assert.throws(() => validerTraitement({ ...base, datePublication: "2026-11-02T08:00:00Z" }), VALIDATION);
    assert.throws(() => validerTraitement({ ...base, statut: "PUBLIE" }), VALIDATION);
  });

  it("justificatif : simple référence de démonstration, jamais une URI de fichier", () => {
    const base = {
      id: "j", cibleType: "MODIFICATION", cibleId: "m", categorie: "PHOTO", libelle: "Photo",
      deposeParId: "a", dateDepot: "2026-11-01T08:00:00Z",
    };
    assert.doesNotThrow(() => validerJustificatif({ ...base, referenceFichierDemo: "photo-demo.jpg" }));
    assert.throws(() => validerJustificatif({ ...base, referenceFichierDemo: "file:///C:/photo.jpg" }), VALIDATION);
  });

  it("validation : nature cohérente avec la cible, refus motivé", () => {
    const base = {
      id: "v", cibleType: "TRAITEMENT", cibleId: "t", nature: "BIM", decision: "APPROUVEE",
      auteurId: "a", roleAuMoment: "X", date: "2026-11-01T08:00:00Z",
    };
    assert.doesNotThrow(() => validerValidation(base));
    assert.throws(() => validerValidation({ ...base, cibleType: "MODIFICATION" }), VALIDATION);
    assert.throws(() => validerValidation({ ...base, decision: "REFUSEE" }), VALIDATION);
    assert.doesNotThrow(() => validerValidation({ ...base, decision: "REFUSEE", commentaire: "Indice incohérent" }));
  });

  it("événement : horodatage avec fuseau obligatoire", () => {
    const base = { id: "e", entiteType: "MODIFICATION", entiteId: "m", action: "CREATION", auteurId: "a" };
    assert.throws(() => validerEvenement({ ...base, horodatage: "2026-11-01 08:00" }), VALIDATION);
    assert.doesNotThrow(() => validerEvenement({ ...base, horodatage: "2026-11-01T08:00:00Z" }));
  });
});
