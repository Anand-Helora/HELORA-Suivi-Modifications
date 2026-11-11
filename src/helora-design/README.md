# HELORA Design — bibliothèque visuelle réutilisable

Cette bibliothèque est une extraction **fonctionnelle** du pilote [HELORA-UX-Pilote](https://anand-helora.github.io/HELORA-UX-Pilote/) (V4, animations Neural/Orbital corrigées en novembre 2026). Elle est indépendante du tableau de bord fictif et n'inclut ni donnée métier, ni API, ni déploiement.

## Essayer les quatre thèmes

Depuis la racine du dépôt, lancer un serveur statique, par exemple :

```bash
python -m http.server 8000
```

Puis ouvrir **http://localhost:8000/demo/helora-design/**. Le mode `file://` ne fonctionne pas avec les modules JavaScript natifs. Aucune installation de paquet n'est nécessaire. La démonstration comporte des données **entièrement fictives**.

## Intégration dans une application HTML/CSS/JavaScript

Dans `<head>` (ajuster les chemins selon l'application) :

```html
<html lang="fr" data-theme="hybride">
<head>
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#041318">
  <link rel="stylesheet" href="/src/helora-design/themes.css">
  <link rel="stylesheet" href="/src/helora-design/composants.css">
  <script src="/src/helora-design/theme-initial.js"></script>
</head>
```

Les chemins absolus ci-dessus supposent une application servie à la racine ; sous GitHub Pages avec un sous-chemin, préférer les chemins relatifs ou un build adapté.

Dans `<body class="helora-page">` :

```html
<div id="decor" class="helora-ambiance" aria-hidden="true"></div>
<div class="helora-design-contenu">
  <fieldset id="themes" class="helora-selecteur">
    <legend>Ambiance visuelle</legend>
    <label class="helora-choix"><input type="radio" name="theme" value="clair"><span>Clair premium</span></label>
    <label class="helora-choix"><input type="radio" name="theme" value="neural"><span>Neural</span></label>
    <label class="helora-choix"><input type="radio" name="theme" value="orbital"><span>Orbital</span></label>
    <label class="helora-choix"><input type="radio" name="theme" value="hybride"><span>Hybride</span></label>
  </fieldset>
  <button id="pause" type="button" class="helora-bouton helora-pause">Mettre en pause l'animation</button>
  <main class="helora-coquille">
    <section class="helora-panneau">Votre contenu métier ici.</section>
  </main>
</div>
```

Au chargement d'un script module :

```js
import { initialiserHeloraDesign } from "/src/helora-design/controleur.js";

const design = initialiserHeloraDesign({
  racine: document.documentElement,
  decor: document.getElementById("decor"),
  selecteur: document.getElementById("themes"),
  boutonPause: document.getElementById("pause"),
});
// Pour détruire proprement un écran démonté : design.detruire();
// Pour imposer un thème : design.choisirTheme("clair");
// Pour contrôler le mouvement : design.mettreEnPause(true);
```

## Fichiers et responsabilités

| Ressource | Rôle |
| --- | --- |
| `themes.js` | Quatre palettes, métadonnées et préférence locale sécurisée |
| `theme-initial.js` | Thème avant premier rendu, sans flash clair/sombre |
| `themes.css` | Jetons visuels et styles des scènes SVG originales |
| `ambiance.js` | Moteur SVG validé : trajet Neural changeant, Orbital avec traînée derrière le satellite |
| `controleur.js` | Liaison au DOM, radios, Pause/Reprise, visibilité et taille d'écran |
| `composants.css` | Coquille, panneaux, badges, KPI, boutons, selecteur (classes `helora-*`) |

Les composants sont **facultatifs** : une application peut utiliser uniquement les palettes et les scènes, ou choisir un thème fixe. Les quatre thèmes ne sont pas obligatoires pour tous les projets. Le moteur SVG est conservé dans sa version testée (plutôt qu'une réécriture risquée). Une application native Revit/AutoCAD doit utiliser les contrôles de son logiciel, pas ce CSS.

## Accessibilité, performances et limites

- Les scènes SVG sont purement décoratives et derrière le contenu ; `aria-hidden="true"`, `pointer-events:none`, aucune alerte fictive.
- `prefers-reduced-motion:reduce` suspend toutes les animations, fixe les satellites et supprime les impulsions en cours de vol. Le bouton Pause est caché dans ce mode.
- Un clic sur Pause/Reprise et l'invisibilité de l'onglet suspendent également les animations ; les itinéraires Neural changent sur les cycles CSS sans boucle JS continue.
- Les budgets de scènes sont réduits sur mobile. Les redimensionnements mineurs ne déclenchent pas de reconstruction.
- La préférence `helora-design:theme` est uniquement locale ; aucun identifiant ni donnée métier ne doit y être sauvegardé. La défaillance de `localStorage` est gérée.
- Le code CSS est destiné aux **pages documentaires classiques** : `themes.css` définit des jetons sur `:root` ; `composants.css` ne cible que les classes `helora-*` et les descendants de `.helora-page`. Vérifier l'intégration si votre application possède déjà des styles globaux.
- Les zones calmes du décor sont basées sur la composition du pilote ; inspecter le rendu réel si le nouveau produit place ses formulaires ou titres ailleurs.
- Aucun résultat ne remplace un **test navigateur** du contraste, du clavier, des animations et du comportement mobile. Les tests `npm test` valident principalement la logique et la structure, pas l'apparence réelle.

## Ce que ce template ne fait pas

Il ne publie pas automatiquement la démo sur GitHub Pages, ne crée aucun registre hospitalier et ne configure aucune connexion SharePoint, Power Apps ou GMAO. Dans un nouveau dépôt, le déploiement doit être autorisé et configuré séparément. La fusion d'une PR reste toujours humaine.
