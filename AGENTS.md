# Consignes pour les agents IA (Codex, Claude Code…)

Ce fichier décrit le comportement attendu de tout agent travaillant dans ce dépôt.

## Flux de travail

- Ne jamais pousser directement sur `main`. Claude Code travaille sur une branche `claude/*` ; les autres agents utilisent une branche dédiée à la tâche.
- Toute modification passe par une pull request claire : objectif, fichiers modifiés, commandes testées, limites.
- Ne jamais fusionner une PR, ne jamais activer l'auto-merge, ne pas modifier les paramètres ni la visibilité du dépôt. La fusion est faite manuellement par un humain.
- Lancer `npm test` avant d'ouvrir ou de mettre à jour une PR. Ne jamais désactiver, masquer ou ignorer un test pour obtenir une CI verte.
- Ne pas modifier `.github/workflows/` sauf si la tâche le demande explicitement.
- Garder les changements limités à la tâche demandée ; pas de dépendance ni de configuration superflue.
- Appliquer le **protocole de changement minimal** décrit ci-dessous.

## Protocole de changement minimal

Appliqué par Claude Code, Codex et tout agent qui modifie le dépôt. Il n'impose aucun plafond artificiel de lignes : les modifications et tests nécessaires restent autorisés.

1. **Avant de coder** : lire les fichiers et les fonctions concernés, expliquer la cause, proposer le plus petit correctif, et annoncer les fichiers à modifier.
2. **Patch ciblé par défaut** : préserver le comportement, les imports, les commentaires, la mise en forme et les API hors périmètre. Ne pas remplacer un fichier entier quand quelques lignes suffisent.
3. **Dépendances et abstractions** : ne pas ajouter de bibliothèque, de système de build, de framework ou de nouvelle architecture pour un petit correctif sans justification vérifiable.
4. **Refactoring** : le refactoring local strictement nécessaire est autorisé s'il est expliqué ; une refonte transversale est proposée séparément avec ses risques et attend la validation humaine.
5. **Contrôle du diff** : examiner `git diff`, `git diff --check`, `git diff --stat` et la liste des fichiers ; éliminer le bruit (reformatage, artefacts, captures non demandées).
6. **Rapport de PR** : détailler la cause, les modifications par fichier, la justification des fichiers ajoutés, les tests exécutés et les risques restants.
7. **UX proportionnée** : une retouche localisée ne justifie pas une refonte d'interface ou un nouveau design system ; concentrer la revue sur le composant concerné.

## Revues

- Les commentaires des relecteurs humains sont prioritaires.
- Les retours de Codex Code Review (ou d'un autre agent) sont des signaux à vérifier dans le code : les corriger s'ils sont fondés, expliquer brièvement dans la PR s'ils ne le sont pas.
- Les corrections automatiques peuvent s'enchaîner dans une session autorisée, **sans fusion automatique**. Après trois cycles de revue/correction sans conclusion satisfaisante, arrêter la boucle et solliciter une décision humaine ; ne jamais laisser deux agents se relancer indéfiniment.

## Sécurité et confidentialité

- Le dépôt est public : n'y mettre aucun secret, jeton, clé d'API, identifiant interne ni donnée réelle (patients, personnels, établissements…). Utiliser uniquement des données fictives.
- Ne pas publier de code HELORA protégé par droits d'auteur sans autorisation explicite.
- Aucun appel à une API d'IA, aucun déploiement automatique, aucun bot de fusion.

## Tests

- Code dans `src/`, tests dans `tests/` (fichiers `*.test.js`), exécutés avec `node --test` via `npm test`.
- Aucune dépendance tierce tant qu'elle n'est pas nécessaire ; les tests navigateur (Playwright…) s'ajoutent au cas par cas.

## Conception et revue UX/UI (si interface concernée)

- Lire `docs/ux-ui-guidelines.md` et le brief de l'Issue **avant** de développer une interface, un écran ou un parcours.
- Demander une **proposition UX proactive** : parcours, écrans, états, alternative argumentée et critères d'acceptation. Faire valider les arbitrages importants par l'humain ; ne pas changer les règles métier sans accord.
- Si l'environnement Claude Code prend en charge les sous-agents de projet, déléguer la conception et la revue à `.claude/agents/ux-designer.md`. Sinon, appliquer ces mêmes règles directement ; l'existence du fichier ne garantit pas son invocation automatique.
- Après implémentation, effectuer une revue UX/UI distincte de la revue de code : vérifier les parcours, états, navigation, accessibilité et **rendu réel** lorsque disponible. Sans capture ou test navigateur : écrire explicitement « revue visuelle non effectuée ».
- Documenter les observations dans la PR (`.github/pull_request_template.md`). Les suggestions non validées restent des suggestions ; aucune fusion automatique.
