/**
 * Intégration légère des quatre thèmes dans une application web existante.
 * N'importe quelle application peut fournir son propre en-tête et ses données.
 * Aucun accès réseau, aucune dépendance et aucun état métier persistant.
 */
import { brancherRoutes, construireScene, doitRegenerer } from "./ambiance.js";
import { ecrirePreference, estThemeValide, lirePreference, themeParCle } from "./themes.js";

/**
 * @param {{
 *   racine: HTMLElement,
 *   decor: HTMLElement,
 *   selecteur?: HTMLElement,
 *   boutonPause?: HTMLButtonElement,
 *   fenetre?: Window,
 *   document?: Document,
 *   stockage?: Pick<Storage,'getItem'|'setItem'> | null
 * }} options
 */
export function initialiserHeloraDesign(options) {
  if (!options?.racine || !options?.decor) {
    throw new TypeError("HELORA Design : racine et decor sont obligatoires.");
  }
  const { racine, decor, selecteur = null, boutonPause = null } = options;
  const fenetre = options.fenetre ?? window;
  const doc = options.document ?? document;
  let stockage = options.stockage;
  if (stockage === undefined) {
    try { stockage = fenetre.localStorage; } catch { stockage = null; }
  }

  let actif = true;
  let pause = false;
  let themeActuel = lirePreference(stockage);
  let derniereTaille = null;
  decor.setAttribute("aria-hidden", "true");
  const detacherRoutes = brancherRoutes(decor); // Une liaison, puis nettoyage explicite.

  function taille() {
    return {
      largeur: Math.max(320, Number(fenetre.innerWidth) || 320),
      hauteur: Math.max(320, Number(fenetre.innerHeight) || 320),
    };
  }

  function dessiner() {
    if (!actif) return;
    const dimensions = taille();
    decor.innerHTML = construireScene(themeActuel, dimensions);
    derniereTaille = dimensions;
  }

  function synchroniserInterface() {
    const description = themeParCle(themeActuel);
    racine.setAttribute("data-theme", themeActuel);
    const schema = doc.querySelector('meta[name="color-scheme"]');
    const couleur = doc.querySelector('meta[name="theme-color"]');
    schema?.setAttribute("content", description.schema);
    couleur?.setAttribute("content", description.couleurNavigateur);
    if (selecteur) {
      for (const radio of selecteur.querySelectorAll('input[type="radio"][name="theme"]')) {
        radio.checked = radio.value === themeActuel;
      }
    }
    if (boutonPause) {
      boutonPause.hidden = !description.anime;
      boutonPause.setAttribute("aria-pressed", String(pause));
      boutonPause.textContent = pause ? "Reprendre l'animation" : "Mettre en pause l'animation";
    }
  }

  function choisirTheme(cle) {
    if (!actif || !estThemeValide(cle)) return false;
    themeActuel = cle;
    ecrirePreference(stockage, cle);
    synchroniserInterface();
    dessiner();
    return true;
  }

  function mettreEnPause(valeur) {
    if (!actif) return false;
    pause = Boolean(valeur);
    racine.classList.toggle("helora-design-en-pause", pause);
    synchroniserInterface();
    return pause;
  }

  const changementTheme = (event) => {
    if (event.target?.matches?.('input[type="radio"][name="theme"]')) {
      choisirTheme(event.target.value);
    }
  };
  const changementPause = () => mettreEnPause(!pause);
  const redimensionnement = () => {
    const apres = taille();
    if (doitRegenerer(derniereTaille, apres)) dessiner();
  };
  const changementVisibilite = () => {
    racine.classList.toggle("helora-design-suspendue", Boolean(doc.hidden));
  };

  selecteur?.addEventListener("change", changementTheme);
  boutonPause?.addEventListener("click", changementPause);
  fenetre.addEventListener("resize", redimensionnement);
  doc.addEventListener("visibilitychange", changementVisibilite);
  changementVisibilite();
  synchroniserInterface();
  dessiner();

  return Object.freeze({
    choisirTheme,
    mettreEnPause,
    get theme() { return themeActuel; },
    get enPause() { return pause; },
    detruire() {
      if (!actif) return;
      actif = false;
      selecteur?.removeEventListener("change", changementTheme);
      boutonPause?.removeEventListener("click", changementPause);
      fenetre.removeEventListener("resize", redimensionnement);
      doc.removeEventListener("visibilitychange", changementVisibilite);
      racine.classList.remove("helora-design-en-pause", "helora-design-suspendue");
      detacherRoutes();
      decor.innerHTML = "";
    },
  });
}
