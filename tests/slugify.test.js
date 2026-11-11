import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { slugify } from "../src/slugify.js";

describe("slugify", () => {
  it("met en minuscules et remplace les espaces par des tirets", () => {
    assert.equal(slugify("Bonjour le Monde"), "bonjour-le-monde");
  });

  it("retire les accents et les ligatures françaises", () => {
    assert.equal(slugify("Été à l'œil, Noël"), "ete-a-l-oeil-noel");
  });

  it("supprime la ponctuation et les séparateurs en début ou fin", () => {
    assert.equal(slugify("  --Hello, World!--  "), "hello-world");
  });

  it("fusionne les séparateurs successifs", () => {
    assert.equal(slugify("a   b___c"), "a-b-c");
  });

  it("conserve les chiffres", () => {
    assert.equal(slugify("Version 2.0 (2026)"), "version-2-0-2026");
  });

  it("accepte un séparateur personnalisé", () => {
    assert.equal(slugify("Mon Fichier Final", { separator: "_" }), "mon_fichier_final");
  });

  it("respecte maxLength sans laisser de séparateur final", () => {
    assert.equal(slugify("un deux trois", { maxLength: 8 }), "un-deux");
    assert.equal(slugify("un deux trois", { maxLength: 7 }), "un-deux");
    assert.equal(slugify("un deux trois", { maxLength: 100 }), "un-deux-trois");
  });

  it("insère littéralement un séparateur contenant des motifs de remplacement", () => {
    assert.equal(slugify("hello world", { separator: "$&" }), "hello$&world");
    assert.equal(slugify("a b c", { separator: "$$" }), "a$$b$$c");
    assert.equal(slugify("a b", { separator: "$`$'" }), "a$`$'b");
  });

  it("ne conserve jamais un séparateur partiel lors de la troncature", () => {
    assert.equal(slugify("a b", { separator: "--", maxLength: 2 }), "a");
    assert.equal(slugify("a b", { separator: "--", maxLength: 3 }), "a");
    assert.equal(slugify("a b", { separator: "--", maxLength: 4 }), "a--b");
    assert.equal(slugify("un deux trois", { separator: "___", maxLength: 5 }), "un");
    assert.equal(slugify("un deux trois", { separator: "___", maxLength: 6 }), "un___d");
    assert.equal(slugify("hello world", { separator: "$&", maxLength: 6 }), "hello");
  });

  it("renvoie une chaîne vide si aucun caractère n'est exploitable", () => {
    assert.equal(slugify(""), "");
    assert.equal(slugify("!!! ??? ..."), "");
  });

  it("rejette une entrée qui n'est pas une chaîne", () => {
    assert.throws(() => slugify(42), TypeError);
    assert.throws(() => slugify(null), TypeError);
  });

  it("rejette une longueur maximale invalide", () => {
    assert.throws(() => slugify("abc", { maxLength: -1 }), RangeError);
    assert.throws(() => slugify("abc", { maxLength: Number.NaN }), RangeError);
  });
});
