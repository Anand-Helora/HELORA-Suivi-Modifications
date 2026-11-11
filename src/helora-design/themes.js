/**
 * Bibliothèque HELORA Design — les quatre ambiances validées par le pilote UX.
 *
 * Seule la préférence de thème est mémorisée localement (clé ci-dessous) :
 * aucune donnée métier n'est stockée. Le stockage peut être absent, plein ou
 * interdit (navigation privée, politique de sécurité) : chaque accès est
 * protégé et l'application retombe sur le thème par défaut.
 */

export const CLE_PREFERENCE = "helora-design:theme";

export const THEMES = Object.freeze([
  Object.freeze({
    cle: "clair",
    libelle: "Clair premium",
    description: "Lumineux et calme, pour un usage prolongé",
    anime: false,
    couleurNavigateur: "#eef6f6",
    schema: "light",
  }),
  Object.freeze({
    cle: "neural",
    libelle: "Neural",
    description: "Réseau de nœuds et impulsions",
    anime: true,
    couleurNavigateur: "#04161b",
    schema: "dark",
  }),
  Object.freeze({
    cle: "orbital",
    libelle: "Orbital",
    description: "Astres et trajectoires en orbite",
    anime: true,
    couleurNavigateur: "#060f1f",
    schema: "dark",
  }),
  Object.freeze({
    cle: "hybride",
    libelle: "Hybride",
    description: "Réseau neuronal en orbite",
    anime: true,
    couleurNavigateur: "#041318",
    schema: "dark",
  }),
]);

export const THEME_PAR_DEFAUT = "hybride";

/** Vrai si `cle` désigne un thème connu. */
export function estThemeValide(cle) {
  return typeof cle === "string" && THEMES.some((theme) => theme.cle === cle);
}

/** Description du thème `cle`, ou celle du thème par défaut si inconnu. */
export function themeParCle(cle) {
  return THEMES.find((theme) => theme.cle === cle) ?? THEMES.find((theme) => theme.cle === THEME_PAR_DEFAUT);
}

/**
 * Thème à appliquer au chargement : la préférence sauvegardée si elle est
 * valide, sinon le thème par défaut (Hybride). Ne lève jamais d'exception.
 * @param {Pick<Storage, "getItem"> | null | undefined} stockage
 */
export function lirePreference(stockage) {
  try {
    const valeur = stockage?.getItem(CLE_PREFERENCE);
    return estThemeValide(valeur) ? valeur : THEME_PAR_DEFAUT;
  } catch {
    return THEME_PAR_DEFAUT;
  }
}

/**
 * Sauvegarde la préférence ; renvoie `true` si l'écriture a réussi.
 * Une clé inconnue n'est jamais écrite.
 * @param {Pick<Storage, "setItem"> | null | undefined} stockage
 */
export function ecrirePreference(stockage, cle) {
  if (!estThemeValide(cle) || !stockage) return false;
  try {
    stockage.setItem(CLE_PREFERENCE, cle);
    return true;
  } catch {
    return false;
  }
}

/** Thème suivant / précédent (navigation circulaire au clavier dans le sélecteur). */
export function themeVoisin(cle, pas) {
  const index = Math.max(0, THEMES.findIndex((theme) => theme.cle === cle));
  const n = THEMES.length;
  return THEMES[(((index + pas) % n) + n) % n].cle;
}
