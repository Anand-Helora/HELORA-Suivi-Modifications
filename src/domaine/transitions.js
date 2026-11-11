/**
 * Contrôle des transitions de statuts (spéc. § 3).
 *
 * Trois automates indépendants : travaux physiques, décision d'impact
 * documentaire et traitement documentaire. Ils ne se mélangent jamais.
 * Les gardes dépendant d'autres enregistrements (validations, justificatifs)
 * sont dans `statuts.js`.
 */

import { CODES_ERREUR, ErreurDomaine } from "./erreurs.js";

const figer = (table) =>
  Object.freeze(Object.fromEntries(Object.entries(table).map(([cle, cibles]) => [cle, Object.freeze(cibles)])));

/**
 * Travaux physiques : PLANIFIEE → EN_COURS → REALISEE ; ANNULEE terminale.
 * Lecture stricte de la spéc. : pas de saut PLANIFIEE → REALISEE, pas de retour
 * arrière, pas d'annulation d'une modification réalisée (points à confirmer).
 */
export const TRANSITIONS_PHYSIQUES = figer({
  PLANIFIEE: ["EN_COURS", "ANNULEE"],
  EN_COURS: ["REALISEE", "ANNULEE"],
  REALISEE: [],
  ANNULEE: [],
});

/**
 * Statut physique admis à la création, selon l'origine.
 * MAINTENANCE : intervention « éventuellement déjà exécutée » → tout statut non annulé.
 * CHANTIER : « enregistrée avant les travaux » → PLANIFIEE uniquement (à confirmer).
 */
export const STATUTS_PHYSIQUES_INITIAUX = figer({
  MAINTENANCE: ["PLANIFIEE", "EN_COURS", "REALISEE"],
  CHANTIER: ["PLANIFIEE"],
});

/**
 * Décision d'impact : A_QUALIFIER → MISE_A_JOUR_REQUISE | SANS_IMPACT.
 * Une décision peut être révisée entre les deux valeurs qualifiées (« une
 * décision révisée conserve sa trace ») ; le retour à A_QUALIFIER n'est pas prévu.
 */
export const TRANSITIONS_IMPACT = figer({
  A_QUALIFIER: ["MISE_A_JOUR_REQUISE", "SANS_IMPACT"],
  MISE_A_JOUR_REQUISE: ["SANS_IMPACT"],
  SANS_IMPACT: ["MISE_A_JOUR_REQUISE"],
});

/** Traitement documentaire : chaîne linéaire ; PUBLIE terminal. */
export const TRANSITIONS_TRAITEMENT = figer({
  A_PREPARER: ["EN_COURS"],
  EN_COURS: ["SOUMIS_A_CONTROLE"],
  SOUMIS_A_CONTROLE: ["CONTROLE_BIM"],
  CONTROLE_BIM: ["AUTORISE"],
  AUTORISE: ["PUBLIE"],
  PUBLIE: [],
});

/**
 * Rejet : « ramène au traitement avec motif » — interprété comme un retour à
 * EN_COURS depuis un état de contrôle ou d'autorisation (point à confirmer).
 */
export const STATUTS_TRAITEMENT_REJETABLES = Object.freeze(["SOUMIS_A_CONTROLE", "CONTROLE_BIM", "AUTORISE"]);
export const STATUT_APRES_REJET = "EN_COURS";

function verifier(table, depuis, vers, libelle) {
  const cibles = table[depuis];
  if (!cibles) {
    throw new ErreurDomaine(CODES_ERREUR.VALIDATION, `${libelle} : statut de départ inconnu « ${depuis} »`);
  }
  if (!cibles.includes(vers)) {
    throw new ErreurDomaine(
      CODES_ERREUR.TRANSITION_INTERDITE,
      `${libelle} : transition ${depuis} → ${vers} interdite`,
    );
  }
}

export function peutPasser(table, depuis, vers) {
  return Boolean(table[depuis]?.includes(vers));
}

/**
 * Vérifie un changement de statut physique.
 * @param {{ motif?: string }} [options] - ANNULEE exige un motif.
 */
export function verifierTransitionPhysique(depuis, vers, { motif } = {}) {
  verifier(TRANSITIONS_PHYSIQUES, depuis, vers, "Travaux physiques");
  if (vers === "ANNULEE" && !(typeof motif === "string" && motif.trim())) {
    throw new ErreurDomaine(CODES_ERREUR.GARDE_NON_SATISFAITE, "Une annulation doit être motivée");
  }
}

export function verifierStatutPhysiqueInitial(origine, statut) {
  const admis = STATUTS_PHYSIQUES_INITIAUX[origine];
  if (!admis) {
    throw new ErreurDomaine(CODES_ERREUR.VALIDATION, `Origine inconnue « ${origine} »`);
  }
  if (!admis.includes(statut)) {
    throw new ErreurDomaine(
      CODES_ERREUR.TRANSITION_INTERDITE,
      `Une modification ${origine} ne peut pas être créée au statut ${statut}`,
    );
  }
}

/**
 * Vérifie une décision d'impact.
 * @param {{ justification?: string }} [options] - SANS_IMPACT exige une justification.
 */
export function verifierTransitionImpact(depuis, vers, { justification } = {}) {
  verifier(TRANSITIONS_IMPACT, depuis, vers, "Impact documentaire");
  if (vers === "SANS_IMPACT" && !(typeof justification === "string" && justification.trim())) {
    throw new ErreurDomaine(CODES_ERREUR.GARDE_NON_SATISFAITE, "SANS_IMPACT exige une justification");
  }
}

export function verifierTransitionTraitement(depuis, vers) {
  verifier(TRANSITIONS_TRAITEMENT, depuis, vers, "Traitement documentaire");
}

export function verifierRejetTraitement(depuis, motif) {
  if (!STATUTS_TRAITEMENT_REJETABLES.includes(depuis)) {
    throw new ErreurDomaine(
      CODES_ERREUR.TRANSITION_INTERDITE,
      `Traitement documentaire : rejet impossible depuis ${depuis}`,
    );
  }
  if (!(typeof motif === "string" && motif.trim())) {
    throw new ErreurDomaine(CODES_ERREUR.GARDE_NON_SATISFAITE, "Un rejet doit être motivé");
  }
}
