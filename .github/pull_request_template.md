## Objectif et Issue liée
<!-- Lier l'Issue et résumer l'objectif livré. -->

## Modifications et tests
<!-- Ne pas déclarer « OK » si non testé. Éviter les changements hors Issue. -->
- Cause / problème :
- Modifications exactes par fichier :
- Justification de chaque fichier additionnel :
- Tests et vérifications réellement exécutés :
- Risques, limites, cas non testés :
- [ ] `git diff`, `git diff --check` et `git diff --stat` inspectés ; aucun changement sans rapport.
- [ ] Aucun refactoring transversal non validé ; aucune fusion automatique.

## UX/UI — si interface ou parcours modifié
- [ ] La proposition de design a été confrontée au brief et ses arbitrages sont documentés.
- [ ] Le parcours principal et les états pertinents (chargement, vide, erreur, succès) ont été vérifiés.
- [ ] La lisibilité, les contrastes et la navigation clavier ont été considérés.
- [ ] Le rendu sur les tailles d'écran cibles a été examiné, ou l'absence d'essai réel est signalée.
- [ ] Les améliorations suggérées sans rapport direct avec l'Issue sont documentées séparément, pas ajoutées automatiquement.

**Éléments de preuve** (captures, tests navigateur ou mention « non vérifié visuellement ») :

**Revue designer UX/UI** (blocages / points importants / suggestions ou « non effectuée ») :

## Sécurité et décision
- [ ] Aucune donnée sensible, clé, adresse interne ni capture réelle confidentielle.
- [ ] Les commentaires des agents ont été vérifiés ; la CI verte ne remplace pas la revue humaine.
- [ ] Fusion uniquement par la personne propriétaire, sans auto-merge.
