/**
 * Valeurs énumérées du modèle MVP (docs/specification-modele-mvp.md).
 *
 * Les listes marquées « provisoire » correspondent à des points ouverts de la
 * spécification (§ 9) : elles reprennent uniquement ce que la spécification
 * nomme explicitement et devront être confirmées.
 */

const liste = (...valeurs) => Object.freeze(valeurs);

export const ORIGINES = liste("MAINTENANCE", "CHANTIER");

/** Travaux physiques : jamais confondus avec les états documentaires. */
export const STATUTS_PHYSIQUES = liste("PLANIFIEE", "EN_COURS", "REALISEE", "ANNULEE");

/** Décision d'impact documentaire d'une modification. */
export const IMPACTS_DOCUMENTAIRES = liste("A_QUALIFIER", "MISE_A_JOUR_REQUISE", "SANS_IMPACT");

/** Statuts d'un traitement documentaire (une révision de document). */
export const STATUTS_TRAITEMENT = liste(
  "A_PREPARER",
  "EN_COURS",
  "SOUMIS_A_CONTROLE",
  "CONTROLE_BIM",
  "AUTORISE",
  "PUBLIE",
);

/** Statut documentaire affiché d'une modification : toujours calculé. */
export const STATUTS_DOCUMENTAIRES_AFFICHES = liste(
  "A_QUALIFIER",
  "SANS_IMPACT_EN_ATTENTE",
  "SANS_IMPACT_VALIDE",
  "DOCUMENT_NON_IDENTIFIE",
  "A_PREPARER",
  "EN_COURS",
  "EN_CONTROLE",
  "EN_VALIDATION",
  "A_JOUR",
);

export const TYPES_LOCALISATION = liste("LOCAL", "ZONE");
export const MODES_IDENTIFICATION = liste("QR_SIMULE", "RECHERCHE", "ZONE");
export const TYPES_DOCUMENT = liste("DWG", "RVT", "PDF", "AUTRE");
export const ORIGINES_DOCUMENT = liste("PRISME_SIMULE", "MANUEL");

export const CIBLES_JUSTIFICATIF = liste("OPERATION", "MODIFICATION", "TRAITEMENT");
export const CATEGORIES_JUSTIFICATIF = liste("PHOTO", "CROQUIS", "AS_BUILT", "AUTRE");

export const CIBLES_VALIDATION = liste("MODIFICATION", "TRAITEMENT");
export const NATURES_VALIDATION = liste("TECHNIQUE", "BIM", "FINALE", "SANS_IMPACT");

/** Provisoire : la spécification parle de « décision » et de « refus » sans nommer les valeurs. */
export const DECISIONS_VALIDATION = liste("APPROUVEE", "REFUSEE");

/**
 * Provisoire : seuls les rôles cités par la spécification. La liste définitive
 * des rôles est un point ouvert (le rôle habilité au contrôle BIM n'est pas
 * nommé : il n'est donc pas contraint). Ces rôles sont déclaratifs (démonstration) :
 * ils ne constituent en aucun cas une authentification ni un contrôle d'accès.
 */
export const ROLES = liste(
  "AGENT_MAINTENANCE",
  "CHEF_PROJET",
  "RESPONSABLE_MAINTENANCE",
  "RESPONSABLE_TECHNIQUE",
);

/** Rôle requis pour la validation finale / sans impact, selon l'origine (spéc. § 2 et § 3). */
export const ROLE_RESPONSABLE_PAR_ORIGINE = Object.freeze({
  CHANTIER: "CHEF_PROJET",
  MAINTENANCE: "RESPONSABLE_MAINTENANCE",
});

/**
 * Cible autorisée pour chaque nature de validation (interprétation de la spéc. :
 * contrôle technique et « sans impact » portent sur une modification, contrôle
 * BIM et autorisation finale sur un traitement documentaire — garde n° 5).
 */
export const CIBLE_PAR_NATURE = Object.freeze({
  TECHNIQUE: "MODIFICATION",
  SANS_IMPACT: "MODIFICATION",
  BIM: "TRAITEMENT",
  FINALE: "TRAITEMENT",
});
