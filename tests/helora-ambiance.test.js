import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { BUDGETS, avancerRoute, brancherRoutes, construireScene, doitRegenerer, estMobile, generateur, lireRoute, tracerItineraire } from "../src/helora-design/ambiance.js";
import { CLE_PREFERENCE, THEMES } from "../src/helora-design/themes.js";

const DESKTOP = { largeur: 1280, hauteur: 800 };
const MOBILE = { largeur: 360, hauteur: 640 };
const compter = (svg, classe) => (svg.match(new RegExp(`class="${classe}[" ]`, "g")) ?? []).length;

describe("construireScene : décor sûr", () => {
  for (const { cle } of THEMES) {
    for (const format of [DESKTOP, MOBILE]) {
      it(`${cle} ${format.largeur}px : SVG sans texte, sans lien ni élément interactif`, () => {
        const svg = construireScene(cle, format);
        assert.match(svg, /^<svg class="scene scene--/);
        assert.doesNotMatch(svg, /<(text|a|foreignObject|script|image)\b/i);
        assert.doesNotMatch(svg, /tabindex|onclick|href=/i);
        // Ni rouge ni ambre (pas de connotation d'alerte).
        assert.doesNotMatch(svg, /#(f00|ff0000|ffa500|ffb4a8|e53935)/i);
      });
    }
  }

  it("renvoie une chaîne vide pour un thème inconnu", () => {
    assert.equal(construireScene("inconnu", DESKTOP), "");
  });

  it("est déterministe : même écran, même scène", () => {
    for (const { cle } of THEMES) {
      assert.equal(construireScene(cle, DESKTOP), construireScene(cle, DESKTOP));
    }
  });
});

describe("construireScene : compositions réellement distinctes", () => {
  it("Neural = réseau sans planète ; Orbital = planète sans réseau ; Hybride = les deux", () => {
    const neural = construireScene("neural", DESKTOP);
    const orbital = construireScene("orbital", DESKTOP);
    const hybride = construireScene("hybride", DESKTOP);
    assert.ok(compter(neural, "n-noeud") > 0 && compter(neural, "o-planete") === 0);
    assert.ok(compter(orbital, "o-planete") === 1 && compter(orbital, "n-noeud") === 0);
    assert.ok(compter(hybride, "o-planete") === 1 && compter(hybride, "n-noeud") > 0);
    assert.ok(compter(hybride, "impulsion impulsion--tete impulsion--arrimage") >= 1, "impulsion d'arrimage");
  });

  it("Clair premium : décor fixe, aucun élément animé", () => {
    const clair = construireScene("clair", DESKTOP);
    assert.doesNotMatch(clair, /impulsion|o-satellite|n-lien--respire|--duree/);
  });

  it("les thèmes animés contiennent des éléments en mouvement dès le départ (délais ≤ 2,5 s)", () => {
    for (const cle of ["neural", "orbital", "hybride"]) {
      const svg = construireScene(cle, DESKTOP);
      const delais = [...svg.matchAll(/class="(?:impulsion impulsion--tete[^"]*|o-satellite[^"]*)"[^>]*--delai:(-?[\d.]+)s/g)].map((m) => Number(m[1]));
      assert.ok(delais.length >= 2, cle);
      assert.ok(delais.filter((d) => d <= 2.5).length >= 2, `${cle} : ${delais}`);
    }
  });
});

describe("construireScene : budgets (batterie, lisibilité)", () => {
  it("respecte les plafonds desktop et mobile", () => {
    for (const [format, cle] of [[DESKTOP, "desktop"], [MOBILE, "mobile"]]) {
      const neural = construireScene("neural", format);
      assert.ok(compter(neural, "n-noeud") <= BUDGETS.neural[cle].noeuds);
      assert.ok(compter(neural, "impulsion impulsion--tete") <= BUDGETS.neural[cle].impulsions);
      const orbital = construireScene("orbital", format);
      // Chaque satellite existe en deux copies (arrière / avant de la planète).
      // Plus le satellite de la lune (desktop), lui aussi en deux copies.
      assert.ok(compter(orbital, "o-satellite") / 2 <= BUDGETS.orbital[cle].satellites + (BUDGETS.orbital[cle].lune ?? 0));
      const hybride = construireScene("hybride", format);
      assert.ok(compter(hybride, "n-noeud") <= BUDGETS.hybride[cle].noeuds);
      assert.ok(
        compter(hybride, "impulsion impulsion--tete") <= BUDGETS.hybride[cle].impulsions + BUDGETS.hybride[cle].arrimages,
      );
    }
  });

  it("allège nettement la scène sur mobile", () => {
    for (const cle of ["neural", "orbital", "hybride"]) {
      assert.ok(construireScene(cle, MOBILE).length < construireScene(cle, DESKTOP).length * 0.75, cle);
    }
    assert.ok(compter(construireScene("neural", MOBILE), "n-noeud") <= 12);
  });
});

describe("Neural : itinéraires changeants (Issue #8)", () => {
  // Petit réseau : 0-1, 1-2, 1-3, 2-3, 3-4, 4-0, 2-4 (aucune impasse).
  const LIENS = [[0, 1], [1, 2], [1, 3], [2, 3], [3, 4], [4, 0], [2, 4]].map(([a, b]) => ({ a, b, longueur: 100 }));
  const extremites = (l) => [LIENS[l].a, LIENS[l].b];

  it("bifurque sur de vrais liens, sans demi-tour ni répétition immédiate (même au rebouclage)", () => {
    for (let graine = 1; graine <= 40; graine++) {
      const route = tracerItineraire(LIENS, 0, 0, { etapes: 8, alea: generateur(graine) });
      assert.equal(route.length, 8);
      assert.deepEqual([route[0].lien, route[0].de, route[0].vers], [0, 0, 1], "premier saut conservé");
      route.forEach((saut, i) => {
        assert.deepEqual(extremites(saut.lien).sort(), [saut.de, saut.vers].sort(), "saut le long d'un lien existant");
        const suivant = route[(i + 1) % route.length];
        assert.notEqual(suivant.lien, saut.lien, `graine ${graine} : même lien deux fois de suite`);
        if (i + 1 < route.length) {
          assert.equal(suivant.saut, false, "réseau sans impasse : pas de saut");
          assert.equal(suivant.de, saut.vers, "repart du nœud d'arrivée (bifurcation)");
        }
      });
      assert.ok(new Set(route.map((s) => s.lien)).size >= 4, `graine ${graine} : itinéraire trop répétitif`);
    }
  });

  it("démarre un nouvel épisode ailleurs en cas d'impasse", () => {
    const liens = [{ a: 0, b: 1 }, { a: 2, b: 3 }, { a: 4, b: 5 }];
    const route = tracerItineraire(liens, 0, 0, { etapes: 4, alea: generateur(3) });
    assert.equal(route.length, 4);
    assert.equal(route[1].saut, true);
    route.forEach((s, i) => assert.notEqual(route[(i + 1) % 4].lien, s.lien));
  });

  it("la scène Neural porte un itinéraire varié par impulsion, cohérent avec son premier tracé", () => {
    for (const format of [DESKTOP, MOBILE]) {
      const svg = construireScene("neural", format);
      const tetes = [...svg.matchAll(/<path class="impulsion impulsion--tete [^>]*d="([^"]+)"[^>]*data-impulsion="(\d+)" data-route="([^"]+)"/g)];
      assert.equal(tetes.length, compter(svg, "impulsion impulsion--tete"), "chaque impulsion a un itinéraire");
      for (const [, d, cle, texte] of tetes) {
        const route = lireRoute(texte);
        assert.ok(route.length >= 4, `impulsion ${cle} : ${route.length} étapes`);
        assert.equal(`M${route[0].x1} ${route[0].y1}L${route[0].x2} ${route[0].y2}`, d);
        assert.ok(new Set(route.map((e) => `${e.x1},${e.y1},${e.x2},${e.y2}`)).size >= 3, "plusieurs liens différents");
        assert.ok(route.every((e) => e.duree > 0.5 && e.duree < 12));
        assert.match(svg, new RegExp(`<circle class="eclat[^>]*data-impulsion="${cle}"`), "éclat associé");
        assert.match(svg, new RegExp(`<path class="impulsion impulsion--trainee [^>]*data-impulsion="${cle}"`), "traîne associée");
      }
    }
    // Les autres thèmes ne sont pas concernés.
    assert.doesNotMatch(construireScene("hybride", DESKTOP), /data-route/);
  });

  it("lireRoute ignore les étapes mal formées", () => {
    assert.deepEqual(lireRoute("1 2 3 4 5;oups;6 7 8 9 1.5"), [
      { x1: 1, y1: 2, x2: 3, y2: 4, duree: 5 },
      { x1: 6, y1: 7, x2: 8, y2: 9, duree: 1.5 },
    ]);
    assert.deepEqual(lireRoute(undefined), []);
  });

  /** Éléments factices minimaux (attributs, style, animations). */
  function element(attributs = {}) {
    const animations = [{ currentTime: 1234 }];
    return {
      attributs: { ...attributs },
      dataset: {},
      styles: {},
      animations,
      setAttribute(n, v) { this.attributs[n] = v; },
      getAttribute(n) { return this.attributs[n]; },
      style: { setProperty(n, v) { this.proprietaire.styles[n] = v; } },
      getAnimations() { return animations; },
    };
  }
  function impulsionFactice() {
    const [tete, trainee, eclat] = [element(), element(), element()];
    for (const e of [tete, trainee, eclat]) e.style.proprietaire = e;
    Object.assign(tete.dataset, { impulsion: "0", route: "0 0 10 0 2;10 0 10 10 3;10 10 0 0 4" });
    tete.parentNode = { querySelector: (sel) => (sel.startsWith(".impulsion--trainee") ? trainee : sel.startsWith(".eclat") ? eclat : null) };
    return { tete, trainee, eclat };
  }

  it("avancerRoute passe au lien suivant, relance les cycles à zéro et reboucle", () => {
    const { tete, trainee, eclat } = impulsionFactice();
    assert.equal(avancerRoute(tete), true);
    assert.equal(tete.attributs.d, "M10 0L10 10");
    assert.equal(trainee.attributs.d, "M10 0L10 10");
    assert.deepEqual([eclat.attributs.cx, eclat.attributs.cy], ["10", "10"]);
    assert.equal(tete.styles["--duree"], "3s");
    assert.equal(tete.styles["--delai"], "0s");
    for (const e of [tete, trainee, eclat]) assert.equal(e.animations[0].currentTime, 0);
    avancerRoute(tete);
    avancerRoute(tete);
    assert.equal(tete.attributs.d, "M0 0L10 0", "retour à la première étape");
  });

  it("sans Web Animations, ne change rien (aucun saut possible)", () => {
    const { tete } = impulsionFactice();
    delete tete.getAnimations;
    assert.equal(avancerRoute(tete), false);
    assert.equal(tete.attributs.d, undefined);
  });

  it("arrêt / reprise : rien ne change sans fin de cycle, aucune minuterie ni boucle", () => {
    const originaux = { setTimeout, setInterval, rAF: globalThis.requestAnimationFrame };
    const interdit = () => assert.fail("aucune minuterie attendue");
    globalThis.setTimeout = interdit;
    globalThis.setInterval = interdit;
    globalThis.requestAnimationFrame = interdit;
    try {
      let ecouteur;
      brancherRoutes({ addEventListener: (type, f) => { assert.equal(type, "animationiteration"); ecouteur = f; } });
      const { tete, trainee } = impulsionFactice();
      tete.classList = { contains: (c) => c === "impulsion--tete" };
      trainee.classList = { contains: () => false };
      // En pause (ou onglet masqué, mouvement réduit) : aucun événement → aucun changement.
      assert.equal(tete.attributs.d, undefined);
      ecouteur({ target: trainee });
      assert.equal(tete.attributs.d, undefined, "la traîne ne pilote pas l'itinéraire");
      // Reprise : chaque fin de cycle avance d'une étape.
      ecouteur({ target: tete });
      assert.equal(tete.attributs.d, "M10 0L10 10");
      ecouteur({ target: tete });
      assert.equal(tete.attributs.d, "M10 10L0 0");
    } finally {
      globalThis.setTimeout = originaux.setTimeout;
      globalThis.setInterval = originaux.setInterval;
      globalThis.requestAnimationFrame = originaux.rAF;
    }
  });
});

describe("doitRegenerer / estMobile / generateur", () => {
  it("ignore les petites variations (barre d'adresse mobile)", () => {
    assert.equal(doitRegenerer({ largeur: 360, hauteur: 640 }, { largeur: 360, hauteur: 580 }), false);
    assert.equal(doitRegenerer({ largeur: 1280, hauteur: 800 }, { largeur: 1300, hauteur: 820 }), false);
  });

  it("régénère au premier rendu, au passage mobile ↔ desktop et aux grands écarts", () => {
    assert.equal(doitRegenerer(null, DESKTOP), true);
    assert.equal(doitRegenerer({ largeur: 620, hauteur: 800 }, { largeur: 590, hauteur: 800 }), true);
    assert.equal(doitRegenerer({ largeur: 1280, hauteur: 800 }, { largeur: 1920, hauteur: 1080 }), true);
  });

  it("classe 599 px en mobile et 600 px en desktop", () => {
    assert.equal(estMobile(599), true);
    assert.equal(estMobile(600), false);
  });

  it("produit une suite pseudo-aléatoire reproductible dans [0, 1[", () => {
    const a = generateur(42);
    const b = generateur(42);
    for (let i = 0; i < 50; i++) {
      const v = a();
      assert.equal(v, b());
      assert.ok(v >= 0 && v < 1);
    }
  });
});

describe("src/theme-initial.js (script de tête, sans module)", () => {
  it("utilise la même clé et la même liste blanche que src/themes.js", async () => {
    const source = await readFile(new URL("../src/helora-design/theme-initial.js", import.meta.url), "utf8");
    assert.ok(source.includes(`"${CLE_PREFERENCE}"`));
    for (const theme of THEMES) {
      assert.match(source, new RegExp(`${theme.cle}: \\["${theme.schema}", "${theme.couleurNavigateur}"\\]`));
    }
    assert.match(source, /var theme = "hybride"/);
    assert.match(source, /try \{/);
  });
});
