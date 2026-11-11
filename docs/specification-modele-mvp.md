# HELORA-Suivi-Modifications — Spécification fonctionnelle et modèle de données du MVP

> **Statut : proposition de conception à valider avant développement.** Cette spécification synthétise les arbitrages fonctionnels déjà acceptés ; les points non tranchés sont signalés explicitement. Ce document ne valide aucune connexion aux systèmes internes. Le dépôt est public : **données fictives uniquement**.

## 1. Objectif, périmètre et exclusions

Tracer les changements **physiques** des bâtiments et leur prise en compte dans les **documents et maquettes** (DWG, RVT, PDF et autres références), en distinguant clairement les deux états. Mesurer les travaux réalisés dont les supports documentaires ne sont pas encore à jour.

Deux entrées dans **un seul registre** :
- **MAINTENANCE** : intervention éventuellement déjà exécutée, déclaration rapide puis qualification.
- **CHANTIER** : opération enregistrée **avant** les travaux, puis avancement, réception des pièces as-built et traitement documentaire.

La première version comprend les opérations, leurs modifications, les localisations flexibles, les documents associés, les justificatifs, le contrôle technique, le contrôle d'intégration BIM, les validations et la traçabilité. Une modification peut être déclarée **sans impact documentaire**, mais seulement avec justification et validation.

**Hors périmètre MVP :** gestion autonome des documents manquants/obsolètes, édition DWG/RVT, synchronisation SharePoint/HEL-ISE/PRISME/GMAO, ingestion de vrais dossiers as-built, authentification et autorisations de production, publication effective dans PRISME, notifications et caméra QR réelle. Des *substituts simulés* peuvent illustrer la recherche documentaire et le scan QR. Les données sont strictement fictives.

## 2. Modèle conceptuel (10 ensembles)

| Entité logique | Champs structurants (proposition) | Relations et invariants |
|---|---|---|
| **Operation** | `id` immuable, `reference`, `origine` (`MAINTENANCE`/`CHANTIER`), `titre`, `description`, `dateCreation`, `dateDebutPrevue?`, `responsableId?`, `referenceProjet?`, `gmaoSysteme?`, `gmaoNumeroOT?`, `gmaoUrl?` | 1 opération → N modifications. GMAO facultative, jamais clé primaire. `reference` lisible ≠ `id`. |
| **Modification** | `id`, `operationId`, `reference`, `titre`, `description`, `disciplineCode?`, `declareParId`, `dateDeclaration`, `dateExecution?`, `statutPhysique`, `impactDocumentaire`, `justificationSansImpact?` | Une modification appartient à 1 opération. Statut des travaux **indépendant** de la publication documentaire. |
| **Localisation** | `id`, `type` (`LOCAL`/`ZONE`), `site`, `bloc?`, `etage?`, `codeLocal?`, `referenceHelIse?`, `descriptionZone?` | Référence HEL-ISE stable quand disponible ; une zone technique est possible sans local précis. |
| **ModificationLocalisation** | `modificationId`, `localisationId`, `modeIdentification` (`QR_SIMULE`/`RECHERCHE`/`ZONE`) | Relation N↔N sans duplications. Une modification validée doit comporter au moins une localisation. |
| **Document** | `id`, `referenceStable`, `type` (`DWG`/`RVT`/`PDF`/`AUTRE`), `origine` (`PRISME_SIMULE`/`MANUEL`), `indiceConnu?`, `titre?`, `uriExterne?` | Un document peut servir à plusieurs modifications. La référence **et** l'indice doivent être explicités. Les URI de démo ne contiennent aucune ressource interne. |
| **TraitementDocumentaire** | `id`, `documentId`, `indiceDepart?`, `indiceCible?`, `assigneAId?`, `statut`, `dateDemande`, `dateSoumission?`, `datePublication?` | Une tâche de révision documentaire peut intégrer plusieurs modifications. Plusieurs traitements successifs d'un même document sont possibles. |
| **ModificationTraitement** | `modificationId`, `traitementId` | Relation N↔N : une même révision traite plusieurs modifications. Une association unique par paire. |
| **Justificatif** | `id`, `cibleType` (`OPERATION`/`MODIFICATION`/`TRAITEMENT`), `cibleId`, `categorie` (`PHOTO`/`CROQUIS`/`AS_BUILT`/`AUTRE`), `libelle`, `referenceFichierDemo?`, `deposeParId`, `dateDepot` | Un justificatif est référencé sans stockage réel de fichier dans le MVP. Les pièces exigées sont déterminées lors de la qualification, pas universellement obligatoires à la déclaration. |
| **Validation** | `id`, `cibleType` (`MODIFICATION`/`TRAITEMENT`), `cibleId`, `nature` (`TECHNIQUE`/`BIM`/`FINALE`/`SANS_IMPACT`), `decision`, `auteurId`, `roleAuMoment`, `date`, `commentaire?` | **Technique** : conformité à l'exécution ; **BIM** : conformité de l'intégration ; **finale** : chef de projet (chantier) ou responsable maintenance (maintenance). `SANS_IMPACT` exige justification et validation par le responsable de la source. |
| **EvenementHistorique** | `id`, `entiteType`, `entiteId`, `action`, `auteurId`, `horodatage`, `avant?`, `apres?`, `raison?` | Historique **ajout seul** : les corrections ne détruisent pas la déclaration initiale. Pas de mot de passe, données sensibles ou gros fichiers dans l'historique. |

Les acteurs sont référencés par un identifiant de démonstration `acteurId` (jeu fictif) ; la future identité/gestion des droits est un chantier distinct. **Ne jamais prétendre qu'un sélecteur de rôle côté navigateur constitue une authentification.**

### Règles d'identification

- `id` : identifiant opaque immuable (UUID dans un stockage réel ; identifiants statiques uniques dans les fixtures).
- `reference` : numéro lisible réservé une fois l'enregistrement créé (par ex. `OP-2026-0001`, `MOD-2026-0001`), jamais réutilisé pour déduire l'identité.
- Local HEL-ISE fictif typique : `CHJ/A/N00/001` ; les étages doivent être normalisés de façon cohérente avec le référentiel avant un futur branchement.
- Les dates d'événement sont en ISO 8601 avec fuseau ; la date civile affichée est calculée selon la locale (Belgique). Ne pas inventer de date de réalisation.
- Chaque élément possède une origine et une provenance ; les révisions de documents conservent l'indice de départ et l'indice cible. Une publication est une **action tracée**, pas la simple mise à jour d'un champ.

## 3. Statuts et règles de passage

### Travaux physiques (par modification)

`PLANIFIEE` → `EN_COURS` → `REALISEE` ; `ANNULEE` est terminale et motivée. Une déclaration de maintenance **après réalisation** peut être directement créée en `REALISEE`. Le statut global des travaux de l'opération est **dérivé** des modifications, pas édité indépendamment : cela évite deux vérités concurrentes.

### Impact documentaire (par modification)

`A_QUALIFIER` → `MISE_A_JOUR_REQUISE` **ou** `SANS_IMPACT`. Le passage à `SANS_IMPACT` exige une justification conservée et une validation `SANS_IMPACT` par le chef de projet ou le responsable maintenance selon l'origine. Une décision révisée conserve sa trace.

### Traitement documentaire (par révision)

`A_PREPARER` → `EN_COURS` → `SOUMIS_A_CONTROLE` → `CONTROLE_BIM` → `AUTORISE` → `PUBLIE`. Un rejet ramène au traitement avec motif et évènement d'historique. **La présence d'un fichier ne suffit pas à marquer `PUBLIE`.**

Gardes avant publication :
1. Les modifications couvertes sont réalisées et leur état technique est attesté par le responsable technique compétent, si ce contrôle a été défini comme requis.
2. Les justificatifs applicables (photos/croquis/as-built selon l'opération) sont fournis et vérifiés ; une déclaration peut cependant être saisie sans eux.
3. Contrôle BIM réalisé (nomenclature, indices, cohérence, liens, formats), distinct du contrôle **technique de l'installation réelle**.
4. Autorisation **finale** par le **chef de projet** pour une modification issue d'un chantier, ou le **responsable maintenance** pour une modification de maintenance.
5. S'il existe plusieurs modifications, voire des origines différentes, sur un même traitement documentaire, **chaque origine doit recevoir sa validation finale appropriée** avant de publier ce traitement.

### Statut documentaire affiché d'une modification (calculé, jamais saisi)

- `A_QUALIFIER` si impact indéterminé.
- `SANS_IMPACT_EN_ATTENTE` tant que la décision sans impact n'est pas validée, puis `SANS_IMPACT_VALIDE`.
- `DOCUMENT_NON_IDENTIFIE` si mise à jour requise mais aucun traitement/document associé. **Simple statut de suivi, pas de module d'anomalie.**
- Sinon, un statut dérivé des traitements : `A_PREPARER`, `EN_COURS`, `EN_CONTROLE`, `EN_VALIDATION`, `A_JOUR`. **`A_JOUR` uniquement si tous les traitements requis sont publiés** et les validations requises enregistrées. Une modification non réalisée ne peut pas être considérée achevée.
- L'opération expose des **compteurs agrégés** des statuts des modifications ; un chantier physiquement terminé peut encore avoir des documents non publiés.

## 4. Deux parcours et règles de saisie

### Maintenance — déclaration rapide

L'agent sélectionne/scanne fictivement un local, choisit une zone ou plusieurs locaux, indique une courte description et la date réelle ou présumée de réalisation ; il peut ajouter des justificatifs simulés et une référence GMAO facultative. **Au clic de confirmation** seulement, créer de manière atomique l'opération et la première modification ; permettre à la place le rattachement à une opération existante. Déclarer sans toutes les preuves reste possible, mais pas clore le documentaire sans contrôle.

Les validations de saisie doivent empêcher les enregistrements vides, les doubles clics et la création partielle d'une opération sans sa modification. Les changements ultérieurs sont tracés. **Pas de génération d'opération à l'ouverture du formulaire.**

### Chantier — entrée anticipée

Le chef de projet crée d'abord une opération `CHANTIER` puis ajoute plusieurs modifications prévues et leurs localisations. Après travaux, les acteurs concernés documentent l'état installé et remettent les as-built. Le traitement et la publication suivent ensuite la chaîne commune.

## 5. Écrans du MVP

| Écran | Fonction |
|---|---|
| Tableau de bord | Compteurs de modifications à qualifier, travaux réalisés/documents non à jour, contrôles, validations, avec filtre d'origine/site/statut |
| Déclaration rapide mobile | Localisation QR **simulée** ou manuelle / zone, description, date, justificatif fictif facultatif, choix d'opération existante |
| Dossier d'opération | Identité de l'opération, liste de ses modifications, avancement physique/documentaire indépendant |
| Qualification | Discipline, lieux, décision d'impact, justificatifs nécessaires, responsables |
| Suivi documentaire | Document stable + indice, traitement mutualisé pour plusieurs modifications, affectation et statut |
| Validation / historique | Contrôle technique, contrôle BIM, décision finale selon origine, chronologie immuable |

Les quatre ambiances **Clair premium, Neural, Orbital, Hybride** sont fournies par `src/helora-design/` ; ne pas dupliquer le code graphique ni remplacer les vrais composants par des captures. Sur mobile, la lisibilité, le contraste et la performance priment sur les animations.

## 6. Architecture d'implémentation recommandée — prototype uniquement

- **MVP public = frontend HTML/CSS/JavaScript natif**, modules ES, `node --test`, sans nouvelle bibliothèque ni API interne tant que la nécessité n'est pas démontrée.
- **Source fictive unique** : fixtures JavaScript/JSON versionnées avec noms et codes **inventés** ; pas d'export de listes HEL-ISE, PRISME ou GMAO. Le design et la logique métier sont séparés.
- **Domaine pur** : validations des données, transitions de statuts, agrégation, contrôles d'unicité, calcul du statut documentaire ; aucun accès DOM dans le domaine.
- **Adaptateur de données de démo** : données en mémoire, réinitialisables ; **aucune promesse de sauvegarde durable** avant décision sur la future architecture de persistance. Ne pas stocker de vraie photo ni identifiant sensible dans `localStorage`.
- **Interface** : composants et contrôleur de thème existants ; test navigateur manuel indispensable en plus de `npm test`.
- **Préparation future** : conserver les IDs et références stables et isoler les accès données derrière une interface d'adaptateur pour un futur service SharePoint/API **après** arbitrage de sécurité, droits et architecture.

## 7. Indicateurs métier proposés (calculés)

- Nombre de modifications **physiquement réalisées mais non à jour documentairement**.
- Modifications en attente de qualification, de contrôle BIM, d'autorisation finale.
- Délai entre `dateExecution` et `datePublication` quand **ces deux événements sont disponibles** ; sinon afficher une valeur non calculable, jamais zéro inventé.
- Volume par site, discipline et origine ; compter les **modifications distinctes**, pas les lignes d'associations (locaux, documents).

## 8. Cas de tests prioritaires

1. Une opération de chantier regroupe 3 modifications et plusieurs disciplines.
2. Une modification affecte 3 locaux et une zone sans duplicata de modification.
3. Un même traitement documentaire couvre 2 modifications d'un même chantier : **une seule révision**, plusieurs liens.
4. Une modification maintenance déclarée après travaux est `REALISEE` physiquement mais `A_QUALIFIER` documentairement.
5. `SANS_IMPACT` sans justification ou sans validation du responsable : **clôture interdite**.
6. Des justificatifs manquent : déclaration acceptée, clôture documentaire bloquée lorsque la pièce est exigée.
7. Un document n'est pas identifié : indicateur documentaire affiché, **aucun dossier d'anomalie créé**.
8. Refus du contrôle BIM / de l'approbation finale : aucune publication, décision et motif visibles.
9. Révision documentaire associée à maintenance **et** chantier : autorisations finales distinctes exigées.
10. Double clic sur « Enregistrer » : **une seule opération et une seule modification**, jamais une opération vide.
11. Les compteurs du tableau de bord ne multiplient pas les modifications par le nombre de locaux ou de documents.
12. Aucune URL interne, photo ou donnée réelle dans les fixtures, les journaux, les captures et les commits.

## 9. Points ouverts (ne pas convertir en exigences tacites)

- Listes définitives des disciplines, rôles et niveaux d'autorisation ; délégation des validations en cas d'absence.
- Critères exacts déterminant quelles pièces justificatives sont **requises** selon chaque catégorie d'intervention.
- Format et séquence de numérotation des références humaines, en particulier multi-sites / exercice annuel.
- Gestion de la coédition lorsque deux opérations demandent simultanément une révision du même document.
- Authentification, autorisations serveur et cible de stockage pour une version réellement utilisable à HELORA.
- Portée d'un « projet » dans les chantiers complexes (opération parent vs sous-opérations).
- Validation visuelle des écrans par l'utilisateur avant tout branchement aux systèmes.

**Décision de conception provisoire :** la version 0 doit rendre ces points explicites et ne **pas** simuler une sécurité, une persistance ou une publication PRISME réelles.

## 10. Séquencement de réalisation

1. **PR de documentation** : valider ce modèle, sans code métier.
2. **Issue de domaine** : créer modules de données, fixtures fictives, gardes de statuts et tests ; **aucune UI**.
3. **Issue d'interface** : écrans de consultation et déclaration, réutilisation réelle de HELORA Design ; pas d'intégration externe.
4. **Issue de workflow** : qualification, associations documentaires, validation simulée et tableau de bord complet, après validation des deux étapes précédentes.

Chaque Issue fait l'objet d'une branche Claude, d'une PR limitée, des tests CI obligatoires, de la revue Codex et d'une **fusion humaine**. Pas d'auto-merge.
