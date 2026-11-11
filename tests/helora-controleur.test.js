import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initialiserHeloraDesign } from "../src/helora-design/controleur.js";

function noeud({ valeur = "" } = {}) {
  const listeners = new Map();
  const attributs = new Map();
  const classes = new Set();
  return {
    value: valeur,
    innerHTML: "",
    textContent: "",
    hidden: false,
    checked: false,
    listeners,
    attributs,
    classes,
    classList: {
      toggle(n, v) { if (v) classes.add(n); else classes.delete(n); },
      remove(...n) { n.forEach(x => classes.delete(x)); },
    },
    setAttribute(n, v) { attributs.set(n, v); },
    getAttribute(n) { return attributs.get(n); },
    addEventListener(n, fn) { listeners.set(n, fn); },
    removeEventListener(n, fn) { if (listeners.get(n) === fn) listeners.delete(n); },
    dispatch(n, event = {}) { listeners.get(n)?.(event); },
    querySelectorAll() { return []; },
  };
}

function environnement(initial = null) {
  const racine = noeud(), decor = noeud(), selecteur = noeud(), boutonPause = noeud();
  const radios = ["clair","neural","orbital","hybride"].map(valeur => noeud({ valeur }));
  selecteur.querySelectorAll = () => radios;
  const stockage = new Map(initial ? [["helora-design:theme", initial]] : []);
  const fenetre = noeud();
  Object.assign(fenetre, {
    innerWidth: 1280,
    innerHeight: 800,
    localStorage: {
      getItem: (k) => stockage.get(k) ?? null,
      setItem: (k, v) => stockage.set(k, v),
    },
  });
  const doc = noeud();
  doc.hidden = false;
  const metaSchema = noeud(), metaCouleur = noeud();
  doc.querySelector = (s) => s.includes("color-scheme") ? metaSchema : metaCouleur;
  const controleur = initialiserHeloraDesign({ racine, decor, selecteur, boutonPause, fenetre, document:doc });
  return { controleur, racine, decor, selecteur, boutonPause, radios, stockage, fenetre, doc, metaSchema, metaCouleur };
}

describe("HELORA Design : intégration indépendante du métier", () => {
  it("refuse les conteneurs manquants", () => {
    assert.throws(() => initialiserHeloraDesign({}), /obligatoires/);
  });

  it("affiche Hybride et les vraies orbites + connexions au premier rendu", () => {
    const e = environnement();
    assert.equal(e.controleur.theme, "hybride");
    assert.equal(e.racine.getAttribute("data-theme"), "hybride");
    assert.match(e.decor.innerHTML, /scene--hybride/);
    assert.match(e.decor.innerHTML, /o-planete/);
    assert.match(e.decor.innerHTML, /n-noeud/);
    assert.equal(e.decor.getAttribute("aria-hidden"), "true");
    assert.equal(e.radios.filter(x => x.checked).length, 1);
    e.controleur.detruire();
  });

  it("restaure Clair premium, bascule sans recréer le document et sauvegarde une préférence", () => {
    const e = environnement("clair");
    assert.equal(e.controleur.theme, "clair");
    assert.equal(e.boutonPause.hidden, true);
    e.selecteur.dispatch("change", {target:{value:"neural",matches:()=>true}});
    assert.equal(e.controleur.theme, "neural");
    assert.match(e.decor.innerHTML, /scene--neural/);
    assert.equal(e.stockage.get("helora-design:theme"), "neural");
    assert.equal(e.metaCouleur.getAttribute("content"), "#04161b");
    assert.equal(e.boutonPause.hidden, false);
    assert.equal(e.controleur.choisirTheme("<script>"), false);
    assert.equal(e.controleur.theme, "neural");
    e.controleur.detruire();
  });

  it("pause, reprise, suspension onglet et destruction libèrent les écouteurs", () => {
    const e = environnement();
    e.boutonPause.dispatch("click");
    assert.equal(e.controleur.enPause, true);
    assert.equal(e.boutonPause.getAttribute("aria-pressed"), "true");
    assert.ok(e.racine.classes.has("helora-design-en-pause"));
    e.doc.hidden = true;
    e.doc.dispatch("visibilitychange");
    assert.ok(e.racine.classes.has("helora-design-suspendue"));
    e.boutonPause.dispatch("click");
    assert.equal(e.controleur.enPause, false);
    e.controleur.detruire();
    assert.equal(e.decor.innerHTML, "");
    assert.equal(e.decor.listeners.has("animationiteration"), false, "animationiteration détaché");
    assert.equal(e.fenetre.listeners.has("resize"), false);
    assert.equal(e.doc.listeners.has("visibilitychange"), false);
    assert.equal(e.controleur.choisirTheme("clair"), false);
    e.controleur.detruire();
  });

  it("ne reconstruit pas le décor pour les petits changements de taille", () => {
    const e = environnement();
    const premiere = e.decor.innerHTML;
    e.fenetre.innerWidth = 1250;
    e.fenetre.dispatch("resize");
    assert.equal(e.decor.innerHTML, premiere);
    e.fenetre.innerWidth = 375;
    e.fenetre.innerHeight = 680;
    e.fenetre.dispatch("resize");
    assert.match(e.decor.innerHTML, /scene--hybride/);
    assert.notEqual(e.decor.innerHTML, premiere);
    e.controleur.detruire();
  });

  it("reste opérationnel lorsque localStorage est interdit", () => {
    const racine = noeud(), decor = noeud(), fenetre = noeud(), doc = noeud();
    fenetre.innerWidth = 800; fenetre.innerHeight = 550;
    Object.defineProperty(fenetre, "localStorage", {get() {throw new Error("stockage interdit");}});
    doc.querySelector = () => null;
    const controleur = initialiserHeloraDesign({racine, decor, fenetre, document:doc});
    assert.equal(controleur.theme, "hybride");
    assert.equal(controleur.choisirTheme("clair"), true);
    controleur.detruire();
  });
});

describe("Contrat CSS et démonstration autonome", () => {
  it("contient quatre palettes, scènes, traînée derrière le satellite et mode sans mouvement", async () => {
    const css = await readFile(new URL("../src/helora-design/themes.css", import.meta.url), "utf8");
    for(const theme of ["neural","orbital","clair","hybride"]) assert.match(css, new RegExp('data-theme="'+theme+'"'));
    assert.match(css, /stroke-dasharray: 0 88 12 0/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(css, /forced-colors: active/);
    assert.match(css, /helora-design-en-pause/);
  });
  it("le HTML de démonstration charge les ressources réelles sans scripts métier", async () => {
    const html = await readFile(new URL("../demo/helora-design/index.html", import.meta.url), "utf8");
    for(const src of ["themes.css","composants.css","theme-initial.js","demo.js"]) assert.ok(html.includes(src));
    for(const theme of ["clair","neural","orbital","hybride"]) assert.ok(html.includes('value="'+theme+'"'));
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /Démonstration|démonstration/);
    assert.doesNotMatch(html, /sharepoint\.com|graph\.microsoft\.com|<script[^>]+https?:/i);
  });
});
