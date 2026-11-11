/**
 * Calculs dérivés et gardes métier (spéc. § 3 et § 7).
 *
 * Toutes les fonctions sont pures et reçoivent un « contexte » : un instantané
 * des enregistrements, sous forme de tableaux.
 *
 *   {
 *     operations, modifications, localisations, liensLocalisation,
 *     documents, traitements, liensTraitement, justificatifs, validations,
 *     evenements
 *   }
 *
 * Les statuts affichés sont toujours calculés, jamais saisis. Les compteurs
 * portent sur des modifications distinctes, jamais sur des lignes d'association.
 */

import {
  ROLE_PAR_NATURE,
  ROLE_RESPONSABLE_PAR_ORIGINE,
  STATUTS_DOCUMENTAIRES_AFFICHES,
  STATUTS_PHYSIQUES,
} from "./constantes.js";
import { CODES_ERREUR, ErreurDomaine } from "./erreurs.js";

const vide = Object.freeze([]);
const liste = (contexte, cle) => contexte?.[cle] ?? vide;
const instant = (date) => Date.parse(date);

function trouver(contexte, cle, id, libelle) {
  const element = liste(contexte, cle).find((e) => e.id === id);
  if (!element) throw new ErreurDomaine(CODES_ERREUR.INTROUVABLE, `${libelle} « ${id} » introuvable`);
  return element;
}

// ---------------------------------------------------------------------------
// Validations : seule la décision la plus récente compte
// ---------------------------------------------------------------------------

/** Position du dernier événement du journal (ajout seul) satisfaisant `predicat`, ou -1. */
function rangDernierEvenement(contexte, predicat) {
  const evenements = liste(contexte, "evenements");
  for (let i = evenements.length - 1; i >= 0; i -= 1) {
    if (predicat(evenements[i])) return i;
  }
  return -1;
}

/**
 * Dernière validation correspondant au filtre, dans l'ordre d'enregistrement
 * (les collections sont en ajout seul) et non selon l'horodatage : deux
 * décisions horodatées à l'identique restent ainsi correctement ordonnées.
 *
 * `borne` délimite le cycle de revue courant : un prédicat sur les événements
 * d'historique (par ex. la dernière soumission). Seules les validations dont
 * l'événement de création est postérieur à cette borne sont retenues. À défaut
 * d'événement de borne (état chargé depuis des fixtures sans historique), on
 * retombe sur la date `depuis`. Les validations écartées restent dans
 * l'historique mais ne décident plus.
 */
export function derniereValidation(contexte, { cibleType, cibleId, nature, roleAuMoment, borne, depuis }) {
  const rangCreation = new Map();
  liste(contexte, "evenements").forEach((e, i) => {
    if (e.action?.startsWith("VALIDATION_") && e.apres?.id) rangCreation.set(e.apres.id, i);
  });
  const rangBorne = borne ? rangDernierEvenement(contexte, borne) : -1;
  const seuil = depuis ? instant(depuis) : -Infinity;
  let retenue = null;
  for (const v of liste(contexte, "validations")) {
    if (v.cibleType !== cibleType || v.cibleId !== cibleId || v.nature !== nature) continue;
    if (roleAuMoment && v.roleAuMoment !== roleAuMoment) continue;
    if (rangBorne >= 0 ? !((rangCreation.get(v.id) ?? -1) > rangBorne) : instant(v.date) < seuil) continue;
    retenue = v;
  }
  return retenue;
}

/** Borne du cycle de revue d'un traitement : sa dernière soumission au contrôle. */
const borneSoumission = (traitementId) => (e) =>
  e.entiteType === "TRAITEMENT" && e.entiteId === traitementId && e.apres?.statut === "SOUMIS_A_CONTROLE"
  && e.avant?.statut !== "SOUMIS_A_CONTROLE";

/** Borne d'une décision d'impact : la dernière qualification de la modification. */
const borneQualification = (modificationId) => (e) =>
  e.entiteType === "MODIFICATION" && e.entiteId === modificationId && e.action === "QUALIFICATION_IMPACT";

const estApprouvee = (validation) => validation?.decision === "APPROUVEE";

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export function traitementsDeModification(contexte, modificationId) {
  const ids = new Set(
    liste(contexte, "liensTraitement").filter((l) => l.modificationId === modificationId).map((l) => l.traitementId),
  );
  return liste(contexte, "traitements").filter((t) => ids.has(t.id));
}

export function modificationsDeTraitement(contexte, traitementId) {
  const ids = new Set(
    liste(contexte, "liensTraitement").filter((l) => l.traitementId === traitementId).map((l) => l.modificationId),
  );
  return liste(contexte, "modifications").filter((m) => ids.has(m.id));
}

export function localisationsDeModification(contexte, modificationId) {
  const ids = new Set(
    liste(contexte, "liensLocalisation").filter((l) => l.modificationId === modificationId).map((l) => l.localisationId),
  );
  return liste(contexte, "localisations").filter((l) => ids.has(l.id));
}

function origineDe(contexte, modification) {
  return trouver(contexte, "operations", modification.operationId, "Opération").origine;
}

// ---------------------------------------------------------------------------
// Décision « sans impact »
// ---------------------------------------------------------------------------

/**
 * Vrai si la décision SANS_IMPACT est justifiée et validée (dernière décision
 * APPROUVEE) par le responsable de la source, après la dernière décision d'impact.
 */
export function sansImpactValide(contexte, modification) {
  if (modification.impactDocumentaire !== "SANS_IMPACT") return false;
  if (!modification.justificationSansImpact?.trim()) return false;
  const validation = derniereValidation(contexte, {
    cibleType: "MODIFICATION",
    cibleId: modification.id,
    nature: "SANS_IMPACT",
    roleAuMoment: ROLE_RESPONSABLE_PAR_ORIGINE[origineDe(contexte, modification)],
    borne: borneQualification(modification.id),
    depuis: modification.dateDecisionImpact,
  });
  return estApprouvee(validation);
}

// ---------------------------------------------------------------------------
// Statut documentaire affiché d'une modification
// ---------------------------------------------------------------------------

/**
 * Correspondance statut de traitement → statut affiché, du moins au plus avancé.
 * Interprétation à confirmer : SOUMIS_A_CONTROLE et CONTROLE_BIM → EN_CONTROLE,
 * AUTORISE → EN_VALIDATION (autorisé, en attente de publication).
 */
export const STATUT_AFFICHE_PAR_TRAITEMENT = Object.freeze({
  A_PREPARER: "A_PREPARER",
  EN_COURS: "EN_COURS",
  SOUMIS_A_CONTROLE: "EN_CONTROLE",
  CONTROLE_BIM: "EN_CONTROLE",
  AUTORISE: "EN_VALIDATION",
  PUBLIE: "A_JOUR",
});

const RANG_AFFICHE = Object.freeze(Object.fromEntries(STATUTS_DOCUMENTAIRES_AFFICHES.map((s, i) => [s, i])));

/**
 * Statut documentaire affiché, calculé (spéc. § 3) :
 * - A_QUALIFIER, SANS_IMPACT_EN_ATTENTE / SANS_IMPACT_VALIDE ;
 * - DOCUMENT_NON_IDENTIFIE si mise à jour requise sans traitement associé
 *   (simple statut de suivi : aucun dossier d'anomalie n'est créé) ;
 * - sinon le statut du traitement le moins avancé. A_JOUR uniquement si tous
 *   les traitements sont publiés ET la modification physiquement réalisée.
 */
export function calculerStatutDocumentaire(contexte, modificationId) {
  const modification = trouver(contexte, "modifications", modificationId, "Modification");
  switch (modification.impactDocumentaire) {
    case "A_QUALIFIER":
      return "A_QUALIFIER";
    case "SANS_IMPACT":
      return sansImpactValide(contexte, modification) ? "SANS_IMPACT_VALIDE" : "SANS_IMPACT_EN_ATTENTE";
    case "MISE_A_JOUR_REQUISE":
      break;
    default:
      throw new ErreurDomaine(CODES_ERREUR.VALIDATION, `Impact documentaire inconnu « ${modification.impactDocumentaire} »`);
  }
  const traitements = traitementsDeModification(contexte, modificationId);
  if (traitements.length === 0) return "DOCUMENT_NON_IDENTIFIE";
  const statut = traitements
    .map((t) => STATUT_AFFICHE_PAR_TRAITEMENT[t.statut])
    .reduce((min, s) => (RANG_AFFICHE[s] < RANG_AFFICHE[min] ? s : min));
  // A_JOUR exige aussi que la modification soit réalisée et que les validations
  // requises soient toujours acquises : un refus technique enregistré après la
  // publication ramène le statut affiché à EN_VALIDATION (interprétation à confirmer).
  if (statut === "A_JOUR" && (modification.statutPhysique !== "REALISEE" || !controleTechniqueSatisfait(contexte, modification))) {
    return "EN_VALIDATION";
  }
  return statut;
}

/** Vrai si aucun contrôle technique n'est exigé, ou si la dernière décision technique est une approbation. */
export function controleTechniqueSatisfait(contexte, modification) {
  if (!modification.exigences?.controleTechnique) return true;
  return estApprouvee(
    derniereValidation(contexte, {
      cibleType: "MODIFICATION", cibleId: modification.id, nature: "TECHNIQUE", roleAuMoment: ROLE_PAR_NATURE.TECHNIQUE,
    }),
  );
}

// ---------------------------------------------------------------------------
// Statut physique dérivé d'une opération
// ---------------------------------------------------------------------------

/**
 * Le statut physique d'une opération est dérivé de ses modifications, jamais saisi.
 * La règle d'agrégation n'est pas fixée par la spécification : seuls les cas
 * non ambigus sont tranchés (aucune modification, toutes annulées, toutes les
 * modifications non annulées au même statut). Sinon `statut` vaut null et
 * `mixte` vaut true ; les compteurs restent toujours disponibles.
 */
export function deriverStatutPhysiqueOperation(contexte, operationId) {
  trouver(contexte, "operations", operationId, "Opération");
  const modifications = liste(contexte, "modifications").filter((m) => m.operationId === operationId);
  const compteurs = Object.fromEntries(STATUTS_PHYSIQUES.map((s) => [s, 0]));
  for (const m of modifications) compteurs[m.statutPhysique] += 1;
  const actifs = STATUTS_PHYSIQUES.filter((s) => s !== "ANNULEE" && compteurs[s] > 0);
  let statut = null;
  if (modifications.length > 0 && actifs.length === 0) statut = "ANNULEE";
  else if (actifs.length === 1) statut = actifs[0];
  return Object.freeze({
    statut,
    mixte: actifs.length > 1,
    total: modifications.length,
    compteurs: Object.freeze(compteurs),
  });
}

// ---------------------------------------------------------------------------
// Gardes du traitement documentaire
// ---------------------------------------------------------------------------

/** Catégories de justificatifs exigées mais absentes pour une modification. */
export function justificatifsManquants(contexte, modification, { traitementId } = {}) {
  const exigees = modification.exigences?.justificatifs ?? vide;
  if (exigees.length === 0) return [];
  // Interprétation : une pièce peut être déposée sur la modification, son opération ou le traitement.
  const cibles = new Set([`MODIFICATION:${modification.id}`, `OPERATION:${modification.operationId}`]);
  if (traitementId) cibles.add(`TRAITEMENT:${traitementId}`);
  const fournies = new Set(
    liste(contexte, "justificatifs").filter((j) => cibles.has(`${j.cibleType}:${j.cibleId}`)).map((j) => j.categorie),
  );
  return exigees.filter((c) => !fournies.has(c));
}

/** Gardes n° 3 à 5 : contrôle BIM et autorisations finales par origine. */
export function problemesAutorisation(contexte, traitementId) {
  const traitement = trouver(contexte, "traitements", traitementId, "Traitement");
  const problemes = [];
  const modifications = modificationsDeTraitement(contexte, traitementId);
  if (modifications.length === 0) problemes.push("aucune modification n'est couverte par ce traitement");
  // « Une modification validée doit comporter au moins une localisation » (spéc. § 2).
  for (const m of modifications) {
    if (localisationsDeModification(contexte, m.id).length === 0) problemes.push(`${m.reference} : aucune localisation`);
  }

  const cycle = { borne: borneSoumission(traitementId), depuis: traitement.dateSoumission };
  const bim = derniereValidation(contexte, {
    cibleType: "TRAITEMENT", cibleId: traitementId, nature: "BIM", roleAuMoment: ROLE_PAR_NATURE.BIM, ...cycle,
  });
  if (!estApprouvee(bim)) problemes.push(bim ? "le contrôle BIM a été refusé" : "contrôle BIM non réalisé");

  const origines = [...new Set(modifications.map((m) => origineDe(contexte, m)))].sort();
  for (const origine of origines) {
    const role = ROLE_RESPONSABLE_PAR_ORIGINE[origine];
    const finale = derniereValidation(contexte, {
      cibleType: "TRAITEMENT", cibleId: traitementId, nature: "FINALE", roleAuMoment: role, ...cycle,
    });
    if (!estApprouvee(finale)) {
      problemes.push(
        finale
          ? `autorisation finale ${origine} refusée (${role})`
          : `autorisation finale ${origine} manquante (${role})`,
      );
    }
  }
  return problemes;
}

/** Ensemble des gardes avant publication (n° 1 à 5 et indice cible). */
export function problemesPublication(contexte, traitementId) {
  const traitement = trouver(contexte, "traitements", traitementId, "Traitement");
  const problemes = [];
  if (!traitement.indiceCible?.trim()) problemes.push("indice cible non renseigné");
  for (const m of modificationsDeTraitement(contexte, traitementId)) {
    if (m.statutPhysique !== "REALISEE") problemes.push(`${m.reference} : travaux non réalisés`);
    if (m.impactDocumentaire !== "MISE_A_JOUR_REQUISE") {
      problemes.push(`${m.reference} : mise à jour documentaire non qualifiée comme requise`);
    }
    if (!controleTechniqueSatisfait(contexte, m)) problemes.push(`${m.reference} : contrôle technique requis non attesté`);
    const manquants = justificatifsManquants(contexte, m, { traitementId });
    if (manquants.length > 0) problemes.push(`${m.reference} : justificatifs manquants (${manquants.join(", ")})`);
  }
  problemes.push(...problemesAutorisation(contexte, traitementId));
  return problemes;
}

function exiger(problemes, message) {
  if (problemes.length > 0) {
    throw new ErreurDomaine(CODES_ERREUR.GARDE_NON_SATISFAITE, `${message} : ${problemes.join(" ; ")}`, problemes);
  }
}

export function exigerAutorisationPossible(contexte, traitementId) {
  exiger(problemesAutorisation(contexte, traitementId), "Autorisation impossible");
}

export function exigerPublicationPossible(contexte, traitementId) {
  exiger(problemesPublication(contexte, traitementId), "Publication impossible");
}

// ---------------------------------------------------------------------------
// Agrégats et indicateurs (§ 7) — modifications distinctes uniquement
// ---------------------------------------------------------------------------

function initialiser(valeurs) {
  return Object.fromEntries(valeurs.map((v) => [v, 0]));
}

/**
 * Compteurs agrégés sur un ensemble de modifications (par défaut : toutes).
 * @param {{ operationId?: string, origine?: string, site?: string }} [filtre]
 */
export function calculerCompteurs(contexte, filtre = {}) {
  const modifications = selectionnerModifications(contexte, filtre);
  const parStatutDocumentaire = initialiser(STATUTS_DOCUMENTAIRES_AFFICHES);
  const parStatutPhysique = initialiser(STATUTS_PHYSIQUES);
  const parOrigine = {};
  const parDiscipline = {};
  const parSite = {};
  let realiseesNonAJour = 0;

  for (const m of modifications) {
    const documentaire = calculerStatutDocumentaire(contexte, m.id);
    parStatutDocumentaire[documentaire] += 1;
    parStatutPhysique[m.statutPhysique] += 1;
    const origine = origineDe(contexte, m);
    parOrigine[origine] = (parOrigine[origine] ?? 0) + 1;
    const discipline = m.disciplineCode ?? "NON_RENSEIGNEE";
    parDiscipline[discipline] = (parDiscipline[discipline] ?? 0) + 1;
    // Une modification présente dans plusieurs locaux d'un même site ne compte qu'une fois pour ce site.
    for (const site of new Set(localisationsDeModification(contexte, m.id).map((l) => l.site))) {
      parSite[site] = (parSite[site] ?? 0) + 1;
    }
    if (m.statutPhysique === "REALISEE" && documentaire !== "A_JOUR" && documentaire !== "SANS_IMPACT_VALIDE") {
      realiseesNonAJour += 1;
    }
  }
  return Object.freeze({
    total: modifications.length,
    realiseesNonAJour,
    parStatutDocumentaire: Object.freeze(parStatutDocumentaire),
    parStatutPhysique: Object.freeze(parStatutPhysique),
    parOrigine: Object.freeze(parOrigine),
    parDiscipline: Object.freeze(parDiscipline),
    parSite: Object.freeze(parSite),
  });
}

function selectionnerModifications(contexte, { operationId, origine, site } = {}) {
  return liste(contexte, "modifications").filter((m) => {
    if (operationId && m.operationId !== operationId) return false;
    if (origine && origineDe(contexte, m) !== origine) return false;
    if (site && !localisationsDeModification(contexte, m.id).some((l) => l.site === site)) return false;
    return true;
  });
}

/**
 * Délai en jours entre l'exécution et la dernière publication des traitements
 * d'une modification. Renvoie null si non calculable (date d'exécution absente,
 * aucun traitement, ou traitement non publié) : jamais de zéro inventé.
 */
export function calculerDelaiMiseAJour(contexte, modificationId) {
  const modification = trouver(contexte, "modifications", modificationId, "Modification");
  if (!modification.dateExecution) return null;
  const traitements = traitementsDeModification(contexte, modificationId);
  if (traitements.length === 0 || traitements.some((t) => !t.datePublication)) return null;
  const publication = Math.max(...traitements.map((t) => instant(t.datePublication)));
  return (publication - instant(modification.dateExecution)) / 86_400_000;
}
