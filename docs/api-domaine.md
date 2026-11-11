# API du domaine métier (MVP 1/3)

Domaine JavaScript pur issu de [`specification-modele-mvp.md`](specification-modele-mvp.md). Il n'a **aucune interface**, aucun accès DOM, réseau ou stockage persistant. Les données sont **fictives**.

## Organisation

| Fichier | Rôle |
|---|---|
| `src/domaine/constantes.js` | Valeurs énumérées (origines, statuts, natures de validation, rôles provisoires). |
| `src/domaine/erreurs.js` | `ErreurDomaine` avec un `code` stable (`VALIDATION`, `TRANSITION_INTERDITE`, `GARDE_NON_SATISFAITE`, `INTROUVABLE`, `DOUBLON`, `RELATION_INVALIDE`) et des `details`. |
| `src/domaine/validation.js` | `validerOperation`, `validerModification`, … : un validateur par ensemble (10 au total). Chacun renvoie une copie figée ou lève une erreur listant tous les problèmes. |
| `src/domaine/transitions.js` | Les trois automates indépendants : travaux physiques, impact documentaire et traitement documentaire (rejet compris). |
| `src/domaine/statuts.js` | Calculs dérivés et gardes : statut documentaire affiché, statut physique dérivé d'une opération, gardes d'autorisation et de publication, compteurs, délai. |
| `src/domaine/index.js` | Point d'entrée qui réexporte tout le domaine. |
| `src/donnees/fixtures-demo.js` | Jeu fictif (`demo-…`, `SITE-DEMO`, domaines `.invalid`). |
| `src/donnees/adaptateur-memoire.js` | `creerAdaptateurMemoire()` : stockage en mémoire, réinitialisable. |

## Adaptateur en mémoire

```js
import { creerAdaptateurMemoire } from "./src/donnees/adaptateur-memoire.js";
import { calculerStatutDocumentaire } from "./src/domaine/index.js";

const donnees = creerAdaptateurMemoire();          // options : fixtures, horloge, genererId
const { modification } = donnees.declarerMaintenance(saisie, { auteurId, cleIdempotence });
calculerStatutDocumentaire(donnees.instantane(), modification.id); // "A_QUALIFIER"
```

- **Lecture** : `instantane()`, `lister(collection)`, `lire(collection, id)` et `historique(entiteType, entiteId)`. Tout ce qui est renvoyé est figé.
- **Écriture** : `declarerMaintenance`, `creerOperation`, `ajouterModification`, `corrigerModification`, `changerStatutPhysique`, `qualifierImpact`, `creerLocalisation`, `associerLocalisation`, `creerDocument`, `creerTraitement`, `preparerTraitement`, `associerTraitement`, `avancerTraitement`, `rejeterTraitement`, `ajouterJustificatif`, `enregistrerValidation` et `reinitialiser`.
- **Atomicité** : chaque écriture travaille sur un brouillon de l'état, qui n'est appliqué que si toutes les règles sont respectées. Aucune création partielle n'est donc possible, par exemple une opération sans sa modification.
- **Double clic** : `declarerMaintenance` exige une `cleIdempotence`, à générer une fois par ouverture de formulaire. Un second appel avec la même clé renvoie le premier résultat sans rien créer.
- **Historique** : chaque écriture ajoute un événement (`avant`, `apres`, `raison`). Le journal n'accepte que des ajouts, et la déclaration initiale reste consultable après une correction.
- **Persistance** : aucune. Les données vivent dans l'instance et `reinitialiser()` restaure les fixtures.

> Les `auteurId` et `roleAuMoment` sont **déclaratifs**. Les contrôles de rôle garantissent la cohérence des données de démonstration ; ils ne constituent **ni une authentification ni un contrôle d'accès**.

## Choix provisoires à confirmer

Ces interprétations sont isolées dans les constantes et les tables de transitions. Elles ne valent pas validation métier :

- Le format des références `OP-AAAA-NNNN` et `MOD-AAAA-NNNN` est provisoire.
- Les rôles, ainsi que les valeurs de décision `APPROUVEE` et `REFUSEE`, sont provisoires.
- Deux champs techniques ont été ajoutés à la modification : `exigences` (contrôle technique requis, catégories de justificatifs exigées) et `dateDecisionImpact`.
- Correspondances retenues pour le statut affiché : `SOUMIS_A_CONTROLE` et `CONTROLE_BIM` donnent `EN_CONTROLE` ; `AUTORISE` donne `EN_VALIDATION`.
- Le statut physique d'une opération reste `null` (`mixte: true`) lorsque ses modifications ont des statuts différents.

La liste complète des points ouverts figure dans la pull request de l'Issue #4.
