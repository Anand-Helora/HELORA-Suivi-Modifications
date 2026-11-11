/**
 * Scènes décoratives des ambiances V4 (Issue #5) — génération pure, testée.
 *
 * Choix technique : SVG généré une fois (au changement de thème ou de taille
 * d'écran), animé uniquement par CSS (stroke-dashoffset, opacity, transform).
 * - aucune boucle JavaScript : pas de requestAnimationFrame, rien à arrêter ;
 *   la pause et `prefers-reduced-motion` se règlent en CSS ;
 * - Neural : chaque impulsion suit un itinéraire pré-calculé de liens qui se
 *   suivent (bifurcations) ; `brancherRoutes` passe au lien suivant à la fin
 *   de chaque cycle CSS (événement `animationiteration`, tiret alors hors du
 *   chemin, donc sans saut). Pause, onglet masqué ou mouvement réduit : plus
 *   d'itération, donc plus aucun changement ;
 * - géométrie calculée en pixels réels : les vitesses (px/s) sont exactes et
 *   la composition s'adapte au format (mobile portrait / desktop paysage) ;
 * - tirage pseudo-aléatoire à graine fixe : même écran → même scène
 *   (captures reproductibles, aucune variation entre deux chargements) ;
 * - budgets plafonnés, réduits sous 600 px (batterie, lisibilité).
 *
 * Mouvement : chaque « impulsion » est un tiret lumineux (tête + traîne) qui
 * parcourt un chemin `pathLength="100"`. Les satellites sont des tirets d'une
 * longueur quasi nulle à bout rond (des points) sur des ellipses. En mouvement
 * réduit, CSS supprime les animations et chaque tiret prend sa position
 * statique (`--o-fixe`) : la scène reste complète et cohérente.
 *
 * Le décor ne contient ni texte, ni chiffre, ni rouge/ambre, ni effet
 * d'alerte : il ne simule aucun état d'équipement.
 */

const MOBILE_MAX = 599;

/** Budgets par thème et par format (plafonds vérifiés par les tests). */
export const BUDGETS = Object.freeze({
  neural: { desktop: { noeuds: 26, impulsions: 9, respirations: 6, poussiere: 34 }, mobile: { noeuds: 12, impulsions: 4, respirations: 3, poussiere: 0 } },
  orbital: { desktop: { orbites: 3, satellites: 3, lune: 1, poussiere: 26 }, mobile: { orbites: 2, satellites: 2, poussiere: 10 } },
  hybride: { desktop: { noeuds: 18, impulsions: 4, arrimages: 2, satellites: 2, orbites: 2 }, mobile: { noeuds: 9, impulsions: 2, arrimages: 1, satellites: 1, orbites: 2 } },
});

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function generateur(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;
const s2 = (n) => `${Math.round(n * 100) / 100}s`;

/**
 * Zones « calmes » (le décor étant fixe, elles visent les positions au repos) :
 * [0] grand titre du tableau de bord — aucun nœud ni lien ;
 * [1] en-tête de fiche (barre Retour + identifiant + titre) — liens fins
 *     tolérés, mais ni nœud, ni impulsion, ni comète.
 */
function zonesCalmes(largeur, mobile) {
  if (mobile) {
    // Rectangles réels de la fiche en 360 px : bouton Retour, ligne repère
    // (identifiant, à gauche) et titre ; le reste de l'en-tête peut s'animer.
    return [
      { x0: 0, y0: 175, x1: largeur, y1: 265 },
      { x0: 0, y0: 196, x1: largeur, y1: 266 },
      { x0: 0, y0: 266, x1: Math.min(largeur, 250), y1: 312 },
      { x0: 0, y0: 312, x1: largeur, y1: 430 },
    ];
  }
  const colonne = Math.min(largeur, 768);
  return [
    { x0: 0, y0: 60, x1: Math.min(largeur, Math.max(0, (largeur - 1200) / 2) + 560), y1: 175 },
    { x0: (largeur - colonne) / 2 - 24, y0: 110, x1: (largeur + colonne) / 2 + 24, y1: 310 },
  ];
}

const dansZones = (x, y, zones, marge = 0) => zones.some((z) => dansZone(x, y, z, marge));
const traverseZones = (a, b, zones) => zones.some((z) => segmentTraverse(a, b, z));

function dansZone(x, y, zone, marge = 0) {
  return x > zone.x0 - marge && x < zone.x1 + marge && y > zone.y0 - marge && y < zone.y1 + marge;
}

function segmentTraverse(a, b, zone, marge = 8) {
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    if (dansZone(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, zone, marge)) return true;
  }
  return false;
}

/**
 * Nœuds répartis avec une distance minimale (aspect organique, pas de grille).
 * `accepter(x, y)` permet d'écarter des zones ou de moduler la densité.
 */
function tirerNoeuds(alea, n, largeur, hauteur, accepter) {
  const noeuds = [];
  const distanceMin = Math.sqrt((largeur * hauteur) / n) * 0.62;
  for (let essai = 0; essai < n * 60 && noeuds.length < n; essai++) {
    const x = 16 + alea() * (largeur - 32);
    const y = 16 + alea() * (hauteur - 32);
    if (!accepter(x, y, alea)) continue;
    const facteur = essai > n * 40 ? 0.6 : 1;
    if (noeuds.some((p) => Math.hypot(p.x - x, p.y - y) < distanceMin * facteur)) continue;
    noeuds.push({ x, y, liens: 0 });
  }
  return noeuds;
}

/** Relie chaque nœud à ses 2–3 plus proches voisins, sans traverser la zone calme. */
function tirerLiens(alea, noeuds, zone, longueurMax) {
  const liens = [];
  const cles = new Set();
  noeuds.forEach((a, i) => {
    const voisins = noeuds
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter((v) => v.j !== i && v.d < longueurMax)
      .sort((u, v) => u.d - v.d)
      .slice(0, alea() < 0.45 ? 3 : 2);
    for (const { j, d } of voisins) {
      const cle = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (cles.has(cle) || segmentTraverse(a, noeuds[j], zone)) continue;
      cles.add(cle);
      liens.push({ a: i, b: j, longueur: d });
      a.liens++;
      noeuds[j].liens++;
    }
  });
  return liens;
}

/* ------------------------------------------------------------------------- */
/* Impulsions : tête + traîne, même chronométrie (voir @keyframes voyage).    */
/* La tête atteint la fin du chemin à 0,466 du cycle (55 % × 100 / 118).     */
/* ------------------------------------------------------------------------- */
const FRACTION_ARRIVEE = (0.55 * 100) / 118;

function htmlImpulsion(d, { duree, delai, fixe, classe = "", attributs = "", attributsTete = "" }) {
  // Position statique (mouvement réduit) : front du tiret à `fixe` % du chemin,
  // ou hors du chemin si `fixe` est null.
  const oTete = fixe == null ? 150 : 3 - fixe;
  const oTrainee = fixe == null ? 150 : 18 - fixe;
  const temps = `--duree:${s2(duree)};--delai:${s2(delai)}`;
  return (
    `<path class="impulsion impulsion--trainee ${classe}" d="${d}" pathLength="100" style="--o-fixe:${oTrainee};${temps}"${attributs}/>` +
    `<path class="impulsion impulsion--tete ${classe}" d="${d}" pathLength="100" style="--o-fixe:${oTete};${temps}"${attributs}${attributsTete}/>`
  );
}

/** Halo qui s'allume quand une impulsion arrive (pic à 8 % de son cycle). */
function htmlEclat(x, y, rayon, duree, delaiArrivee, fixe, attributs = "") {
  return `<circle class="eclat${fixe ? " eclat--fixe" : ""}" cx="${r1(x)}" cy="${r1(y)}" r="${r1(rayon)}"${attributs} style="--duree:${s2(duree)};--delai:${s2(delaiArrivee - 0.08 * duree)}"/>`;
}

/* ------------------------------------------------------------------------- */
/* Itinéraires Neural : marche sur les liens du réseau, sans demi-tour ni     */
/* réutilisation récente d'un lien ; l'itinéraire est rejoué en boucle.       */
/* ------------------------------------------------------------------------- */
const ETAPES_ITINERAIRE = 8;
const MEMOIRE_ITINERAIRE = 3;

/**
 * Itinéraire de `etapes` sauts à partir du lien `premier` parcouru de `de`
 * vers l'autre extrémité. Chaque saut part du nœud d'arrivée du précédent
 * (bifurcation) ; si le nœud est une impasse, un nouvel épisode démarre
 * ailleurs (`saut: true`), invisible car le tiret est alors hors du chemin.
 * Le dernier saut évite aussi le premier : pas de répétition au rebouclage.
 * Renvoie [{ lien, de, vers, saut }] (indices dans `liens`).
 */
export function tracerItineraire(liens, premier, de, { etapes = ETAPES_ITINERAIRE, alea = Math.random, memoire = MEMOIRE_ITINERAIRE } = {}) {
  const autre = (l, n) => (liens[l].a === n ? liens[l].b : liens[l].a);
  const sauts = [{ lien: premier, de, vers: autre(premier, de), saut: false }];
  const pioche = (liste) => liste[Math.floor(alea() * liste.length)];
  while (sauts.length < etapes) {
    const precedent = sauts[sauts.length - 1];
    const recents = new Set(sauts.slice(-memoire).map((s) => s.lien));
    if (sauts.length === etapes - 1) recents.add(premier);
    const incidents = liens.map((_, i) => i).filter((i) => (liens[i].a === precedent.vers || liens[i].b === precedent.vers) && i !== precedent.lien);
    const neufs = incidents.filter((i) => !sauts.some((s) => s.lien === i) && !recents.has(i));
    const possibles = neufs.length ? neufs : incidents.filter((i) => !recents.has(i));
    if (possibles.length) {
      const lien = pioche(possibles);
      sauts.push({ lien, de: precedent.vers, vers: autre(lien, precedent.vers), saut: false });
      continue;
    }
    // Impasse : nouvel épisode sur un lien non récent (ou, à défaut, différent).
    const ailleurs = liens.map((_, i) => i).filter((i) => !recents.has(i));
    const lien = pioche(ailleurs.length ? ailleurs : liens.map((_, i) => i).filter((i) => i !== precedent.lien && i !== premier));
    if (lien === undefined) break; // réseau d'un seul lien : itinéraire fixe
    const depart = alea() < 0.5 ? liens[lien].a : liens[lien].b;
    sauts.push({ lien, de: depart, vers: autre(lien, depart), saut: true });
  }
  return sauts;
}

/** « x1 y1 x2 y2 durée;… » → [{ x1, y1, x2, y2, duree }]. */
export function lireRoute(texte) {
  return String(texte ?? "")
    .split(";")
    .map((etape) => etape.trim().split(/\s+/).map(Number))
    .filter((v) => v.length === 5 && v.every(Number.isFinite))
    .map(([x1, y1, x2, y2, duree]) => ({ x1, y1, x2, y2, duree }));
}

const routesLues = new WeakMap();

/**
 * Passe l'impulsion `tete` (et sa traîne et son éclat, même `data-impulsion`)
 * à l'étape suivante de son itinéraire, puis relance leurs cycles à zéro.
 * Sans Web Animations (`getAnimations`), ne change rien : un changement de
 * durée sans remise à zéro ferait sauter le tiret.
 */
export function avancerRoute(tete) {
  if (typeof tete?.getAnimations !== "function" || !tete.dataset?.route) return false;
  let route = routesLues.get(tete);
  if (!route) {
    route = lireRoute(tete.dataset.route);
    routesLues.set(tete, route);
  }
  if (route.length < 2) return false;
  const index = (Number(tete.dataset.etape ?? 0) + 1) % route.length;
  const { x1, y1, x2, y2, duree } = route[index];
  const scene = tete.parentNode;
  const cle = tete.dataset.impulsion;
  const trainee = scene?.querySelector(`.impulsion--trainee[data-impulsion="${cle}"]`);
  const eclat = scene?.querySelector(`.eclat[data-impulsion="${cle}"]`);
  tete.dataset.etape = String(index);
  for (const chemin of [trainee, tete]) {
    if (!chemin) continue;
    chemin.setAttribute("d", `M${x1} ${y1}L${x2} ${y2}`);
    chemin.style.setProperty("--duree", s2(duree));
    chemin.style.setProperty("--delai", "0s");
  }
  if (eclat) {
    eclat.setAttribute("cx", String(x2));
    eclat.setAttribute("cy", String(y2));
    eclat.style.setProperty("--duree", s2(duree));
    eclat.style.setProperty("--delai", s2((FRACTION_ARRIVEE - 0.08) * duree));
  }
  for (const element of [trainee, tete, eclat]) {
    for (const animation of element?.getAnimations?.() ?? []) animation.currentTime = 0;
  }
  return true;
}

/**
 * Écoute (une seule fois, par délégation) la fin des cycles d'impulsion dans
 * le calque `conteneur` : survit aux régénérations de scène (innerHTML).
 */
export function brancherRoutes(conteneur) {
  const changementEtape = (evenement) => {
    const cible = evenement.target;
    if (cible?.classList?.contains("impulsion--tete") && cible.dataset?.route) avancerRoute(cible);
  };
  conteneur.addEventListener("animationiteration", changementEtape);
  return () => conteneur.removeEventListener("animationiteration", changementEtape);
}

/* ------------------------------------------------------------------------- */
/* Neural : maillage irrégulier, impulsions, liens qui respirent.             */
/* ------------------------------------------------------------------------- */
function sceneNeural(largeur, hauteur, mobile) {
  const budget = BUDGETS.neural[mobile ? "mobile" : "desktop"];
  const alea = generateur(0x5eed01 + Math.round(largeur / 40) * 7 + Math.round(hauteur / 40));
  const zones = zonesCalmes(largeur, mobile);
  const zone = zones[0];
  const noeuds = tirerNoeuds(alea, budget.noeuds, largeur, hauteur, (x, y) => !dansZones(x, y, zones, 14));
  const pas = Math.sqrt((largeur * hauteur) / budget.noeuds);
  const liens = tirerLiens(alea, noeuds, zone, pas * 2.1);

  const parties = [];
  parties.push(`<defs><radialGradient id="g-eclat"><stop offset="0" stop-color="#bffaf4" stop-opacity=".95"/><stop offset=".35" stop-color="#5fd6d0" stop-opacity=".45"/><stop offset="1" stop-color="#5fd6d0" stop-opacity="0"/></radialGradient>`);
  parties.push(`<radialGradient id="g-hub"><stop offset="0" stop-color="#5fd6d0" stop-opacity=".5"/><stop offset="1" stop-color="#5fd6d0" stop-opacity="0"/></radialGradient></defs>`);

  // Plan lointain : poussière de petits nœuds (desktop), fixe.
  if (budget.poussiere) {
    const loin = [];
    for (let i = 0; i < budget.poussiere; i++) {
      const x = alea() * largeur;
      const y = alea() * hauteur;
      if (dansZones(x, y, zones)) continue;
      loin.push(`<circle class="n-poussiere" cx="${r1(x)}" cy="${r1(y)}" r="${r1(0.8 + alea() * 1.1)}"/>`);
    }
    parties.push(`<g class="plan plan--lointain">${loin.join("")}</g>`);
  }

  const proche = [];
  // Liens.
  const respirants = new Set();
  const candidats = liens.map((_, i) => i).sort(() => alea() - 0.5);
  candidats.slice(0, budget.respirations).forEach((i) => respirants.add(i));
  liens.forEach((l, i) => {
    const a = noeuds[l.a];
    const b = noeuds[l.b];
    const resp = respirants.has(i);
    const style = resp ? ` style="--duree:${s2(6 + alea() * 3.5)};--delai:${s2(-alea() * 8)}"` : "";
    proche.push(`<line class="n-lien${resp ? " n-lien--respire" : ""}" x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}"${style}/>`);
  });

  // Hubs : les nœuds les plus connectés reçoivent un halo fixe.
  const hubs = noeuds
    .map((n, i) => ({ i, l: n.liens }))
    .sort((u, v) => v.l - u.l)
    .slice(0, mobile ? 2 : 4)
    .map((h) => h.i);
  for (const i of hubs) proche.push(`<circle class="n-hub" cx="${r1(noeuds[i].x)}" cy="${r1(noeuds[i].y)}" r="${mobile ? 16 : 30}"/>`);

  // Impulsions sur les liens les plus longs (plus lisibles), départs étalés
  // dès 0,2 s pour qu'au moins 3 traversées soient visibles avant 3 s.
  const longs = liens
    .map((l, i) => ({ ...l, i }))
    .filter((l) => l.longueur > 90 && !traverseZones(noeuds[l.a], noeuds[l.b], zones))
    .sort((u, v) => v.longueur - u.longueur);
  const choisis = [];
  for (const l of longs) {
    if (choisis.length >= budget.impulsions) break;
    if (choisis.some((c) => c.a === l.a || c.b === l.b || c.a === l.b || c.b === l.a)) continue;
    choisis.push(l);
  }
  // Itinéraires : liens lisibles (assez longs) hors zones calmes ; le
  // premier saut est le lien choisi ci-dessus (composition initiale inchangée).
  const routables = liens.filter((l) => l.longueur > 60 && !traverseZones(noeuds[l.a], noeuds[l.b], zones));
  const eclats = [];
  choisis.forEach((l, k) => {
    const sens = alea() < 0.5;
    const depart = noeuds[sens ? l.a : l.b];
    const arrivee = noeuds[sens ? l.b : l.a];
    const vitesse = 150 + alea() * 80; // px/s
    const duree = l.longueur / vitesse / FRACTION_ARRIVEE + 0.2;
    const delai = 0.2 + k * 0.45 + alea() * 0.2;
    const d = `M${r1(depart.x)} ${r1(depart.y)}L${r1(arrivee.x)} ${r1(arrivee.y)}`;
    const premier = routables.findIndex((r) => r.a === l.a && r.b === l.b);
    const route = tracerItineraire(routables, premier, sens ? l.a : l.b, { alea })
      .map(({ lien, de, vers }) => {
        const [p, q] = [noeuds[de], noeuds[vers]];
        return `${r1(p.x)} ${r1(p.y)} ${r1(q.x)} ${r1(q.y)} ${Math.round((routables[lien].longueur / vitesse / FRACTION_ARRIVEE + 0.2) * 100) / 100}`;
      })
      .join(";");
    const attributs = ` data-impulsion="${k}"`;
    proche.push(htmlImpulsion(d, { duree, delai, fixe: k < 3 ? 40 + k * 15 : null, attributs, attributsTete: ` data-route="${route}"` }));
    eclats.push(htmlEclat(arrivee.x, arrivee.y, mobile ? 14 : 26, duree, delai + FRACTION_ARRIVEE * duree, k === 0, attributs));
  });
  proche.push(...eclats);

  // Nœuds par-dessus les liens.
  noeuds.forEach((n, i) => {
    const rayon = hubs.includes(i) ? 3.6 : 1.6 + ((i * 7) % 5) * 0.4;
    proche.push(`<circle class="n-noeud${hubs.includes(i) ? " n-noeud--hub" : ""}" cx="${r1(n.x)}" cy="${r1(n.y)}" r="${r1(rayon)}"/>`);
  });
  parties.push(`<g class="plan plan--proche">${proche.join("")}</g>`);
  return parties.join("");
}

/* ------------------------------------------------------------------------- */
/* Orbital : planète, orbites inclinées, satellites qui passent DERRIÈRE le   */
/* disque puis devant lui (copie avant découpée sur la demi-ellipse avant).   */
/* ------------------------------------------------------------------------- */
const INCLINAISON = 18;

function geometriePlanete(largeur, hauteur, mobile, { echelle = 1, cx, cy } = {}) {
  const base = mobile ? largeur * 0.5 : Math.max(largeur, hauteur) * 0.26;
  return {
    cx: cx ?? (mobile ? largeur * 0.8 : largeur * 0.86),
    cy: cy ?? (mobile ? hauteur * 0.86 : hauteur * 0.9),
    r: base * echelle,
  };
}

function defsPlanete(prefixe) {
  return (
    `<radialGradient id="${prefixe}-planete" cx=".32" cy=".28" r=".85">` +
    `<stop offset="0" stop-color="#11707a"/><stop offset=".45" stop-color="#065461"/><stop offset=".8" stop-color="#03303a"/><stop offset="1" stop-color="#021a21"/></radialGradient>` +
    `<radialGradient id="${prefixe}-atmo" cx=".5" cy=".5" r=".5"><stop offset=".86" stop-color="#5fd6d0" stop-opacity="0"/><stop offset=".93" stop-color="#5fd6d0" stop-opacity=".22"/><stop offset="1" stop-color="#5fd6d0" stop-opacity="0"/></radialGradient>`
  );
}

function htmlPlanete(p, prefixe) {
  return (
    `<circle class="o-atmosphere" cx="${r1(p.cx)}" cy="${r1(p.cy)}" r="${r1(p.r * 1.12)}" fill="url(#${prefixe}-atmo)"/>` +
    `<circle class="o-planete" cx="${r1(p.cx)}" cy="${r1(p.cy)}" r="${r1(p.r)}" fill="url(#${prefixe}-planete)"/>` +
    // Liseré éclairé (arc haut-gauche), sans texture ni reflet.
    `<path class="o-lisere" d="${arc(p.cx, p.cy, p.r - 1.5, 200, 300)}"/>`
  );
}

function arc(cx, cy, r, de, a) {
  const p = (deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const [x0, y0] = p(de);
  const [x1, y1] = p(a);
  return `M${r1(x0)} ${r1(y0)}A${r1(r)} ${r1(r)} 0 0 1 ${r1(x1)} ${r1(y1)}`;
}

/**
 * Orbites + satellites autour de la planète `p`. Renvoie [arrière, avant] :
 * l'arrière est dessiné avant la planète (masqué par le disque), l'avant
 * après, découpé à la demi-ellipse avant (y local > 0).
 */
function systemeOrbital(p, { orbites, satellites, prefixe, balayage = true, alea }) {
  const facteurs = [1.42, 1.9, 2.5].slice(0, orbites);
  const durees = [16, 27, 43];
  const departs = [0.62, 0.15, 0.4]; // position initiale (fraction du tour), dans la partie visible
  const arriere = [];
  const avant = [];
  const transforme = `translate(${r1(p.cx)} ${r1(p.cy)}) rotate(${INCLINAISON})`;
  facteurs.forEach((f, i) => {
    const rx = p.r * f;
    const ry = rx * 0.3;
    const ellipse = (classe, style = "") => `<ellipse class="${classe}" rx="${r1(rx)}" ry="${r1(ry)}" pathLength="100"${style}/>`;
    arriere.push(ellipse(`o-orbite o-orbite--${i + 1}`));
    avant.push(ellipse(`o-orbite o-orbite--${i + 1}`));
    if (i < satellites) {
      const duree = durees[i] + (alea ? alea() * 2 : 0);
      const style = ` style="--duree:${s2(duree)};--delai:${s2(-departs[i] * duree)};--o-fixe:${r1(-departs[i] * 100 - 8)}"`;
      for (const cible of [arriere, avant]) {
        cible.push(ellipse(`o-trainee o-trainee--${i + 1}`, style));
        cible.push(ellipse(`o-aura o-aura--${i + 1}`, style));
        cible.push(ellipse(`o-satellite o-satellite--${i + 1}`, style));
      }
    }
    if (i === 0 && balayage) {
      const style = ` style="--duree:9s;--delai:-2s;--o-fixe:-30"`;
      arriere.push(ellipse("o-balayage", style));
      avant.push(ellipse("o-balayage", style));
    }
  });
  const coupe = `${prefixe}-avant`;
  const rxMax = p.r * facteurs[facteurs.length - 1] + 20;
  return {
    defs: `<clipPath id="${coupe}" clipPathUnits="userSpaceOnUse"><rect x="${r1(-rxMax)}" y="0" width="${r1(rxMax * 2)}" height="${r1(rxMax)}"/></clipPath>`,
    arriere: `<g transform="${transforme}">${arriere.join("")}</g>`,
    avant: `<g transform="${transforme}"><g clip-path="url(#${coupe})">${avant.join("")}</g></g>`,
  };
}

function poussiere(alea, n, largeur, hauteur, eviter) {
  const points = [];
  for (let i = 0; i < n * 3 && points.length < n; i++) {
    const x = alea() * largeur;
    const y = alea() * hauteur;
    if (eviter(x, y)) continue;
    points.push(`<circle class="o-poussiere" cx="${r1(x)}" cy="${r1(y)}" r="${r1(0.6 + alea() * 1)}"/>`);
  }
  return points.join("");
}

function sceneOrbital(largeur, hauteur, mobile) {
  const budget = BUDGETS.orbital[mobile ? "mobile" : "desktop"];
  const alea = generateur(0x0b17a1 + Math.round(largeur / 40));
  const p = geometriePlanete(largeur, hauteur, mobile);
  const systeme = systemeOrbital(p, { orbites: budget.orbites, satellites: budget.satellites, prefixe: "o", alea });
  // Lune (desktop) : petite sphère dans la marge gauche, avec son propre
  // satellite rapide (9 s par tour) — un mouvement net là où l'écran est libre.
  let lune = "";
  if (!mobile) {
    // Bande libre en haut à droite (visible sur le tableau de bord comme sur
    // la fiche) quand l'écran est assez large ; sinon marge gauche basse.
    const r = Math.min(42, Math.max(largeur, hauteur) * 0.032);
    const large = largeur >= 1180;
    const l = large ? { cx: largeur - Math.max(130, (largeur - 1200) / 2 + 40), cy: 150, r: r * 0.85 } : { cx: largeur * 0.09, cy: hauteur * 0.74, r };
    const style = ` style="--duree:9s;--delai:-6.3s;--o-fixe:-30"`;
    const anneau = (classe, st = "") => `<ellipse class="${classe}" rx="${r1(l.r * 2.3)}" ry="${r1(l.r * 2.3 * 0.36)}" pathLength="100"${st}/>`;
    const t = `translate(${r1(l.cx)} ${r1(l.cy)}) rotate(-24)`;
    lune =
      `<g class="plan plan--lune"><g transform="${t}">${anneau("o-orbite o-orbite--1")}${anneau("o-trainee o-trainee--3", style)}${anneau("o-satellite o-satellite--3", style)}</g>` +
      `<circle class="o-lune" cx="${r1(l.cx)}" cy="${r1(l.cy)}" r="${r1(l.r)}" fill="url(#o-planete)"/>` +
      `<g transform="${t}"><g clip-path="url(#o-avant-lune)">${anneau("o-trainee o-trainee--3", style)}${anneau("o-satellite o-satellite--3", style)}</g></g></g>`;
    lune = lune.replace("<g class=\"plan plan--lune\">", `<defs><clipPath id="o-avant-lune" clipPathUnits="userSpaceOnUse"><rect x="${r1(-l.r * 3)}" y="0" width="${r1(l.r * 6)}" height="${r1(l.r * 3)}"/></clipPath></defs><g class="plan plan--lune">`);
  }
  return (
    `<defs>${defsPlanete("o")}${systeme.defs}</defs>` +
    `<g class="plan plan--lointain">${poussiere(alea, budget.poussiere, largeur, hauteur, (x, y) => Math.hypot(x - p.cx, y - p.cy) < p.r * 1.1)}</g>` +
    lune +
    systeme.arriere +
    htmlPlanete(p, "o") +
    systeme.avant
  );
}

/* ------------------------------------------------------------------------- */
/* Hybride : constellation en éventail vers une planète ; des impulsions      */
/* « s'arriment » à l'orbite et poursuivent leur course dessus (un seul      */
/* chemin segment + arc : synchronisation garantie).                          */
/* ------------------------------------------------------------------------- */
function pointEllipse(p, rx, ry, angle) {
  const a = (angle * Math.PI) / 180;
  const i = (INCLINAISON * Math.PI) / 180;
  const x = rx * Math.cos(a);
  const y = ry * Math.sin(a);
  return { x: p.cx + x * Math.cos(i) - y * Math.sin(i), y: p.cy + x * Math.sin(i) + y * Math.cos(i) };
}

function sceneHybride(largeur, hauteur, mobile) {
  const budget = BUDGETS.hybride[mobile ? "mobile" : "desktop"];
  const alea = generateur(0x4b1d + Math.round(largeur / 40) * 3 + Math.round(hauteur / 40));
  const zones = zonesCalmes(largeur, mobile);
  const zone = zones[0];
  const p = geometriePlanete(largeur, hauteur, mobile, { echelle: mobile ? 0.62 : 0.72, cx: largeur * (mobile ? 0.78 : 0.84), cy: hauteur * (mobile ? 0.84 : 0.8) });
  const systeme = systemeOrbital(p, { orbites: budget.orbites, satellites: budget.satellites, prefixe: "h", balayage: false, alea });
  const rxExt = p.r * 1.9;
  const ryExt = rxExt * 0.3;

  // Constellation : dense en haut à gauche, s'éclaircit vers la planète.
  const diagonale = Math.hypot(largeur, hauteur);
  const noeuds = tirerNoeuds(alea, budget.noeuds, largeur, hauteur, (x, y, a) => {
    if (dansZones(x, y, zones, 14)) return false;
    if (Math.hypot(x - p.cx, y - p.cy) < rxExt * 1.05) return false;
    const proximite = Math.hypot(x - p.cx, y - p.cy) / diagonale; // 0 près de la planète
    return a() < 0.25 + proximite;
  });
  const pas = Math.sqrt((largeur * hauteur) / budget.noeuds);
  const liens = tirerLiens(alea, noeuds, zone, pas * 2.2);

  const parties = [];
  parties.push(`<defs>${defsPlanete("h")}${systeme.defs}<radialGradient id="g-eclat"><stop offset="0" stop-color="#bffaf4" stop-opacity=".95"/><stop offset=".35" stop-color="#5fd6d0" stop-opacity=".45"/><stop offset="1" stop-color="#5fd6d0" stop-opacity="0"/></radialGradient></defs>`);
  parties.push(systeme.arriere);
  parties.push(htmlPlanete(p, "h"));
  parties.push(systeme.avant);

  const reseau = [];
  for (const l of liens) {
    const a = noeuds[l.a];
    const b = noeuds[l.b];
    reseau.push(`<line class="n-lien" x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}"/>`);
  }

  // Arrimages : des nœuds les plus proches de l'orbite extérieure vers un
  // point tangent (partie haute-gauche, visible), puis un quart d'orbite.
  const angles = mobile ? [212] : [196, 238];
  const eclats = [];
  const amarres = noeuds
    .map((n, i) => ({ i, d: Math.hypot(n.x - p.cx, n.y - p.cy) }))
    .sort((u, v) => u.d - v.d);
  const pris = new Set();
  angles.slice(0, budget.arrimages).forEach((angle, k) => {
    const cible = pointEllipse(p, rxExt, ryExt, angle);
    const amarre = amarres.find((a) => !pris.has(a.i) && !traverseZones(noeuds[a.i], cible, zones));
    if (!amarre || dansZones(cible.x, cible.y, zones)) return;
    pris.add(amarre.i);
    const n = noeuds[amarre.i];
    reseau.push(`<line class="n-lien n-lien--arrimage" x1="${r1(n.x)}" y1="${r1(n.y)}" x2="${r1(cible.x)}" y2="${r1(cible.y)}"/>`);
    // Sens de l'arc : celui qui prolonge la direction du lien.
    const suivant = pointEllipse(p, rxExt, ryExt, angle + 2);
    const dot = (suivant.x - cible.x) * (cible.x - n.x) + (suivant.y - cible.y) * (cible.y - n.y);
    const sens = dot >= 0 ? 1 : -1;
    const points = [];
    for (let s = 1; s <= 12; s++) points.push(pointEllipse(p, rxExt, ryExt, angle + sens * s * 7));
    const d = `M${r1(n.x)} ${r1(n.y)}L${r1(cible.x)} ${r1(cible.y)}` + points.map((q) => `L${r1(q.x)} ${r1(q.y)}`).join("");
    const longueurLien = Math.hypot(cible.x - n.x, cible.y - n.y);
    let longueurArc = 0;
    let precedent = cible;
    for (const q of points) {
      longueurArc += Math.hypot(q.x - precedent.x, q.y - precedent.y);
      precedent = q;
    }
    const total = longueurLien + longueurArc;
    const duree = total / 210 / FRACTION_ARRIVEE + 0.6;
    const delai = 0.3 + k * 1.6;
    reseau.push(htmlImpulsion(d, { duree, delai, fixe: k === 0 ? (longueurLien / total) * 100 + 4 : null, classe: "impulsion--arrimage" }));
    eclats.push(htmlEclat(cible.x, cible.y, mobile ? 14 : 28, duree, delai + FRACTION_ARRIVEE * duree * (longueurLien / total), k === 0));
  });

  // Impulsions internes au réseau.
  const internes = liens
    .filter((l) => l.longueur > 90 && !traverseZones(noeuds[l.a], noeuds[l.b], zones))
    .sort((u, v) => v.longueur - u.longueur)
    .slice(0, budget.impulsions);
  internes.forEach((l, k) => {
    const a = noeuds[l.a];
    const b = noeuds[l.b];
    const duree = l.longueur / (160 + alea() * 60) / FRACTION_ARRIVEE + 0.4;
    const delai = 0.9 + k * 0.7;
    reseau.push(htmlImpulsion(`M${r1(a.x)} ${r1(a.y)}L${r1(b.x)} ${r1(b.y)}`, { duree, delai, fixe: k === 0 ? 55 : null }));
    eclats.push(htmlEclat(b.x, b.y, mobile ? 12 : 24, duree, delai + FRACTION_ARRIVEE * duree, false));
  });
  reseau.push(...eclats);
  noeuds.forEach((n, i) => {
    reseau.push(`<circle class="n-noeud" cx="${r1(n.x)}" cy="${r1(n.y)}" r="${r1(1.6 + ((i * 5) % 4) * 0.5)}"/>`);
  });
  parties.push(`<g class="plan plan--proche">${reseau.join("")}</g>`);
  return parties.join("");
}

/* ------------------------------------------------------------------------- */
/* Clair premium : décor FIXE (deux arcs d'orbite fins, quelques points).     */
/* Choix motivé : variante opérationnelle pour forte luminosité, usage        */
/* prolongé ou besoin de calme ; elle garde l'ADN graphique sans mouvement.   */
/* ------------------------------------------------------------------------- */
function sceneClair(largeur, hauteur, mobile) {
  const alea = generateur(0xc1a1 + Math.round(largeur / 40));
  const p = { cx: largeur * (mobile ? 1 : 0.92), cy: hauteur * (mobile ? -0.02 : -0.08), r: Math.max(largeur, hauteur) * (mobile ? 0.5 : 0.32) };
  const points = [];
  for (let i = 0; i < (mobile ? 4 : 7); i++) {
    const angle = 100 + i * (mobile ? 22 : 13) + alea() * 6;
    const q = pointEllipse(p, p.r * 1.25, p.r * 1.25 * 0.3, angle);
    points.push(`<circle class="c-point" cx="${r1(q.x)}" cy="${r1(q.y)}" r="${r1(1.8 + alea() * 1.4)}"/>`);
  }
  const transforme = `translate(${r1(p.cx)} ${r1(p.cy)}) rotate(${INCLINAISON})`;
  return (
    `<g transform="${transforme}"><ellipse class="c-arc c-arc--1" rx="${r1(p.r * 1.25)}" ry="${r1(p.r * 1.25 * 0.3)}"/>` +
    `<ellipse class="c-arc c-arc--2" rx="${r1(p.r * 1.7)}" ry="${r1(p.r * 1.7 * 0.3)}"/></g>` +
    points.join("")
  );
}

const SCENES = { clair: sceneClair, neural: sceneNeural, orbital: sceneOrbital, hybride: sceneHybride };

/** Vrai si le format est traité comme mobile (budgets réduits). */
export function estMobile(largeur) {
  return largeur <= MOBILE_MAX;
}

/**
 * Balisage SVG de la scène du thème `theme` pour un écran `largeur × hauteur`
 * (pixels CSS). Thème inconnu : chaîne vide (aucun décor).
 */
export function construireScene(theme, { largeur, hauteur }) {
  const fabrique = SCENES[theme];
  if (!fabrique) return "";
  const l = Math.max(320, Math.round(largeur));
  const h = Math.max(320, Math.round(hauteur));
  const contenu = fabrique(l, h, estMobile(l));
  return `<svg class="scene scene--${theme}" viewBox="0 0 ${l} ${h}" preserveAspectRatio="xMidYMid slice" focusable="false">${contenu}</svg>`;
}

/**
 * La scène doit-elle être régénérée après un redimensionnement ? Non pour les
 * petites variations (barre d'adresse mobile) : `slice` les absorbe.
 */
export function doitRegenerer(avant, apres) {
  if (!avant) return true;
  if (estMobile(avant.largeur) !== estMobile(apres.largeur)) return true;
  return Math.abs(avant.largeur - apres.largeur) > 80 || Math.abs(avant.hauteur - apres.hauteur) > avant.hauteur * 0.25;
}
