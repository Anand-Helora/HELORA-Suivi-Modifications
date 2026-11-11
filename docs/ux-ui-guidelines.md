# Référentiel UX/UI — template multi-IA

Ce document est un **point de départ modifiable**, non une charte graphique officielle. Il est destiné aux petites applications web HTML/CSS/JavaScript créées à partir de ce modèle. Les demandes fonctionnelles, les contraintes métier et les décisions humaines priment.

## 1. Brief à renseigner pour chaque application

Avant le développement, consigner dans l'Issue (voir `.github/ISSUE_TEMPLATE/fonctionnalite-ux.md`) :
- **Public et contexte** : technicien sur chantier, gestionnaire sur bureau, utilisateur occasionnel, etc. (sans données personnelles).
- **Support principal** : mobile tactile, tablette, PC ; usage hors réseau, gants, luminosité forte, etc., si pertinent.
- **Tâche principale** : ce que l'utilisateur doit réussir avec le minimum d'étapes.
- **Écrans et données** : entrées, sorties, parcours nominal, cas d'erreur et état vide.
- **Identité graphique** : profil « HELORA web » ci-dessous, variante explicitement approuvée ou identité propre au projet.
- **Critères de réussite** : observables et testables, sans inventer des exigences non demandées.

Si une information manque, le designer peut proposer une **hypothèse explicite**, mais ne la transforme pas en décision métier.

## 2. Direction visuelle de départ « HELORA Futuristic » (à valider par le projet)

| Usage | Proposition initiale |
| --- | --- |
| Primaire / navigation | `#044550` (vert profond) |
| Accent / éléments secondaires | `#009E99` (turquoise) |
| Fond de mise en évidence | `#E6F5F5` |
| Texte et fonds neutres | Couleurs neutres à définir selon le contraste réel |
| Typographie | Police système lisible ; ne pas imposer une police externe |
| Ton éditorial | Français clair, libellés explicites, termes métier compréhensibles |

La direction artistique recommandée pour les **nouvelles applications web HELORA** est **futuriste, premium et expressive** : une identité high-tech reconnaissable, sans compromettre le travail métier. Ces couleurs sont des **préférences initiales proposées**, pas une certification de conformité ni une preuve d'identité officielle. Vérifier les contrastes sur les vraies combinaisons : le turquoise `#009E99` ne doit pas servir par défaut de texte fin sur fond blanc. Prévoir les états hover/focus/disabled/error sans dépendre de la couleur seule. Ne jamais déduire du nom HELORA que toutes les applications doivent avoir la même ergonomie.

**Profils d'usage** :
- **Terrain / mobile** : actions primaires larges, saisie limitée, confirmation après scan ou modification, erreurs récupérables, accès rapide aux tâches fréquentes.
- **Bureau / desktop** : filtres et tableaux lisibles, recherche, navigation clavier, actions groupées explicites avec confirmation si destructives.
- **ARIA / interfaces spécialisées** : identité à préciser dans le brief, sans copier automatiquement la palette du profil HELORA.
- **Revit / AutoCAD / DLL** : le présent template est web ; s'inspirer des principes UX, mais utiliser les conventions du logiciel hôte et des contrôles natifs. Ne pas appliquer un style CSS à une interface native.

### 2.1. Langage visuel : moderne, audacieux, professionnel

- **Direction créative** : interfaces nettement plus ambitieuses qu'un tableau de gestion classique, avec composition précise, hiérarchie typographique affirmée, volumes légers, profondeur, micro-détails et sensation de technologie avancée.
- **Surfaces** : panneaux soignés, bordures lumineuses discrètes, superpositions légères, verre dépoli (`backdrop-filter`) si pertinent **avec repli opaque lisible** ; ne jamais réduire la lisibilité au nom de l'effet.
- **Lumière et couleur** : conserver `#044550`, `#009E99` et `#E6F5F5` comme palette de base ; jouer sur les dégradés profonds, les halos turquoise à faible intensité et les accents lumineux sans dénaturer les valeurs métier.
- **Composition** : espaces généreux, cartes contemporaines, iconographie cohérente, angles et alignements contrôlés. Une identité visuelle forte, **pas une imitation d'écran de science-fiction illisible**.
- **Expérience** : soigner aussi les transitions entre écrans, les états de boutons, les retours de succès/erreur et la sensation de réactivité. Ne pas ajouter de faux indicateurs, de chiffres décoratifs ou de données imaginaires.
- **Deux variantes possibles** : une présentation « futuriste expressive » pour tableaux de bord et démonstrations ; une présentation « futuriste opérationnelle » plus calme pour saisie terrain, procédures répétitives et interfaces critiques. Proposer la variante adaptée et expliquer le choix.

### 2.2. Familles visuelles validées par le pilote

Le pilote fictif [HELORA-UX-Pilote](https://anand-helora.github.io/HELORA-UX-Pilote/) a permis de comparer quatre **directions artistiques optionnelles**. Ce sont des références de conception, pas quatre thèmes à installer automatiquement dans chaque application :

| Ambiance | Caractère et comportement proposé | Contexte conseillé |
| --- | --- | --- |
| **Clair premium** | Fonds lumineux, panneaux lisibles, accents turquoise et profondeur maîtrisée ; décor calme ou fixe | Saisie, maintenance, consultation prolongée |
| **Neural** | Graphe de nœuds et connexions, impulsions lumineuses empruntant **des trajets changeants** plutôt qu'une même boucle répétée | Pilotage exploratoire et démonstrations |
| **Orbital** | Planètes abstraites, anneaux elliptiques et satellites mobiles ; **point lumineux en tête, traînée derrière** | Présentations et interfaces d'exploration |
| **Hybride** | Réseau neuronal et orbites qui se rejoignent visuellement, sans masquer les données | Démonstrations immersives |

Le concepteur choisit avec l'humain **un thème pertinent** ou un sélecteur permettant de comparer plusieurs ambiances. Une interface métier ne doit pas obligatoirement proposer les quatre. Si un sélecteur est retenu, le changement ne doit pas recharger la page, réinitialiser le formulaire, perdre le focus ou la position de navigation ; une préférence locale non sensible peut être mémorisée en gérant les erreurs de stockage.

### 2.2.1. Mouvement perceptible et non répétitif, quand souhaité

Une démonstration expressive doit montrer **un mouvement reconnaissable dans les premières secondes**, mais ne doit jamais fatiguer l'utilisateur ou prendre le pas sur sa tâche. Les halos ou grilles quasi immobiles ne remplacent pas une vraie composition cinétique si le brief exige une animation vivante.

- Neural : distinguer **structure du réseau** et **itinéraires des impulsions**. Varier les bifurcations pendant une même session, sans régénérer l'ensemble des nœuds à chaque image.
- Orbital : synchroniser tête lumineuse, traînée et sens réel du parcours ; vérifier différentes positions de l'orbite, y compris le passage devant/derrière les sphères.
- Utiliser en priorité SVG/CSS ou une technique légère ; limiter le nombre d'éléments, les reconstructions du DOM et le travail sur mobile. Un moteur d'animation en continu doit être justifié et mesuré.
- Prévoir un bouton **Pause/Reprise** fonctionnel, la suspension dans les onglets non visibles et **un rendu totalement statique** avec `prefers-reduced-motion: reduce`. Éviter flashes et clignotements.
- Dessiner le décor **derrière le contenu**, sans capter clics ou focus, en `aria-hidden` lorsque approprié. Protéger les zones calmes autour des titres, formulaires et commandes.
- Vérifier les animations **en vidéo ou en navigateur pendant au moins plusieurs cycles**, pas uniquement sur capture fixe ; vérifier lisibilité, zoom texte, formats mobile/PC, batterie et fluidité.

En contexte hospitalier, ne jamais suggérer une **alerte réelle**, une surveillance en temps réel ou un état clinique/technique au moyen d'un décor fictif.

### 2.2.2. Option de déploiement web et gestion du cache

Pour une application statique déployée sur GitHub Pages, envisager un build **optionnel** produisant des noms d'assets hachés selon leur contenu (CSS, JavaScript et imports transitifs). Une page HTML actualisée référence alors les bons fichiers, sans vider le cache ou passer en navigation privée. Tester le **chemin de base propre au dépôt**, les imports, les références CSS et le site construit en navigateur. Ne pas copier aveuglément le script du pilote : adapter et vérifier les cas limites du projet.

**Ce template n'active aucun déploiement.** Tout workflow de publication automatique dans un dépôt dérivé exige une autorisation explicite et limitée, puis une fusion humaine en `main` ; les PR ne doivent pas publier les données réelles ou les secrets.

### 2.3. Exigences dans la conception et la revue

Avant développement, le designer doit proposer un **concept visuel concret** avec palette, organisation des surfaces, typographie, effets lumineux, ambiance animée (ou justification d'absence) et une alternative plus sobre. Décrire le mouvement : élément animé, raison, intensité, durée indicative et comportement en mouvement réduit. Le concept est **soumis à validation humaine**.

Après développement, contrôler le rendu mobile et desktop, le contraste dans les zones animées, `prefers-reduced-motion`, la navigation au clavier, les performances perçues et le **repli sans animation**. Indiquer explicitement les vérifications non réalisées. Si une capture fixe est disponible, elle ne permet pas de valider le mouvement lui-même.

## 3. Principes ergonomiques à vérifier

1. **Priorité au parcours** : une action principale évidente par écran ; navigation cohérente, retour et annulation prévisibles.
2. **Lisibilité** : hiérarchie titre/contenu/action, libellés persistants, unités et formats explicites, pas d'information essentielle cachée derrière une icône seule.
3. **Accessibilité** : viser WCAG 2.2 niveau AA lorsque applicable ; clavier, focus visible, noms accessibles, contrastes mesurés, erreurs identifiables. Sur mobile, préférer des cibles tactiles d'environ 44–48 px quand l'espace le permet.
4. **États complets** : initial, chargement, vide, succès, échec, hors connexion si concerné ; blocage et solution visibles.
5. **Prévention des erreurs** : validation pertinente, conservation de la saisie après erreur, confirmation pour opérations sensibles, aucune suppression silencieuse.
6. **Responsive** : définir le viewport principal puis vérifier au minimum un format étroit et un format desktop si l'application cible les deux.
7. **Cohérence** : mêmes intitulés, composants, espacements et conventions partout ; les effets futuristes et animations d'ambiance doivent servir une identité cohérente, jamais gêner la tâche, l'accessibilité ou la maintenance.
8. **Sobriété technique** : pas de framework, package, police distante ou librairie ajoutée sans justification et accord sur le coût de maintenance.

## 4. Intervention du designer — deux points de contrôle

### A. Avant d'écrire le code (conception)

Lire l'Issue, le brief et ce référentiel. Produire :
- le **parcours cible** en quelques étapes, les écrans et leurs états ;
- une **proposition d'interface** (schéma textuel ou wireframe si possible), avec composants clés ;
- **une alternative** argumentée et les compromis ;
- une liste des risques et questions qui changeraient réellement le besoin ;
- des **critères d'acceptation UX** concrets à intégrer à l'Issue.

L'agent est autorisé à challenger et simplifier l'interface, **pas** à inventer ou modifier des règles métier. Les grandes décisions de design doivent être validées par l'humain avant de devenir contraignantes.

### B. Après développement, avant fusion (revue)

Comparer l'implémentation au brief et aux critères UX. Examiner, quand disponibles :
- captures d'écran du **rendu réel** (mobile et bureau) et éventuellement états vides/erreurs ;
- parcours testé au clavier et au tactile/souris ;
- ergonomie, contraste, lisibilité, cohérence et messages.

La revue produit des remarques triées : **bloquant**, **important**, **suggestion**, avec observation, impact, correction recommandée et façon de vérifier. Ne jamais conclure « validé visuellement » si aucun rendu réel n'a été examiné.

**Important** : une capture ou un test Playwright n'est pas fourni par ce dépôt de base. Le projet cible doit disposer d'une page testable et ajouter ses tests navigateur si utiles. Le contrôle de code seul ne remplace pas l'essai humain.

## 5. Rapport attendu dans la Pull Request

- Proposition UX retenue, alternative étudiée et arbitrages.
- Écrans et états effectivement livrés.
- Vérifications effectuées (tests, navigateurs, tailles d'écran, accessibilité) **ou** clairement non effectuées.
- Liens vers captures/artefacts si disponibles, avec uniquement des données fictives.
- Écarts restants, limites et améliorations proposées pour une prochaine Issue.

Aucun contrôle UX ne doit fusionner automatiquement une PR, déclencher des corrections sans garde-fous ou contourner la revue Codex et la validation humaine.

## 6. Confidentialité

Ne jamais placer dans les Issues, captures, exemples, prompts ou artefacts des informations patient, des plans réels, des identifiants internes, des adresses d'infrastructure ou des secrets. Utiliser des maquettes et données entièrement fictives.
