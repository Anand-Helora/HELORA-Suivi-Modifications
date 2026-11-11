/*
 * Thème posé AVANT le premier rendu (script classique et synchrone, chargé
 * dans <head>) : évite un flash sombre → clair au chargement. Liste blanche
 * identique à src/themes.js (vérifiée par tests/themes.test.js). Stockage
 * indisponible ou valeur inconnue : Hybride, sans erreur.
 */
(function () {
  var themes = { clair: ["light", "#eef6f6"], neural: ["dark", "#04161b"], orbital: ["dark", "#060f1f"], hybride: ["dark", "#041318"] };
  var theme = "hybride";
  try {
    var valeur = window.localStorage.getItem("helora-design:theme");
    if (Object.prototype.hasOwnProperty.call(themes, valeur)) theme = valeur;
  } catch (e) {
    /* stockage interdit : thème par défaut */
  }
  document.documentElement.setAttribute("data-theme", theme);
  var schema = document.querySelector('meta[name="color-scheme"]');
  var couleur = document.querySelector('meta[name="theme-color"]');
  if (schema) schema.setAttribute("content", themes[theme][0]);
  if (couleur) couleur.setAttribute("content", themes[theme][1]);
})();
