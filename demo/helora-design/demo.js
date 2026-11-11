import { initialiserHeloraDesign } from "../../src/helora-design/controleur.js";

initialiserHeloraDesign({
  racine: document.documentElement,
  decor: document.getElementById("decor"),
  selecteur: document.getElementById("choix-theme"),
  boutonPause: document.getElementById("pause"),
});

const bouton = document.getElementById("afficher-explication");
const explication = document.getElementById("explication");
bouton.addEventListener("click", () => {
  const afficher = explication.hidden;
  explication.hidden = !afficher;
  bouton.setAttribute("aria-expanded", String(afficher));
  bouton.textContent = afficher ? "Masquer le principe" : "Voir le principe";
});
