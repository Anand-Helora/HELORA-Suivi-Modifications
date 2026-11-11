/**
 * Adaptateur de données de démonstration — exclusivement en mémoire.
 *
 * - Aucune persistance (ni fichier, ni localStorage, ni réseau) : les données
 *   disparaissent avec l'instance et `reinitialiser()` restaure les fixtures.
 * - Chaque écriture est atomique : toutes les validations sont effectuées sur
 *   un brouillon de l'état, qui n'est appliqué que si rien n'a échoué.
 * - Chaque écriture ajoute un événement d'historique (ajout seul).
 * - Les identifiants d'acteur et les rôles transmis sont déclaratifs : ils ne
 *   constituent PAS une authentification ni un contrôle d'accès réel.
 *
 * Cette interface isole les accès données, pour un futur adaptateur
 * SharePoint/API après arbitrage de sécurité et d'architecture.
 */

import { CIBLE_PAR_NATURE, ROLE_PAR_NATURE, ROLE_RESPONSABLE_PAR_ORIGINE } from "../domaine/constantes.js";
import { CODES_ERREUR, ErreurDomaine } from "../domaine/erreurs.js";
import {
  exigerAutorisationPossible,
  exigerPublicationPossible,
  localisationsDeModification,
  modificationsDeTraitement,
} from "../domaine/statuts.js";
import {
  STATUT_APRES_REJET,
  verifierRejetTraitement,
  verifierStatutPhysiqueInitial,
  verifierTransitionImpact,
  verifierTransitionPhysique,
  verifierTransitionTraitement,
} from "../domaine/transitions.js";
import {
  estChaineNonVide,
  estDateIso,
  validerDocument,
  validerEvenement,
  validerJustificatif,
  validerLocalisation,
  validerModification,
  validerModificationLocalisation,
  validerModificationTraitement,
  validerOperation,
  validerTraitement,
  validerValidation,
} from "../domaine/validation.js";
import { creerFixturesDemo } from "./fixtures-demo.js";

/** Collections stockées : les 10 ensembles du modèle. */
export const COLLECTIONS = Object.freeze([
  "operations",
  "modifications",
  "localisations",
  "liensLocalisation",
  "documents",
  "traitements",
  "liensTraitement",
  "justificatifs",
  "validations",
  "evenements",
]);

const ENTITE_PAR_COLLECTION = Object.freeze({
  operations: "OPERATION",
  modifications: "MODIFICATION",
  localisations: "LOCALISATION",
  documents: "DOCUMENT",
  traitements: "TRAITEMENT",
  justificatifs: "JUSTIFICATIF",
  validations: "VALIDATION",
});

const COLLECTION_PAR_CIBLE = Object.freeze({
  OPERATION: "operations",
  MODIFICATION: "modifications",
  TRAITEMENT: "traitements",
});

/** Champs d'une modification corrigeables via `corrigerModification` (les statuts ont leurs propres actions). */
const CHAMPS_CORRIGEABLES = Object.freeze(["titre", "description", "disciplineCode", "dateExecution"]);

/**
 * Statuts où le périmètre et la préparation d'un traitement restent modifiables.
 * Après un rejet, le traitement revient à EN_COURS et redevient modifiable.
 */
const STATUTS_TRAITEMENT_MODIFIABLES = Object.freeze(["A_PREPARER", "EN_COURS"]);
const CHAMPS_PREPARATION = Object.freeze(["indiceDepart", "indiceCible", "assigneAId"]);

/** Format provisoire des références lisibles (point ouvert § 9) : PREFIXE-AAAA-NNNN. */
const PREFIXES_REFERENCE = Object.freeze({ operations: "OP", modifications: "MOD" });
const MOTIF_REFERENCE = /^([A-Z]+)-(\d{4})-(\d{4,})$/;

function erreur(code, message, details) {
  return new ErreurDomaine(code, message, details);
}

function exigerAuteur(auteurId) {
  if (!estChaineNonVide(auteurId)) {
    throw erreur(CODES_ERREUR.VALIDATION, "auteurId est obligatoire (identifiant de démonstration)");
  }
}

function texte(valeur) {
  return typeof valeur === "string" && valeur.trim() ? valeur.trim() : undefined;
}

function generateurIdParDefaut() {
  if (typeof globalThis.crypto?.randomUUID === "function") return () => globalThis.crypto.randomUUID();
  let n = 0;
  return () => `id-demo-${++n}`;
}

/**
 * Crée un adaptateur en mémoire.
 * @param {object} [options]
 * @param {() => object} [options.fixtures] - Fabrique du jeu initial (défaut : fixtures fictives).
 * @param {() => string} [options.horloge] - Date ISO 8601 courante (injectable pour les tests).
 * @param {() => string} [options.genererId] - Générateur d'identifiants opaques.
 */
export function creerAdaptateurMemoire({
  fixtures = creerFixturesDemo,
  horloge = () => new Date().toISOString(),
  genererId = generateurIdParDefaut(),
} = {}) {
  let etat;

  function etatInitial() {
    const source = fixtures();
    const nouvelEtat = { idempotence: new Map(), sequences: new Map() };
    for (const collection of COLLECTIONS) nouvelEtat[collection] = Object.freeze([...(source[collection] ?? [])]);
    verifierCoherence(nouvelEtat);
    for (const collection of Object.keys(PREFIXES_REFERENCE)) {
      for (const { reference } of nouvelEtat[collection]) reserverReference(nouvelEtat, reference);
    }
    return nouvelEtat;
  }

  /** Les fixtures passent par les mêmes validations que les saisies. */
  function verifierCoherence(e) {
    const valideurs = {
      operations: validerOperation,
      modifications: validerModification,
      localisations: validerLocalisation,
      liensLocalisation: validerModificationLocalisation,
      documents: validerDocument,
      traitements: validerTraitement,
      liensTraitement: validerModificationTraitement,
      justificatifs: validerJustificatif,
      validations: validerValidation,
      evenements: validerEvenement,
    };
    for (const collection of COLLECTIONS) {
      const ids = new Set();
      e[collection] = Object.freeze(
        e[collection].map((donnees) => {
          const enregistrement = valideurs[collection](donnees);
          if (enregistrement.id) {
            if (ids.has(enregistrement.id)) {
              throw erreur(CODES_ERREUR.DOUBLON, `Identifiant en double dans ${collection} : ${enregistrement.id}`);
            }
            ids.add(enregistrement.id);
          }
          return enregistrement;
        }),
      );
    }
    for (const m of e.modifications) exister(e, "operations", m.operationId, "Opération");
    for (const l of e.liensLocalisation) {
      exister(e, "modifications", l.modificationId, "Modification");
      exister(e, "localisations", l.localisationId, "Localisation");
    }
    for (const t of e.traitements) exister(e, "documents", t.documentId, "Document");
    for (const l of e.liensTraitement) {
      exister(e, "modifications", l.modificationId, "Modification");
      exister(e, "traitements", l.traitementId, "Traitement");
    }
    for (const j of [...e.justificatifs, ...e.validations]) {
      exister(e, COLLECTION_PAR_CIBLE[j.cibleType], j.cibleId, j.cibleType);
    }
    exigerPairesUniques(e.liensLocalisation, "localisationId", "modification-localisation");
    exigerPairesUniques(e.liensTraitement, "traitementId", "modification-traitement");
  }

  function exigerPairesUniques(liens, champ, libelle) {
    const vues = new Set();
    for (const lien of liens) {
      const cle = `${lien.modificationId}|${lien[champ]}`;
      if (vues.has(cle)) throw erreur(CODES_ERREUR.DOUBLON, `Association ${libelle} en double : ${cle}`);
      vues.add(cle);
    }
  }

  function reserverReference(e, reference) {
    const correspondance = MOTIF_REFERENCE.exec(reference ?? "");
    if (!correspondance) return;
    const cle = `${correspondance[1]}-${correspondance[2]}`;
    e.sequences.set(cle, Math.max(e.sequences.get(cle) ?? 0, Number(correspondance[3])));
  }

  function prochaineReference(e, collection, date) {
    const cle = `${PREFIXES_REFERENCE[collection]}-${date.slice(0, 4)}`;
    const suivant = (e.sequences.get(cle) ?? 0) + 1;
    e.sequences.set(cle, suivant);
    return `${cle}-${String(suivant).padStart(4, "0")}`;
  }

  function exister(e, collection, id, libelle) {
    const element = e[collection].find((x) => x.id === id);
    if (!element) throw erreur(CODES_ERREUR.INTROUVABLE, `${libelle} « ${id} » introuvable`);
    return element;
  }

  /**
   * Exécute `operation` sur un brouillon ; l'état n'est remplacé qu'en cas de
   * succès complet. Aucun enregistrement partiel n'est donc possible.
   */
  function transaction(operation) {
    const brouillon = {
      idempotence: new Map(etat.idempotence),
      sequences: new Map(etat.sequences),
    };
    for (const collection of COLLECTIONS) brouillon[collection] = [...etat[collection]];
    const outils = {
      e: brouillon,
      maintenant: horloge(),
      ajouter(collection, enregistrement) {
        brouillon[collection].push(enregistrement);
        return enregistrement;
      },
      remplacer(collection, enregistrement) {
        const index = brouillon[collection].findIndex((x) => x.id === enregistrement.id);
        brouillon[collection][index] = enregistrement;
        return enregistrement;
      },
      tracer(entiteType, entiteId, action, auteurId, { avant, apres, raison } = {}) {
        brouillon.evenements.push(
          validerEvenement({
            id: genererId(),
            entiteType,
            entiteId,
            action,
            auteurId,
            horodatage: outils.maintenant,
            avant,
            apres,
            raison,
          }),
        );
      },
    };
    if (!estDateIso(outils.maintenant)) {
      throw erreur(CODES_ERREUR.VALIDATION, "L'horloge doit fournir une date ISO 8601 avec fuseau");
    }
    const resultat = operation(outils);
    for (const collection of COLLECTIONS) brouillon[collection] = Object.freeze(brouillon[collection]);
    etat = brouillon;
    return resultat;
  }

  // -------------------------------------------------------------------------
  // Briques internes (s'exécutent dans une transaction)
  // -------------------------------------------------------------------------

  function construireOperation(t, saisie, auteurId) {
    const operation = validerOperation({
      id: genererId(),
      reference: prochaineReference(t.e, "operations", t.maintenant),
      origine: saisie.origine,
      titre: texte(saisie.titre),
      description: texte(saisie.description),
      dateCreation: t.maintenant,
      dateDebutPrevue: saisie.dateDebutPrevue,
      responsableId: saisie.responsableId,
      referenceProjet: texte(saisie.referenceProjet),
      gmaoSysteme: texte(saisie.gmaoSysteme),
      gmaoNumeroOT: texte(saisie.gmaoNumeroOT),
      gmaoUrl: saisie.gmaoUrl,
    });
    t.ajouter("operations", operation);
    t.tracer("OPERATION", operation.id, "CREATION", auteurId, { apres: operation });
    return operation;
  }

  function construireModification(t, operation, saisie, auteurId) {
    const statutPhysique = saisie.statutPhysique ?? "PLANIFIEE";
    verifierStatutPhysiqueInitial(operation.origine, statutPhysique);
    const modification = validerModification({
      id: genererId(),
      operationId: operation.id,
      reference: prochaineReference(t.e, "modifications", t.maintenant),
      titre: texte(saisie.titre),
      description: texte(saisie.description),
      disciplineCode: texte(saisie.disciplineCode),
      declareParId: auteurId,
      dateDeclaration: t.maintenant,
      dateExecution: saisie.dateExecution,
      statutPhysique,
      impactDocumentaire: "A_QUALIFIER",
    });
    t.ajouter("modifications", modification);
    t.tracer("MODIFICATION", modification.id, "CREATION", auteurId, { apres: modification });
    for (const lien of saisie.localisations ?? []) {
      lierLocalisation(t, modification.id, lien.localisationId, lien.modeIdentification, auteurId);
    }
    return modification;
  }

  function lierLocalisation(t, modificationId, localisationId, modeIdentification, auteurId) {
    exister(t.e, "modifications", modificationId, "Modification");
    exister(t.e, "localisations", localisationId, "Localisation");
    const lien = validerModificationLocalisation({ modificationId, localisationId, modeIdentification });
    if (t.e.liensLocalisation.some((l) => l.modificationId === modificationId && l.localisationId === localisationId)) {
      throw erreur(CODES_ERREUR.DOUBLON, "Cette localisation est déjà associée à la modification");
    }
    t.ajouter("liensLocalisation", lien);
    t.tracer("MODIFICATION", modificationId, "LOCALISATION_ASSOCIEE", auteurId, { apres: lien });
    return lien;
  }

  function lierTraitement(t, modificationId, traitementId, auteurId) {
    const modification = exister(t.e, "modifications", modificationId, "Modification");
    const traitement = exister(t.e, "traitements", traitementId, "Traitement");
    // Le périmètre d'un traitement est figé dès sa soumission : élargir un
    // traitement déjà contrôlé ou autorisé contournerait les validations.
    if (!STATUTS_TRAITEMENT_MODIFIABLES.includes(traitement.statut)) {
      throw erreur(
        CODES_ERREUR.TRANSITION_INTERDITE,
        `Le périmètre d'un traitement ${traitement.statut} est figé : seule une révision en préparation peut couvrir une nouvelle modification`,
      );
    }
    if (modification.impactDocumentaire !== "MISE_A_JOUR_REQUISE") {
      throw erreur(
        CODES_ERREUR.RELATION_INVALIDE,
        `${modification.reference} : seule une modification en MISE_A_JOUR_REQUISE peut être liée à un traitement`,
      );
    }
    if (t.e.liensTraitement.some((l) => l.modificationId === modificationId && l.traitementId === traitementId)) {
      throw erreur(CODES_ERREUR.DOUBLON, "Cette modification est déjà couverte par ce traitement");
    }
    const lien = validerModificationTraitement({ modificationId, traitementId });
    t.ajouter("liensTraitement", lien);
    t.tracer("TRAITEMENT", traitementId, "MODIFICATION_ASSOCIEE", auteurId, { apres: lien });
    return lien;
  }

  function construireJustificatif(t, saisie, auteurId) {
    const justificatif = validerJustificatif({
      id: genererId(),
      cibleType: saisie.cibleType,
      cibleId: saisie.cibleId,
      categorie: saisie.categorie,
      libelle: texte(saisie.libelle),
      referenceFichierDemo: texte(saisie.referenceFichierDemo),
      deposeParId: auteurId,
      dateDepot: t.maintenant,
    });
    exister(t.e, COLLECTION_PAR_CIBLE[justificatif.cibleType], justificatif.cibleId, justificatif.cibleType);
    t.ajouter("justificatifs", justificatif);
    t.tracer(saisie.cibleType, saisie.cibleId, "JUSTIFICATIF_AJOUTE", auteurId, { apres: justificatif });
    return justificatif;
  }

  // -------------------------------------------------------------------------
  // API publique
  // -------------------------------------------------------------------------

  const adaptateur = {
    /** Restaure le jeu de fixtures fictives (aucune persistance réelle). */
    reinitialiser() {
      etat = etatInitial();
    },

    /** Instantané figé des 10 collections, utilisable par les fonctions de `statuts.js`. */
    instantane() {
      return Object.freeze(Object.fromEntries(COLLECTIONS.map((c) => [c, etat[c]])));
    },

    lister(collection) {
      if (!COLLECTIONS.includes(collection)) throw erreur(CODES_ERREUR.VALIDATION, `Collection inconnue « ${collection} »`);
      return etat[collection];
    },

    lire(collection, id) {
      if (!ENTITE_PAR_COLLECTION[collection]) throw erreur(CODES_ERREUR.VALIDATION, `Collection inconnue « ${collection} »`);
      return exister(etat, collection, id, ENTITE_PAR_COLLECTION[collection]);
    },

    /** Historique (ajout seul) d'une entité, dans l'ordre chronologique d'enregistrement. */
    historique(entiteType, entiteId) {
      return Object.freeze(etat.evenements.filter((ev) => ev.entiteType === entiteType && ev.entiteId === entiteId));
    },

    /**
     * Déclaration rapide de maintenance, au clic de confirmation uniquement.
     * Crée atomiquement l'opération MAINTENANCE et sa première modification
     * (ou rattache la modification à `saisie.operationId`), ses localisations
     * et ses justificatifs. Une même `cleIdempotence` (une par ouverture de
     * formulaire) renvoie le premier résultat sans rien recréer : protection
     * contre le double clic.
     *
     * @param {object} saisie - { operationId?, operation?: {titre, description?, gmaoSysteme?, gmaoNumeroOT?, gmaoUrl?},
     *   modification: {titre, description?, disciplineCode?, dateExecution?, statutPhysique?},
     *   localisations: [{localisationId, modeIdentification}], justificatifs?: [{categorie, libelle, referenceFichierDemo?}] }
     * @param {{ auteurId: string, cleIdempotence: string }} options
     */
    declarerMaintenance(saisie, { auteurId, cleIdempotence } = {}) {
      exigerAuteur(auteurId);
      if (!estChaineNonVide(cleIdempotence)) {
        throw erreur(CODES_ERREUR.VALIDATION, "cleIdempotence est obligatoire (protection contre le double clic)");
      }
      const empreinte = JSON.stringify({ saisie, auteurId });
      const precedent = etat.idempotence.get(cleIdempotence);
      if (precedent) {
        if (precedent.empreinte !== empreinte) {
          throw erreur(CODES_ERREUR.DOUBLON, "Cette clé d'idempotence a déjà servi pour une autre saisie");
        }
        return precedent.resultat;
      }
      if (!saisie?.modification) throw erreur(CODES_ERREUR.VALIDATION, "La déclaration doit contenir une modification");
      if (!Array.isArray(saisie.localisations) || saisie.localisations.length === 0) {
        throw erreur(CODES_ERREUR.VALIDATION, "La déclaration exige au moins une localisation (local ou zone)");
      }
      return transaction((t) => {
        let operation;
        if (saisie.operationId) {
          operation = exister(t.e, "operations", saisie.operationId, "Opération");
          if (operation.origine !== "MAINTENANCE") {
            throw erreur(CODES_ERREUR.RELATION_INVALIDE, "Une déclaration de maintenance ne peut être rattachée qu'à une opération MAINTENANCE");
          }
        } else {
          operation = construireOperation(t, { ...saisie.operation, origine: "MAINTENANCE" }, auteurId);
        }
        const modification = construireModification(
          t,
          operation,
          { ...saisie.modification, localisations: saisie.localisations },
          auteurId,
        );
        const justificatifs = (saisie.justificatifs ?? []).map((j) =>
          construireJustificatif(t, { ...j, cibleType: "MODIFICATION", cibleId: modification.id }, auteurId),
        );
        const resultat = Object.freeze({ operation, modification, justificatifs: Object.freeze(justificatifs) });
        t.e.idempotence.set(cleIdempotence, { empreinte, resultat });
        return resultat;
      });
    },

    /** Crée une opération (typiquement CHANTIER, avant travaux). */
    creerOperation(saisie, { auteurId } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => construireOperation(t, saisie ?? {}, auteurId));
    },

    /** Ajoute une modification (et ses localisations) à une opération existante. */
    ajouterModification(operationId, saisie, { auteurId } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => {
        const operation = exister(t.e, "operations", operationId, "Opération");
        return construireModification(t, operation, saisie ?? {}, auteurId);
      });
    },

    /**
     * Correction non destructive des champs descriptifs : l'enregistrement est
     * remplacé, la version précédente reste dans l'historique (avant/après).
     */
    corrigerModification(id, champs, { auteurId, raison } = {}) {
      exigerAuteur(auteurId);
      if (!estChaineNonVide(raison)) throw erreur(CODES_ERREUR.VALIDATION, "Une correction doit être motivée");
      const inconnus = Object.keys(champs ?? {}).filter((c) => !CHAMPS_CORRIGEABLES.includes(c));
      if (inconnus.length > 0) {
        throw erreur(CODES_ERREUR.VALIDATION, `Champs non corrigeables ici : ${inconnus.join(", ")}`);
      }
      return transaction((t) => {
        const avant = exister(t.e, "modifications", id, "Modification");
        const apres = t.remplacer("modifications", validerModification({ ...avant, ...champs }));
        t.tracer("MODIFICATION", id, "CORRECTION", auteurId, { avant, apres, raison });
        return apres;
      });
    },

    changerStatutPhysique(id, statut, { auteurId, motif, dateExecution } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => {
        const avant = exister(t.e, "modifications", id, "Modification");
        verifierTransitionPhysique(avant.statutPhysique, statut, { motif });
        // La date d'exécution n'est jamais inventée : elle n'est renseignée que si elle est fournie.
        const apres = t.remplacer(
          "modifications",
          validerModification({ ...avant, statutPhysique: statut, dateExecution: dateExecution ?? avant.dateExecution }),
        );
        t.tracer("MODIFICATION", id, "STATUT_PHYSIQUE", auteurId, { avant, apres, raison: motif });
        return apres;
      });
    },

    /**
     * Qualification de l'impact documentaire (et, facultativement, des
     * exigences : contrôle technique requis, catégories de justificatifs).
     */
    qualifierImpact(id, impact, { auteurId, justification, exigences, raison } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => {
        const avant = exister(t.e, "modifications", id, "Modification");
        verifierTransitionImpact(avant.impactDocumentaire, impact, { justification });
        if (impact === "SANS_IMPACT" && t.e.liensTraitement.some((l) => l.modificationId === id)) {
          throw erreur(CODES_ERREUR.RELATION_INVALIDE, "La modification est déjà couverte par un traitement documentaire");
        }
        const apres = t.remplacer(
          "modifications",
          validerModification({
            ...avant,
            impactDocumentaire: impact,
            // La justification précédente reste dans l'historique (champ « avant »).
            justificationSansImpact: impact === "SANS_IMPACT" ? texte(justification) : undefined,
            dateDecisionImpact: t.maintenant,
            exigences: exigences ?? avant.exigences,
          }),
        );
        t.tracer("MODIFICATION", id, "QUALIFICATION_IMPACT", auteurId, { avant, apres, raison });
        return apres;
      });
    },

    creerLocalisation(saisie, { auteurId } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => {
        const localisation = validerLocalisation({ ...saisie, id: genererId() });
        t.ajouter("localisations", localisation);
        t.tracer("LOCALISATION", localisation.id, "CREATION", auteurId, { apres: localisation });
        return localisation;
      });
    },

    associerLocalisation(modificationId, localisationId, modeIdentification, { auteurId } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => lierLocalisation(t, modificationId, localisationId, modeIdentification, auteurId));
    },

    creerDocument(saisie, { auteurId } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => {
        const document = validerDocument({ ...saisie, id: genererId() });
        if (t.e.documents.some((d) => d.referenceStable === document.referenceStable)) {
          throw erreur(CODES_ERREUR.DOUBLON, `Référence de document déjà connue : ${document.referenceStable}`);
        }
        t.ajouter("documents", document);
        t.tracer("DOCUMENT", document.id, "CREATION", auteurId, { apres: document });
        return document;
      });
    },

    /**
     * Crée UNE révision documentaire couvrant une ou plusieurs modifications
     * (aucune multiplication artificielle des révisions).
     */
    creerTraitement({ documentId, indiceDepart, indiceCible, assigneAId, modificationIds = [] } = {}, { auteurId } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => {
        exister(t.e, "documents", documentId, "Document");
        const traitement = validerTraitement({
          id: genererId(),
          documentId,
          indiceDepart: texte(indiceDepart),
          indiceCible: texte(indiceCible),
          assigneAId: texte(assigneAId),
          statut: "A_PREPARER",
          dateDemande: t.maintenant,
        });
        t.ajouter("traitements", traitement);
        t.tracer("TRAITEMENT", traitement.id, "CREATION", auteurId, { apres: traitement });
        for (const modificationId of new Set(modificationIds)) lierTraitement(t, modificationId, traitement.id, auteurId);
        return traitement;
      });
    },

    /**
     * Préparation d'un traitement (indices de départ et cible, affectation),
     * tracée avec avant/après ; possible uniquement avant soumission.
     */
    preparerTraitement(id, champs, { auteurId, raison } = {}) {
      exigerAuteur(auteurId);
      const inconnus = Object.keys(champs ?? {}).filter((c) => !CHAMPS_PREPARATION.includes(c));
      if (inconnus.length > 0) {
        throw erreur(CODES_ERREUR.VALIDATION, `Champs de préparation inconnus : ${inconnus.join(", ")}`);
      }
      return transaction((t) => {
        const avant = exister(t.e, "traitements", id, "Traitement");
        if (!STATUTS_TRAITEMENT_MODIFIABLES.includes(avant.statut)) {
          throw erreur(CODES_ERREUR.TRANSITION_INTERDITE, `Un traitement ${avant.statut} ne peut plus être préparé`);
        }
        const nouveaux = Object.fromEntries(Object.entries(champs ?? {}).map(([c, v]) => [c, texte(v)]));
        const apres = t.remplacer("traitements", validerTraitement({ ...avant, ...nouveaux }));
        t.tracer("TRAITEMENT", id, "PREPARATION", auteurId, { avant, apres, raison });
        return apres;
      });
    },

    associerTraitement(modificationId, traitementId, { auteurId } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => lierTraitement(t, modificationId, traitementId, auteurId));
    },

    /** Avance un traitement ; AUTORISE et PUBLIE sont soumis aux gardes de `statuts.js`. */
    avancerTraitement(id, statut, { auteurId } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => {
        const avant = exister(t.e, "traitements", id, "Traitement");
        verifierTransitionTraitement(avant.statut, statut);
        if (statut === "AUTORISE") exigerAutorisationPossible(t.e, id);
        if (statut === "PUBLIE") exigerPublicationPossible(t.e, id);
        const apres = t.remplacer(
          "traitements",
          validerTraitement({
            ...avant,
            statut,
            dateSoumission: statut === "SOUMIS_A_CONTROLE" ? t.maintenant : avant.dateSoumission,
            datePublication: statut === "PUBLIE" ? t.maintenant : undefined,
          }),
        );
        // La publication est une action tracée, pas la simple mise à jour d'un champ.
        t.tracer("TRAITEMENT", id, statut === "PUBLIE" ? "PUBLICATION" : "STATUT_TRAITEMENT", auteurId, { avant, apres });
        return apres;
      });
    },

    /** Rejet motivé : retour au traitement (EN_COURS) avec événement d'historique. */
    rejeterTraitement(id, { auteurId, motif } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => {
        const avant = exister(t.e, "traitements", id, "Traitement");
        verifierRejetTraitement(avant.statut, motif);
        const apres = t.remplacer("traitements", validerTraitement({ ...avant, statut: STATUT_APRES_REJET }));
        t.tracer("TRAITEMENT", id, "REJET", auteurId, { avant, apres, raison: motif });
        return apres;
      });
    },

    /** Référence un justificatif fictif (aucun fichier réel stocké). */
    ajouterJustificatif(saisie, { auteurId } = {}) {
      exigerAuteur(auteurId);
      return transaction((t) => construireJustificatif(t, saisie ?? {}, auteurId));
    },

    /**
     * Enregistre une décision de validation. Les contrôles de rôle portent sur
     * le rôle DÉCLARÉ (`roleAuMoment`) : cohérence des données de démonstration,
     * et non sécurité réelle.
     */
    enregistrerValidation(saisie) {
      const { auteurId } = saisie ?? {};
      exigerAuteur(auteurId);
      return transaction((t) => {
        const validation = validerValidation({ ...saisie, id: genererId(), date: t.maintenant });
        const cible = exister(t.e, COLLECTION_PAR_CIBLE[validation.cibleType], validation.cibleId, validation.cibleType);
        const contexte = t.e;
        const problemes = [];
        if (validation.cibleType === "MODIFICATION") {
          const origine = exister(t.e, "operations", cible.operationId, "Opération").origine;
          if (validation.decision === "APPROUVEE" && localisationsDeModification(contexte, cible.id).length === 0) {
            problemes.push("une modification validée doit comporter au moins une localisation");
          }
          if (validation.nature === "TECHNIQUE" && validation.roleAuMoment !== ROLE_PAR_NATURE.TECHNIQUE) {
            problemes.push(`le contrôle technique relève du ${ROLE_PAR_NATURE.TECHNIQUE}`);
          }
          if (validation.nature === "SANS_IMPACT") {
            if (cible.impactDocumentaire !== "SANS_IMPACT") problemes.push("la modification n'est pas qualifiée SANS_IMPACT");
            if (validation.roleAuMoment !== ROLE_RESPONSABLE_PAR_ORIGINE[origine]) {
              problemes.push(`la validation SANS_IMPACT d'une modification ${origine} relève du ${ROLE_RESPONSABLE_PAR_ORIGINE[origine]}`);
            }
          }
        } else {
          if (cible.statut !== "CONTROLE_BIM") {
            problemes.push(`une validation ${validation.nature} n'est possible qu'au statut CONTROLE_BIM`);
          }
          if (validation.nature === "BIM" && validation.roleAuMoment !== ROLE_PAR_NATURE.BIM) {
            problemes.push(`le contrôle BIM relève du ${ROLE_PAR_NATURE.BIM}, distinct du chef de projet et du responsable maintenance`);
          }
          if (validation.nature === "FINALE") {
            const roles = new Set(
              modificationsDeTraitement(contexte, cible.id).map(
                (m) => ROLE_RESPONSABLE_PAR_ORIGINE[exister(t.e, "operations", m.operationId, "Opération").origine],
              ),
            );
            if (!roles.has(validation.roleAuMoment)) {
              problemes.push(`l'autorisation finale relève de : ${[...roles].join(", ") || "aucun responsable (aucune modification)"}`);
            }
          }
        }
        if (CIBLE_PAR_NATURE[validation.nature] !== validation.cibleType) problemes.push("cible incohérente");
        if (problemes.length > 0) {
          throw erreur(CODES_ERREUR.GARDE_NON_SATISFAITE, `Validation refusée : ${problemes.join(" ; ")}`, problemes);
        }
        t.ajouter("validations", validation);
        t.tracer(validation.cibleType, validation.cibleId, `VALIDATION_${validation.nature}`, auteurId, {
          apres: validation,
          raison: validation.commentaire,
        });
        return validation;
      });
    },
  };

  adaptateur.reinitialiser();
  return Object.freeze(adaptateur);
}
