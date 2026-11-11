/**
 * Erreurs du domaine métier.
 *
 * Toutes les violations de règles métier lèvent une `ErreurDomaine` portant
 * un `code` stable (exploitable par la future interface) et, le cas échéant,
 * la liste détaillée des problèmes détectés.
 */

export const CODES_ERREUR = Object.freeze({
  VALIDATION: "VALIDATION",
  TRANSITION_INTERDITE: "TRANSITION_INTERDITE",
  GARDE_NON_SATISFAITE: "GARDE_NON_SATISFAITE",
  INTROUVABLE: "INTROUVABLE",
  DOUBLON: "DOUBLON",
  RELATION_INVALIDE: "RELATION_INVALIDE",
});

export class ErreurDomaine extends Error {
  /**
   * @param {string} code - Un des `CODES_ERREUR`.
   * @param {string} message - Message lisible en français.
   * @param {string[]} [details] - Problèmes détaillés (un par règle violée).
   */
  constructor(code, message, details = []) {
    super(message);
    this.name = "ErreurDomaine";
    this.code = code;
    this.details = Object.freeze([...details]);
  }
}

/** Lève une erreur de validation si `problemes` n'est pas vide. */
export function exigerAucunProbleme(problemes, contexte) {
  if (problemes.length > 0) {
    throw new ErreurDomaine(
      CODES_ERREUR.VALIDATION,
      `${contexte} invalide : ${problemes.join(" ; ")}`,
      problemes,
    );
  }
}
