# Vérification de la chaîne multi-IA

Document de test lié à l'Issue #1. Il ne décrit **aucune fonctionnalité métier** : il sert uniquement à vérifier que les outils du dépôt fonctionnent ensemble.

## But du test

Vérifier de bout en bout que Claude Code, l'intégration continue GitHub Actions, la revue Codex et la validation humaine collaborent correctement sur ce dépôt, créé à partir du modèle `HELORA-Template-MultiIA`, avant le cadrage fonctionnel de l'application de suivi des modifications.

## Circuit vérifié

1. **Issue** : une personne décrit la tâche dans une Issue GitHub.
2. **Claude Code** : l'agent lit `AGENTS.md`, `CLAUDE.md` et l'Issue, travaille sur une branche dédiée `claude/*` (jamais directement sur `main`) et ouvre une pull request vers `main`.
3. **CI `npm test`** : le workflow GitHub Actions exécute les tests unitaires (`node --test`) sur la pull request.
4. **Codex** : la revue automatique Codex analyse la pull request ; ses retours sont des signaux à vérifier, pas des ordres.
5. **Validation humaine** : la personne propriétaire du dépôt relit la pull request, tranche les retours et fusionne manuellement. Aucun auto-merge n'est activé.

## Liste de contrôle après ouverture de la PR

À compléter par la personne qui valide :

- [ ] **CI** : le workflow « CI » s'est exécuté sur la PR et il est vert.
- [ ] **Revue Codex** : Codex s'est lancé automatiquement (idéalement à chaque push) et ses retours pertinents ont été traités ou justifiés.
- [ ] **Diff** : la PR ne contient que ce fichier Markdown.
- [ ] **Fusion humaine** : la PR a été fusionnée manuellement par la personne propriétaire, sans auto-merge.

## Confidentialité

Ce dépôt est **public**. Il n'emploie que des **données fictives** : aucun secret, aucun identifiant interne, aucune donnée réelle ni aucun plan HELORA n'y figure.
