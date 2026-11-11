import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CLE_PREFERENCE,
  THEMES,
  THEME_PAR_DEFAUT,
  ecrirePreference,
  estThemeValide,
  lirePreference,
  themeParCle,
  themeVoisin,
} from "../src/helora-design/themes.js";

function stockageMemoire(initial = {}) {
  const donnees = new Map(Object.entries(initial));
  return {
    getItem: (cle) => (donnees.has(cle) ? donnees.get(cle) : null),
    setItem: (cle, valeur) => donnees.set(cle, String(valeur)),
    donnees,
  };
}

const stockageInterdit = {
  getItem() {
    throw new DOMException("refusé", "SecurityError");
  },
  setItem() {
    throw new DOMException("plein", "QuotaExceededError");
  },
};

describe("liste des thèmes", () => {
  it("propose exactement les quatre ambiances, dans l'ordre du sélecteur", () => {
    assert.deepEqual(
      THEMES.map((theme) => theme.cle),
      ["clair", "neural", "orbital", "hybride"],
    );
    assert.deepEqual(
      THEMES.map((theme) => theme.libelle),
      ["Clair premium", "Neural", "Orbital", "Hybride"],
    );
  });

  it("anime Neural, Orbital et Hybride, pas Clair premium", () => {
    assert.deepEqual(
      THEMES.filter((theme) => theme.anime).map((theme) => theme.cle),
      ["neural", "orbital", "hybride"],
    );
  });

  it("utilise Hybride par défaut", () => {
    assert.equal(THEME_PAR_DEFAUT, "hybride");
    assert.ok(estThemeValide(THEME_PAR_DEFAUT));
  });

  it("est figée (aucune modification accidentelle)", () => {
    assert.ok(Object.isFrozen(THEMES));
    assert.ok(THEMES.every(Object.isFrozen));
  });
});

describe("estThemeValide / themeParCle", () => {
  it("refuse les valeurs inconnues ou non textuelles", () => {
    for (const valeur of [null, undefined, "", "sombre", "HYBRIDE", 3, {}]) {
      assert.equal(estThemeValide(valeur), false, String(valeur));
    }
  });

  it("retombe sur le thème par défaut pour une clé inconnue", () => {
    assert.equal(themeParCle("orbital").libelle, "Orbital");
    assert.equal(themeParCle("inconnu").cle, THEME_PAR_DEFAUT);
  });
});

describe("lirePreference", () => {
  it("renvoie la préférence sauvegardée si elle est valide", () => {
    assert.equal(lirePreference(stockageMemoire({ [CLE_PREFERENCE]: "clair" })), "clair");
  });

  it("renvoie Hybride sans préférence, avec une valeur corrompue ou sans stockage", () => {
    assert.equal(lirePreference(stockageMemoire()), "hybride");
    assert.equal(lirePreference(stockageMemoire({ [CLE_PREFERENCE]: "<script>" })), "hybride");
    assert.equal(lirePreference(null), "hybride");
    assert.equal(lirePreference(undefined), "hybride");
  });

  it("ne lève jamais d'exception si le stockage est interdit", () => {
    assert.equal(lirePreference(stockageInterdit), "hybride");
  });
});

describe("ecrirePreference", () => {
  it("écrit uniquement la clé de thème, sans autre donnée", () => {
    const stockage = stockageMemoire();
    assert.equal(ecrirePreference(stockage, "neural"), true);
    assert.deepEqual([...stockage.donnees.entries()], [[CLE_PREFERENCE, "neural"]]);
  });

  it("refuse une clé inconnue", () => {
    const stockage = stockageMemoire();
    assert.equal(ecrirePreference(stockage, "sombre"), false);
    assert.equal(stockage.donnees.size, 0);
  });

  it("échoue proprement si le stockage est plein, interdit ou absent", () => {
    assert.equal(ecrirePreference(stockageInterdit, "orbital"), false);
    assert.equal(ecrirePreference(null, "orbital"), false);
  });
});

describe("themeVoisin (flèches du sélecteur)", () => {
  it("parcourt les thèmes de façon circulaire", () => {
    assert.equal(themeVoisin("clair", 1), "neural");
    assert.equal(themeVoisin("hybride", 1), "clair");
    assert.equal(themeVoisin("clair", -1), "hybride");
    assert.equal(themeVoisin("orbital", -1), "neural");
  });

  it("part du premier thème si la clé est inconnue", () => {
    assert.equal(themeVoisin("inconnu", 1), "neural");
  });
});
