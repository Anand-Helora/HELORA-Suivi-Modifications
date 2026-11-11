/**
 * Validation structurelle des 10 ensembles du modèle MVP.
 *
 * Chaque fonction `validerX(donnees)` vérifie les champs d'un enregistrement,
 * renvoie une copie figée ne contenant que les champs connus, ou lève une
 * `ErreurDomaine` (code VALIDATION) listant tous les problèmes détectés.
 * Ces fonctions sont pures : aucun accès au stockage, au réseau ni au DOM.
 * Les règles relationnelles (existence des cibles, unicité) sont contrôlées
 * par l'adaptateur de données ; les gardes métier par `statuts.js`.
 */

import {
  CATEGORIES_JUSTIFICATIF,
  CIBLE_PAR_NATURE,
  CIBLES_JUSTIFICATIF,
  CIBLES_VALIDATION,
  DECISIONS_VALIDATION,
  IMPACTS_DOCUMENTAIRES,
  MODES_IDENTIFICATION,
  NATURES_VALIDATION,
  ORIGINES,
  ORIGINES_DOCUMENT,
  STATUTS_PHYSIQUES,
  STATUTS_TRAITEMENT,
  TYPES_DOCUMENT,
  TYPES_LOCALISATION,
} from "./constantes.js";
import { exigerAucunProbleme } from "./erreurs.js";

// ---------------------------------------------------------------------------
// Contrôles élémentaires réutilisables
// ---------------------------------------------------------------------------

/** Date-heure ISO 8601 avec fuseau explicite (Z ou ±hh:mm), spéc. § 2. */
const MOTIF_DATE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Domaines réservés à la documentation (RFC 2606 / RFC 6761) : seuls admis
 * dans les URI de démonstration, pour garantir l'absence de ressource interne.
 */
const DOMAINES_FICTIFS = [/\.example$/, /\.invalid$/, /\.test$/, /^(www\.)?example\.(com|org|net)$/];

export function estChaineNonVide(valeur) {
  return typeof valeur === "string" && valeur.trim() !== "";
}

export function estDateIso(valeur) {
  return typeof valeur === "string" && MOTIF_DATE_ISO.test(valeur) && !Number.isNaN(Date.parse(valeur));
}

/** Vrai si l'URI est en http(s) et pointe vers un domaine réservé fictif. */
export function estUriFictive(valeur) {
  if (typeof valeur !== "string") return false;
  let url;
  try {
    url = new URL(valeur);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  return DOMAINES_FICTIFS.some((motif) => motif.test(url.hostname.toLowerCase()));
}

/** Petit collecteur de problèmes, pour signaler toutes les erreurs d'un coup. */
function verificateur(donnees) {
  const problemes = [];
  const present = (champ) => donnees[champ] !== undefined && donnees[champ] !== null;
  return {
    problemes,
    present,
    requis(champ) {
      if (!estChaineNonVide(donnees[champ])) problemes.push(`${champ} est obligatoire`);
    },
    texteOptionnel(champ) {
      if (present(champ) && !estChaineNonVide(donnees[champ])) {
        problemes.push(`${champ} doit être un texte non vide s'il est renseigné`);
      }
    },
    enumeration(champ, valeurs, { optionnel = false } = {}) {
      if (optionnel && !present(champ)) return;
      if (!valeurs.includes(donnees[champ])) {
        problemes.push(`${champ} doit valoir ${valeurs.join(", ")}`);
      }
    },
    date(champ, { optionnel = false } = {}) {
      if (optionnel && !present(champ)) return;
      if (!estDateIso(donnees[champ])) {
        problemes.push(`${champ} doit être une date ISO 8601 avec fuseau`);
      }
    },
    uri(champ) {
      if (present(champ) && !estUriFictive(donnees[champ])) {
        problemes.push(`${champ} doit être une URI de démonstration (domaine réservé fictif)`);
      }
    },
  };
}

/** Copie figée limitée aux champs connus ; les champs absents sont omis. */
function copier(donnees, champs) {
  const resultat = {};
  for (const champ of champs) {
    if (donnees[champ] !== undefined && donnees[champ] !== null) {
      const valeur = donnees[champ];
      resultat[champ] = Array.isArray(valeur) ? Object.freeze([...valeur]) : valeur;
    }
  }
  return Object.freeze(resultat);
}

function exigerObjet(donnees, contexte) {
  if (donnees === null || typeof donnees !== "object" || Array.isArray(donnees)) {
    exigerAucunProbleme([`un objet est attendu`], contexte);
  }
}

// ---------------------------------------------------------------------------
// 1. Operation
// ---------------------------------------------------------------------------

const CHAMPS_OPERATION = [
  "id", "reference", "origine", "titre", "description", "dateCreation",
  "dateDebutPrevue", "responsableId", "referenceProjet",
  "gmaoSysteme", "gmaoNumeroOT", "gmaoUrl",
];

export function validerOperation(donnees) {
  exigerObjet(donnees, "Opération");
  const v = verificateur(donnees);
  v.requis("id");
  v.requis("reference");
  v.enumeration("origine", ORIGINES);
  v.requis("titre");
  v.texteOptionnel("description");
  v.date("dateCreation");
  v.date("dateDebutPrevue", { optionnel: true });
  for (const champ of ["responsableId", "referenceProjet", "gmaoSysteme", "gmaoNumeroOT"]) {
    v.texteOptionnel(champ);
  }
  v.uri("gmaoUrl");
  // GMAO facultative, mais un numéro d'OT n'a de sens qu'avec son système.
  if (v.present("gmaoNumeroOT") && !v.present("gmaoSysteme")) {
    v.problemes.push("gmaoSysteme est obligatoire lorsqu'un numéro d'OT GMAO est renseigné");
  }
  if (v.present("gmaoUrl") && !v.present("gmaoNumeroOT")) {
    v.problemes.push("gmaoUrl exige un numéro d'OT GMAO");
  }
  if (estChaineNonVide(donnees.id) && donnees.id === donnees.reference) {
    v.problemes.push("la référence lisible doit être distincte de l'identifiant");
  }
  exigerAucunProbleme(v.problemes, "Opération");
  return copier(donnees, CHAMPS_OPERATION);
}

// ---------------------------------------------------------------------------
// 2. Modification
// ---------------------------------------------------------------------------

const CHAMPS_MODIFICATION = [
  "id", "operationId", "reference", "titre", "description", "disciplineCode",
  "declareParId", "dateDeclaration", "dateExecution", "statutPhysique",
  "impactDocumentaire", "justificationSansImpact", "dateDecisionImpact", "exigences",
];

/**
 * `exigences` (proposition technique, absente de la spéc.) : pièces et
 * contrôles exigés, fixés lors de la qualification.
 *   { controleTechnique: boolean, justificatifs: CATEGORIE[] }
 * `dateDecisionImpact` (proposition technique) : date de la dernière décision
 * d'impact, pour n'admettre que les validations postérieures à cette décision.
 */
function problemesExigences(exigences) {
  if (exigences === undefined || exigences === null) return [];
  const problemes = [];
  if (typeof exigences !== "object" || Array.isArray(exigences)) return ["exigences doit être un objet"];
  if (typeof exigences.controleTechnique !== "boolean") {
    problemes.push("exigences.controleTechnique doit être un booléen");
  }
  if (
    !Array.isArray(exigences.justificatifs) ||
    !exigences.justificatifs.every((c) => CATEGORIES_JUSTIFICATIF.includes(c))
  ) {
    problemes.push(`exigences.justificatifs doit lister des catégories parmi ${CATEGORIES_JUSTIFICATIF.join(", ")}`);
  }
  return problemes;
}

export function validerModification(donnees) {
  exigerObjet(donnees, "Modification");
  const v = verificateur(donnees);
  v.requis("id");
  v.requis("operationId");
  v.requis("reference");
  v.requis("titre");
  v.texteOptionnel("description");
  v.texteOptionnel("disciplineCode");
  v.requis("declareParId");
  v.date("dateDeclaration");
  v.date("dateExecution", { optionnel: true });
  v.date("dateDecisionImpact", { optionnel: true });
  v.enumeration("statutPhysique", STATUTS_PHYSIQUES);
  v.enumeration("impactDocumentaire", IMPACTS_DOCUMENTAIRES);
  v.texteOptionnel("justificationSansImpact");
  v.problemes.push(...problemesExigences(donnees.exigences));
  if (donnees.impactDocumentaire === "SANS_IMPACT" && !estChaineNonVide(donnees.justificationSansImpact)) {
    v.problemes.push("une modification SANS_IMPACT exige une justification");
  }
  if (estChaineNonVide(donnees.id) && donnees.id === donnees.reference) {
    v.problemes.push("la référence lisible doit être distincte de l'identifiant");
  }
  exigerAucunProbleme(v.problemes, "Modification");
  const copie = copier(donnees, CHAMPS_MODIFICATION);
  if (copie.exigences) {
    return Object.freeze({
      ...copie,
      exigences: Object.freeze({
        controleTechnique: copie.exigences.controleTechnique,
        justificatifs: Object.freeze([...new Set(copie.exigences.justificatifs)]),
      }),
    });
  }
  return copie;
}

// ---------------------------------------------------------------------------
// 3. Localisation
// ---------------------------------------------------------------------------

const CHAMPS_LOCALISATION = [
  "id", "type", "site", "bloc", "etage", "codeLocal", "referenceHelIse", "descriptionZone",
];

export function validerLocalisation(donnees) {
  exigerObjet(donnees, "Localisation");
  const v = verificateur(donnees);
  v.requis("id");
  v.enumeration("type", TYPES_LOCALISATION);
  v.requis("site");
  for (const champ of ["bloc", "etage", "codeLocal", "referenceHelIse", "descriptionZone"]) {
    v.texteOptionnel(champ);
  }
  if (donnees.type === "LOCAL" && !v.present("codeLocal") && !v.present("referenceHelIse")) {
    v.problemes.push("un LOCAL exige un codeLocal ou une referenceHelIse");
  }
  if (donnees.type === "ZONE" && !v.present("descriptionZone")) {
    v.problemes.push("une ZONE exige une descriptionZone");
  }
  exigerAucunProbleme(v.problemes, "Localisation");
  return copier(donnees, CHAMPS_LOCALISATION);
}

// ---------------------------------------------------------------------------
// 4. ModificationLocalisation (lien N↔N)
// ---------------------------------------------------------------------------

export function validerModificationLocalisation(donnees) {
  exigerObjet(donnees, "Lien modification-localisation");
  const v = verificateur(donnees);
  v.requis("modificationId");
  v.requis("localisationId");
  v.enumeration("modeIdentification", MODES_IDENTIFICATION);
  exigerAucunProbleme(v.problemes, "Lien modification-localisation");
  return copier(donnees, ["modificationId", "localisationId", "modeIdentification"]);
}

// ---------------------------------------------------------------------------
// 5. Document
// ---------------------------------------------------------------------------

export function validerDocument(donnees) {
  exigerObjet(donnees, "Document");
  const v = verificateur(donnees);
  v.requis("id");
  v.requis("referenceStable");
  v.enumeration("type", TYPES_DOCUMENT);
  v.enumeration("origine", ORIGINES_DOCUMENT);
  v.texteOptionnel("indiceConnu");
  v.texteOptionnel("titre");
  v.uri("uriExterne");
  exigerAucunProbleme(v.problemes, "Document");
  return copier(donnees, ["id", "referenceStable", "type", "origine", "indiceConnu", "titre", "uriExterne"]);
}

// ---------------------------------------------------------------------------
// 6. TraitementDocumentaire
// ---------------------------------------------------------------------------

export function validerTraitement(donnees) {
  exigerObjet(donnees, "Traitement documentaire");
  const v = verificateur(donnees);
  v.requis("id");
  v.requis("documentId");
  v.texteOptionnel("indiceDepart");
  v.texteOptionnel("indiceCible");
  v.texteOptionnel("assigneAId");
  v.enumeration("statut", STATUTS_TRAITEMENT);
  v.date("dateDemande");
  v.date("dateSoumission", { optionnel: true });
  v.date("datePublication", { optionnel: true });
  if (donnees.statut === "PUBLIE" && !v.present("datePublication")) {
    v.problemes.push("un traitement PUBLIE exige une datePublication");
  }
  if (donnees.statut !== "PUBLIE" && v.present("datePublication")) {
    v.problemes.push("datePublication n'est admise que pour un traitement PUBLIE");
  }
  exigerAucunProbleme(v.problemes, "Traitement documentaire");
  return copier(donnees, [
    "id", "documentId", "indiceDepart", "indiceCible", "assigneAId",
    "statut", "dateDemande", "dateSoumission", "datePublication",
  ]);
}

// ---------------------------------------------------------------------------
// 7. ModificationTraitement (lien N↔N)
// ---------------------------------------------------------------------------

export function validerModificationTraitement(donnees) {
  exigerObjet(donnees, "Lien modification-traitement");
  const v = verificateur(donnees);
  v.requis("modificationId");
  v.requis("traitementId");
  exigerAucunProbleme(v.problemes, "Lien modification-traitement");
  return copier(donnees, ["modificationId", "traitementId"]);
}

// ---------------------------------------------------------------------------
// 8. Justificatif
// ---------------------------------------------------------------------------

export function validerJustificatif(donnees) {
  exigerObjet(donnees, "Justificatif");
  const v = verificateur(donnees);
  v.requis("id");
  v.enumeration("cibleType", CIBLES_JUSTIFICATIF);
  v.requis("cibleId");
  v.enumeration("categorie", CATEGORIES_JUSTIFICATIF);
  v.requis("libelle");
  v.texteOptionnel("referenceFichierDemo");
  v.requis("deposeParId");
  v.date("dateDepot");
  // Aucun fichier réel : seule une référence textuelle de démonstration est admise.
  if (v.present("referenceFichierDemo") && /^[a-z][a-z0-9+.-]*:/i.test(donnees.referenceFichierDemo)) {
    v.problemes.push("referenceFichierDemo doit être un simple nom de démonstration, pas une URI");
  }
  exigerAucunProbleme(v.problemes, "Justificatif");
  return copier(donnees, [
    "id", "cibleType", "cibleId", "categorie", "libelle", "referenceFichierDemo", "deposeParId", "dateDepot",
  ]);
}

// ---------------------------------------------------------------------------
// 9. Validation
// ---------------------------------------------------------------------------

export function validerValidation(donnees) {
  exigerObjet(donnees, "Validation");
  const v = verificateur(donnees);
  v.requis("id");
  v.enumeration("cibleType", CIBLES_VALIDATION);
  v.requis("cibleId");
  v.enumeration("nature", NATURES_VALIDATION);
  v.enumeration("decision", DECISIONS_VALIDATION);
  v.requis("auteurId");
  v.requis("roleAuMoment");
  v.date("date");
  v.texteOptionnel("commentaire");
  if (NATURES_VALIDATION.includes(donnees.nature) && donnees.cibleType !== CIBLE_PAR_NATURE[donnees.nature]) {
    v.problemes.push(`une validation ${donnees.nature} porte sur un(e) ${CIBLE_PAR_NATURE[donnees.nature]}`);
  }
  if (donnees.decision === "REFUSEE" && !v.present("commentaire")) {
    v.problemes.push("un refus exige un motif (commentaire)");
  }
  exigerAucunProbleme(v.problemes, "Validation");
  return copier(donnees, [
    "id", "cibleType", "cibleId", "nature", "decision", "auteurId", "roleAuMoment", "date", "commentaire",
  ]);
}

// ---------------------------------------------------------------------------
// 10. EvenementHistorique
// ---------------------------------------------------------------------------

export function validerEvenement(donnees) {
  exigerObjet(donnees, "Événement d'historique");
  const v = verificateur(donnees);
  v.requis("id");
  v.requis("entiteType");
  v.requis("entiteId");
  v.requis("action");
  v.requis("auteurId");
  v.date("horodatage");
  v.texteOptionnel("raison");
  exigerAucunProbleme(v.problemes, "Événement d'historique");
  return copier(donnees, ["id", "entiteType", "entiteId", "action", "auteurId", "horodatage", "avant", "apres", "raison"]);
}
