# Backlog des changements

Créé le 2026-11-20 à la demande de l’utilisateur. Ce backlog devient le registre des changements proposés à partir de cette date. Les livraisons antérieures restent documentées dans leurs bilans; elles ne sont pas rétroactivement approuvées ou réouvertes ici.

## Règle d’approbation

Tout changement produit ou technique doit être décrit comme proposition dans ce backlog et recevoir l’approbation explicite de l’utilisateur avant son implémentation. Une demande de changement ouvre une proposition; elle ne vaut pas approbation de l’implémentation dans ce nouveau processus.

Chaque entrée précise le problème, le comportement proposé, le périmètre, les critères d’acceptation, la validation prévue et la décision de l’utilisateur. Les identifiants restent stables. Les statuts sont **Proposé — en attente d’approbation**, **Approuvé**, **En cours**, **Implémenté**, **Reporté** ou **Rejeté**.

L’approbation doit identifier les propositions ou décrire sans ambiguïté leur périmètre. Consigner les mots de l’utilisateur et la date avant de commencer le code. Une nouvelle exigence ou un élargissement du périmètre nécessite une proposition et son approbation. Les tests et corrections nécessaires pour respecter un périmètre déjà approuvé font partie de son implémentation.

La création et la tenue du backlog, l’enregistrement des décisions et les instructions qui appliquent ce processus sont autorisés par la demande actuelle. Leur mise à jour n’autorise aucun changement dans l’application. Les lectures, analyses et préparations de propositions peuvent continuer sans modifier son comportement.

## Vue d’ensemble

| ID      | Proposition                                                                                | Statut     | Approbation                                |
| ------- | ------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------ |
| BKL-001 | Timeline immédiatement sous la patinoire, de même largeur que son viewport                 | Implémenté | 2026-11-20 — « approve 001 and 002 »       |
| BKL-002 | Commande de retour au début de la timeline                                                 | Implémenté | 2026-11-20 — « approve 001 and 002 »       |
| BKL-003 | Icônes distinctes pour étape précédente/suivante                                           | Implémenté | 2026-11-20 — « I approve 003 »             |
| BKL-004 | En-tête Montage au-dessus des trois panneaux et actions dans la rangée de navigation       | Implémenté | 2026-11-20 — « approve 004 »               |
| BKL-005 | Bouton de création au-dessus des patineurs, remplacé par Montage après création            | Implémenté | 2026-11-20 — « approve 005 »               |
| BKL-006 | Fiabiliser la pause Observation près de son instant exact                                  | Implémenté | 2026-11-20 — « approve 006, 023 and 024 »  |
| BKL-007 | Barre sur une ligne, temps/vitesse à droite, insertion par icône et zoom vertical dépliant | Implémenté | 2026-11-20 — « yes » (approbation de 007)  |
| BKL-008 | Inspecteur à deux onglets : joueur courant et étape courante                               | Implémenté | 2026-11-20 — « approve 008 and 009 »       |
| BKL-009 | Icônes compactes pour Étape suivante et Enregistrer l’étape                                | Implémenté | 2026-11-20 — « approve 008 and 009 »       |
| BKL-010 | Onglet Équipes à droite et déplacement du panneau gauche dans cet onglet                   | Implémenté | 2026-11-20 — « approce 010 »               |
| BKL-011 | Outils de patinoire et annuler/rétablir en barre verticale à gauche                        | Implémenté | 2026-11-20 — « I approve 11,12 and 13 »    |
| BKL-012 | Quatrième onglet Patinoire pour Rôles, Trajectoires et Grille                              | Implémenté | 2026-11-20 — « I approve 11,12 and 13 »    |
| BKL-013 | Après création d’une séquence, amener le titre Montage en haut du viewport                 | Implémenté | 2026-11-20 — « I approve 11,12 and 13 »    |
| BKL-014 | Supprimer la bande d’information au-dessus de la glace et agrandir le viewport             | Implémenté | 2026-11-20 — « approve 014, 015, 016 »     |
| BKL-015 | Légende et contrôles de vue en bas du panneau, à la place de la consigne                   | Implémenté | 2026-11-20 — « approve 014, 015, 016 »     |
| BKL-016 | Cadrer l’en-tête Montage complet après création, avec une petite marge supérieure          | Implémenté | 2026-11-20 — « approve 014, 015, 016 »     |
| BKL-017 | Préserver le zoom et le pan pendant les mises à jour de lecture                            | Implémenté | 2026-11-20 — « approve 017 to 022 »        |
| BKL-018 | Menu Insérer une étape avec option Ajouter une étape après la sélection                    | Implémenté | 2026-11-20 — « approve 017 to 022 »        |
| BKL-019 | Commandes de zoom, cadrage et inversion dans la barre verticale à gauche                   | Implémenté | 2026-11-20 — « approve 017 to 022 »        |
| BKL-020 | Identité visuelle HockeyDoo et intégration du logo fourni                                  | Implémenté | 2026-11-20 — « approve 017 to 022 »        |
| BKL-021 | Panneau droit élargi de 15 %, de 320 à 368 px sur desktop                                  | Implémenté | 2026-11-20 — « approve 017 to 022 »        |
| BKL-022 | Réinitialiser en première position en haut de la barre verticale                           | Implémenté | 2026-11-20 — « approve 017 to 022 »        |
| BKL-023 | Libellés accessibles et aides textuelles pour toutes les commandes à icônes                | Implémenté | 2026-11-20 — « approve 006, 023 and 024 »  |
| BKL-024 | Zoom de patinoire compact avec panneau horizontal dépliant vers la droite                  | Implémenté | 2026-11-20 — « approve 006, 023 and 024 »  |
| BKL-025 | Réduire l’espacement vertical des icônes de la barre gauche                                | Implémenté | 2026-11-20 — « approve 025 »               |
| BKL-026 | Bouton de remise à 100 % dans le panneau de zoom de la patinoire                           | Implémenté | 2026-11-20 — « approve 025 and 206 » (026) |
| BKL-027 | M0 v1.2 — contrats, stockage PostgreSQL, migrations/seeds et architecture                  | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-028 | M1 v1.2 — projets et éditeur de scénarios intégrés                                         | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-029 | M2 v1.2 — exécution déterministe et enregistrement des interventions                       | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-030 | M3 v1.2 — 2-1-2 et quatre sorties de zone contextuelles                                    | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-031 | M3.5 v1.2 — systèmes, règles typées, validation et versions                                | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-032 | M4 v1.2 — replays figés, annotations et publication de leçons                              | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-033 | M5 v1.2 — organisations, équipes, membres, sessions et invitations                         | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-034 | M5.5 v1.2 — plans FREE/TEAM_PRO et quotas atomiques                                        | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-035 | M6 v1.2 — catalogue, affectations et portail joueur mobile                                 | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-036 | M7 v1.2 — E2E, sécurité, observabilité, performance et guides                              | Implémenté | 2026-11-20 — autorisation globale v1.2     |
| BKL-037 | Démonstrations : timeline des étapes, lecture animée pas à pas et bulle descriptive        | Implémenté | 2026-11-21 — « implement 037 »             |
| BKL-038 | Afficher le nom anglais d’origine de chaque démonstration                                  | Implémenté | 2026-11-21 — « I approve 038 »             |
| BKL-039 | Uniformiser le libellé de navigation vers l’atelier                                        | Implémenté | 2026-11-21 — « I approve 039 »             |

## BKL-001 — Timeline sous le viewport de la patinoire

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « The timelne editor should go directly below the rink with the same width as the rink viewport. »

**Situation actuelle :** Montage est placé après toute la grille de l’éditeur et occupe la largeur de l’espace de travail, y compris les colonnes du roster et de l’inspecteur. Il est donc éloigné de la zone de visualisation de la patinoire.

**Comportement proposé :** déplacer le panneau Montage immédiatement après le viewport de la patinoire dans sa colonne. Aligner ses bords gauche et droit sur ceux du viewport lui-même. Les contrôles secondaires de la patinoire ne doivent pas s’intercaler entre le viewport et la timeline. Conserver les panneaux de joueurs sur les côtés en desktop et placer la timeline avant le roster et l’inspecteur dans la pile mobile. Les pistes continuent de défiler horizontalement à l’intérieur du panneau.

**Périmètre prévu :** composition de `apps/web/src/editor/EditorView.vue`, styles de l’éditeur et de la timeline, vérifications de disposition navigateur et mise à jour du guide/aperçus. Aucun changement au format des séquences, aux poses, au moteur physique ou à la logique de lecture.

**Critères d’acceptation :**

- Montage apparaît immédiatement sous le viewport de la patinoire, sans dépendre de la hauteur du roster ou de l’inspecteur.
- Les bords gauche et droit des deux zones coïncident à un pixel CSS près, en desktop comme en mobile, y compris après redimensionnement.
- Le contenu large des pistes reste défilable dans la timeline et n’élargit pas la page.
- Les boutons, champs et contrôles de lecture restent utilisables à cette largeur; les barres d’outils se replient au besoin.
- Sélection, capture, lecture, insertion, Observation et sauvegarde conservent leur comportement.

**Validation prévue :** assertions de géométrie sur Chromium desktop/mobile et WebKit mobile; contrôle visuel des deux dispositions; tests de non-régression pertinents de la timeline.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 001 and 002 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-002 — Revenir au début de la timeline

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « There should be an option to go back to the beginning of the timeline. »

**Situation actuelle :** les contrôles permettent de revenir à l’étape précédente, mais aucune commande dédiée ne ramène directement au départ.

**Comportement proposé :** ajouter un bouton de transport avec une icône de retour au premier instant et le nom accessible **Revenir au début**. Son activation arrête la lecture, place le curseur à 00:00.00 et sélectionne la première étape pour afficher et permettre d’éditer sa pose. Le bouton reste utilisable pendant la lecture. Il conserve les étapes, la durée, les annotations d’Observation et l’historique du document.

Les positions modifiées mais non enregistrées restent protégées : avant de quitter une telle pose, demander de l’enregistrer ou de rétablir les positions enregistrées, selon le mécanisme existant. Le retour au début ne doit pas supprimer ces modifications silencieusement.

**Périmètre prévu :** contrôles de `apps/web/src/timeline/TimelineEditor.vue`, action de transport dans `useTimeline.ts` si nécessaire, tests navigateur et guide utilisateur. Aucun changement de format ou de contenu enregistré.

**Critères d’acceptation :**

- Une seule activation depuis une pause intermédiaire ou la fin ramène exactement à zéro et à la première pose.
- Une activation pendant la lecture met effectivement en pause à zéro; la lecture suivante repart de ce point.
- La commande ne réinitialise ni ne supprime le montage et ne crée pas une modification du document enregistré.
- Les modifications non enregistrées sont conservées et un message explique comment poursuivre.
- Le bouton possède une infobulle et un nom accessible en français, et fonctionne au clavier comme au pointeur.
- Une séquence contenant uniquement la pose de départ est gérée sans erreur.

**Validation prévue :** cas navigateur desktop/mobile depuis lecture, pause, fin et pose modifiée; comparaison du document avant/après retour; activation clavier et séquence d’une seule étape.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 001 and 002 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-003 — Icônes d’étape précédente et suivante

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « Change previous and next step buttons to step icon rather than begining and end icons »

**Situation actuelle :** le bouton suivant utilise un triangle suivi d’une barre (`▶|`), et le précédent son image retournée (`|◀`). Ces silhouettes évoquent le saut à une extrémité et rendent l’étape précédente difficile à distinguer de **Revenir au début**.

**Comportement proposé :** utiliser des icônes dédiées de progression d’une seule étape : triangle vers la gauche puis barre pour **Étape précédente** (`◀|`), barre puis triangle vers la droite pour **Étape suivante enregistrée** (`|▶`). **Revenir au début** garde son icône d’extrémité (`|◀`). Les dessins SVG suivront la taille et le style de trait existants.

**Périmètre prévu :** ajouter les deux icônes dédiées dans `apps/web/src/editor/Icon.vue` et les affecter uniquement aux boutons précédent/suivant du montage dans `TimelineEditor.vue`. Conserver les actions de navigation, leurs noms accessibles, les états désactivés et les contrôles du simulateur physique.

**Critères d’acceptation :**

- Précédent et suivant affichent respectivement les silhouettes `◀|` et `|▶`, distinctes du retour au début `|◀`.
- Chaque bouton continue de sélectionner une seule étape voisine et conserve son nom accessible en français.
- Lecture, retour au début, protection des poses modifiées et disposition du montage conservent leur comportement.
- L’icône partagée du pas physique M2 ne change pas dans ce périmètre.

**Validation prévue :** contrôle visuel desktop/mobile de la barre de transport, lint/typage pertinents et vérification navigateur ciblée de la navigation entre étapes.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « I approve 003 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-004 — En-tête au-dessus de l’atelier et actions regroupées avec la navigation

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** déplacer l’en-tête « Séquence pédagogique / Montage » au-dessus de la patinoire, sur toute la largeur allant du panneau « Les patineurs » au panneau « Élément sélectionné »; placer « Étape suivante » et « Enregistrer l’étape » sur la même rangée que les boutons de navigation des étapes.

**Situation actuelle :** le titre, le compteur et les actions de capture sont réunis dans l’en-tête de la timeline, sous la patinoire et limités à sa largeur. La navigation occupe une rangée distincte en dessous.

**Comportement proposé :**

- Déplacer les titres « SÉQUENCE PÉDAGOGIQUE » et « Montage », avec le résumé de la séquence, dans une bande immédiatement au-dessus de l’ensemble roster/patinoire/inspecteur. Cette bande s’aligne à gauche sur le panneau des patineurs et à droite sur le panneau de l’élément sélectionné. Avant création d’une séquence, la consigne et **Créer une séquence** restent disponibles dans cette bande.
- Conserver les pistes de la timeline directement sous le viewport de la patinoire et de même largeur, conformément à BKL-001. L’en-tête déplacé n’y est pas dupliqué.
- Regrouper, dans la barre sous la patinoire, les commandes retour au début, étape précédente, Lecture/Pause, étape suivante enregistrée, puis les actions **Étape suivante** (création) et **Enregistrer l’étape**. Les deux actions partagent la même rangée que la navigation.
- Sur une largeur étroite, permettre à cette rangée de boutons de défiler horizontalement à l’intérieur du panneau plutôt que de la couper en plusieurs rangées ou d’élargir la page. L’horloge, la vitesse et les outils secondaires peuvent se replier sur une autre rangée si nécessaire. L’en-tête supérieur reste à la largeur disponible de l’atelier.

**Périmètre prévu :** composition de `EditorView.vue`, séparation de l’en-tête et des commandes dans les composants de timeline, styles responsives correspondants, tests de disposition et vérification des actions déplacées, guide et aperçus. Les icônes BKL-003, les règles d’activation des boutons, les poses enregistrées et leur format restent identiques.

**Critères d’acceptation :**

- Un seul en-tête affiche « SÉQUENCE PÉDAGOGIQUE / Montage », au-dessus des trois panneaux en desktop et avant la patinoire dans la pile mobile.
- En desktop, ses bords correspondent à ceux de l’atelier complet, du roster à l’inspecteur, à un pixel CSS près, y compris après redimensionnement.
- **Étape suivante** et **Enregistrer l’étape** partagent la rangée des boutons de navigation; toutes ces commandes restent atteignables au clavier et au pointeur sur les petites largeurs.
- La timeline conserve son alignement avec le viewport et son défilement interne; la page ne déborde pas horizontalement.
- Création de séquence, ajout/capture de pose, protection des positions modifiées, précédent/suivant, lecture, retour au début, insertion et sauvegarde fonctionnent comme auparavant.
- Le résumé de la séquence et les états désactivés restent synchronisés entre l’en-tête supérieur et les commandes sous la patinoire.

**Validation prévue :** contrôles géométriques et visuels desktop/mobile après redimensionnement, accès clavier et défilement de la rangée sur petits écrans, scénarios de capture/navigation et non-régression pertinents sur Chromium et WebKit.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 004 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-005 — Création à gauche puis affichage de l’en-tête Montage

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** placer **Créer une séquence** au-dessus du panneau des joueurs, puis le remplacer par l’en-tête **Montage** une fois une séquence créée. La capture fournie montre l’état actuel : titre à gauche et bouton de création à droite dans une grande bande.

**Situation actuelle :** l’en-tête « SÉQUENCE PÉDAGOGIQUE / Montage » est affiché même en l’absence de séquence; **Créer une séquence** se trouve à son extrémité droite.

**Comportement proposé :**

- **Sans séquence :** afficher uniquement le bouton **Créer une séquence** dans une rangée compacte au-dessus du panneau **Les patineurs**, aligné sur son bord gauche. Ne pas afficher encore la grande bande « SÉQUENCE PÉDAGOGIQUE / Montage » ni son texte d’introduction.
- **Après création :** remplacer cette rangée de création par l’en-tête complet « SÉQUENCE PÉDAGOGIQUE / Montage », avec nombre d’étapes et durée. Conserver son emplacement au-dessus des trois panneaux et sa largeur du roster à l’inspecteur, conformément à BKL-004.
- Afficher le même état Montage lorsqu’une séquence existante est restaurée ou importée. Lorsqu’un scénario simple remplace la séquence, retrouver l’état de création à gauche.
- Conserver les actions **Étape suivante** et **Enregistrer l’étape** avec la navigation sous la patinoire. La présente proposition ne déplace pas l’horloge, la vitesse, l’insertion ou le zoom.

**Périmètre prévu :** affichage conditionnel de `TimelineHeader.vue`, styles de la rangée de création et alignement avec l’atelier; tests des deux états et de la transition; guide et aperçus. La commande de création, sa protection pendant la simulation et les formats enregistrés ne changent pas.

**Critères d’acceptation :**

- Avant création, le bouton est visible et aligné à gauche au-dessus des patineurs en desktop et mobile; aucun titre Montage ni grande carte d’en-tête vide n’est affiché.
- Une activation crée la séquence à partir de la pose courante et remplace le bouton par un seul en-tête Montage, sans recréer ni perdre les positions.
- Le compteur et la durée de l’en-tête restent synchronisés avec les étapes; la largeur de l’en-tête actif couvre toujours les trois panneaux.
- Le rechargement/import d’une séquence affiche directement Montage; le retour à un scénario simple réaffiche la création, en respectant l’historique existant.
- Le bouton conserve son nom accessible, l’activation clavier et son état désactivé pendant une simulation physique.
- Le placement de la timeline et de ses commandes reste celui approuvé dans BKL-001 à BKL-004, sans débordement horizontal.

**Validation prévue :** contrôles visuels et géométriques des états avant/après création en desktop/mobile; création clavier/pointeur; restauration/import et retour au scénario; non-régression pertinente sur Chromium et WebKit.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 005 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-006 — Pause Observation à proximité exacte du marqueur

**Date de proposition :** 2026-11-20. **Origine :** échec navigateur constaté pendant la validation de BKL-005, puis reproduction en lecture seule. **Statut :** Implémenté.

**Problème observé :** le test desktop « pauses at an Observation marker… » a atteint 2 000 ms au lieu de s’arrêter au marqueur de 1 000 ms. Les changements BKL-005 ne modifient pas le cadenceur ni l’interpolation. Le helper existant `advanceSequence` utilise `s.atMs > time + 0.001`, ce qui exclut un marqueur situé à moins de 0,001 ms devant le temps courant.

**Reproduction déterministe :** avec une Observation à 1 000 ms, `advanceSequence(sequence, 999.9999, 16.667)` renvoie actuellement `{ time: 1016.6669, paused: false }`; le résultat attendu est `{ time: 1000, paused: true }`. À exactement 1 000 ms, une reprise doit en revanche progresser normalement. Le calcul a été exécuté avec le helper existant sans modifier de fichier applicatif ou de test.

**Comportement proposé :** détecter strictement le premier marqueur franchi entre le temps courant et le suivant, sans la tolérance positive qui masque une proximité numérique. Conserver le saut exact sur l’instant du marqueur lors de l’arrêt, puis exclure ce même marqueur lors de la reprise à partir de cet instant.

**Périmètre prévu :** condition de franchissement dans `apps/web/src/timeline/sequence.ts`, tests de non-régression aux bornes et vérification du scénario navigateur Observation. Aucun changement de disposition, de format de séquence ou du moteur physique M2.

**Critères d’acceptation :**

- Un marqueur à 1 000 ms est respecté depuis 999,9999 ms, comme depuis une distance plus importante.
- Une reprise depuis exactement 1 000 ms avance sans se remettre immédiatement en pause au même marqueur.
- Un incrément traversant plusieurs marqueurs s’arrête au premier; les bornes de début/fin restent correctes.
- Les résultats sont déterministes et le test de lecture Observation réussit sur Chromium et WebKit.

**Validation prévue :** tests numériques ciblés couvrant les instants immédiatement avant/à/après une Observation; tests existants d’avancement et lecture; scénario navigateur de pause/reprise.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 006, 023 and 024 ». **Implémentation :** terminée le 2026-11-20. Voir la validation groupée de BKL-006, BKL-023 et BKL-024 ci-dessous.

## BKL-007 — Barre de timeline compacte sur une seule ligne

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** réunir les commandes sur une ligne, déplacer le temps et la vitesse à droite, remplacer le texte d’insertion par une icône et transformer le zoom en curseur vertical dépliant.

**Situation actuelle :** la rangée de navigation/création/capture est séparée de l’horloge, de la vitesse et des outils. L’insertion affiche son libellé complet et le curseur de zoom horizontal reste visible en permanence.

**Comportement proposé :**

- Une seule barre horizontale sous la patinoire, sans retour à la ligne : navigation BKL-003, **Étape suivante**, **Enregistrer l’étape**, insertion et déclencheur de zoom à gauche; temps courant/durée totale et vitesse regroupés à droite.
- Remplacer **Insérer une étape ici** par un bouton d’icône compact. Conserver ce libellé en infobulle et comme nom accessible, les conditions d’activation et la capture à l’instant du curseur.
- Remplacer le curseur de zoom horizontal permanent par un bouton **Zoom de la timeline** ouvrant un petit panneau flottant avec un curseur vertical. Le haut augmente le zoom et le bas le réduit, dans les bornes actuelles. Le panneau se ferme avec Échap ou un clic extérieur, restitue le focus au besoin et n’est pas rogné par les conteneurs défilants.
- Sur petite largeur, garder le temps et la vitesse au bord droit; permettre au groupe des commandes de gauche de défiler horizontalement pour atteindre toutes les actions. Les groupes restent sur la même ligne, sans chevauchement ni débordement de la page.
- Conserver le bouton de création/l’en-tête conditionnel BKL-005 et le placement des pistes sous le viewport. Les comportements d’enregistrement, navigation, lecture et insertion ne changent pas.

**Périmètre prévu :** structure de transport dans `TimelineEditor.vue`, styles responsives, icônes d’insertion/zoom et état éphémère du panneau de zoom (composant dédié si utile), vérifications de disposition/accessibilité et guide/aperçus. Aucun changement du format de séquence ou du calcul de lecture. BKL-006 reste une proposition séparée en attente d’approbation.

**Critères d’acceptation :**

- Tous les groupes de commandes partagent une seule ligne en desktop et mobile; temps et vitesse sont à droite.
- Les commandes défilent dans leur propre zone si nécessaire; le focus clavier révèle chaque action et la page n’est pas élargie.
- L’insertion est représentée par une icône avec infobulle/nom accessible; elle insère toujours la pose au playhead et conserve ses gardes.
- Le zoom se présente par défaut comme un bouton; son ouverture affiche un slider vertical utilisable au pointeur, au toucher et au clavier, sans modifier les étapes ni la durée.
- Ouverture/fermeture et focus du panneau sont explicites et accessibles; le panneau reste visible et ancré au déclencheur après défilement/redimensionnement.
- Les valeurs de vitesse, les temps affichés et les états désactivés restent corrects; les icônes de pas BKL-003 sont conservées.

**Validation prévue :** contrôles géométriques et visuels à plusieurs largeurs sur Chromium desktop/mobile et WebKit mobile; navigation clavier et accès aux actions dans la zone défilante; ouverture/fermeture/ajustement du zoom vertical; insertion valide/invalide et non-régression des contrôles concernés.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « yes », en réponse à « Approve 007? ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-008 — Onglets Joueur et Étape dans le panneau de droite

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** le panneau « Élément sélectionné » doit présenter deux onglets, l’un pour le joueur courant, l’autre pour l’étape courante.

**Situation actuelle :** le panneau de droite contient l’inspecteur du joueur ou de la rondelle. Les propriétés de l’étape sont dans un formulaire distinct sous les pistes de la timeline.

**Comportement proposé :**

- Ajouter deux onglets **Joueur** et **Étape** en haut du panneau de droite; Joueur est actif au départ. Le choix d’onglet reste explicite et ne modifie pas la sélection, le curseur ou les positions.
- **Joueur** reprend les contrôles actuels du joueur sélectionné : numéro, coordonnées, orientation, rôle et possession. Lorsque la rondelle est sélectionnée, cet onglet affiche ses contrôles existants et identifie clairement la rondelle.
- **Étape** reprend le formulaire actuel de l’étape sélectionnée : numéro, nom, temps, type Jeu/Observation, suppression et paramètres d’Observation (observateur, cible du regard, coordonnées et consigne). Déplacer ce formulaire depuis le bas de la timeline, sans le dupliquer.
- Sans séquence, l’onglet Étape explique qu’il faut créer une séquence. Pendant la lecture ou un aperçu entre poses, identifier l’étape enregistrée sélectionnée et afficher ses propriétés en lecture seule, avec une indication d’aperçu pour éviter de la confondre avec une nouvelle étape au curseur.
- Changer d’onglet conserve les positions non enregistrées et l’historique; les gardes d’édition, retiming et suppression restent celles existantes. Les pistes et leur barre de commandes restent sous la patinoire.
- Garder les deux onglets utilisables au clavier et sur mobile : sémantique tablist/tab/tabpanel, état actif, focus visible et navigation par flèches/Début/Fin.

**Périmètre prévu :** composition de `EditorView.vue`, extraction du formulaire d’étape de `TimelineEditor.vue` dans un composant partagé avec la session existante, styles du panneau et de la timeline, tests navigateur pertinents et guide/aperçus. Aucun nouveau champ métier, format enregistré, calcul de lecture ou changement à BKL-006.

**Critères d’acceptation :**

- Le panneau de droite présente exactement deux onglets et un seul contenu actif, sans formulaire d’étape dupliqué sous la timeline.
- Les champs suivent le joueur/la rondelle et l’étape sélectionnés, et leurs modifications conservent les effets, validations et gardes existants.
- Les changements d’onglet ne déplacent pas les joueurs, ne capturent pas une pose et ne perdent pas les positions modifiées.
- Les états sans séquence, lecture, aperçu, Observation et étape initiale sont explicites et correctement protégés.
- L’accès clavier, les petits écrans et l’alignement patinoire/timeline restent fonctionnels; sauvegarde/rechargement et annuler/rétablir conservent les modifications.

**Validation prévue :** parcours navigateur Chromium desktop/mobile et WebKit mobile couvrant les onglets et leur clavier, sélection joueur/rondelle/étape, modification de pose et métadonnées, Observation, préservation des positions non enregistrées, états désactivés et persistance; contrôles visuels et géométriques responsives, puis checks pertinents.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 008 and 009 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-009 — Ajout et enregistrement d’étape par icônes

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** remplacer les libellés visibles « Étape suivante » et « Enregistrer l’étape » par des icônes pour économiser de l’espace.

**Situation actuelle :** ces deux boutons de la barre de timeline conservent du texte à côté du signe plus et du point d’enregistrement.

**Comportement proposé :** afficher **Étape suivante** comme un bouton d’icône plus et **Enregistrer l’étape** comme un bouton d’enregistrement avec son point rouge. Les boutons prennent le format compact des autres commandes; conserver leurs libellés français complets en infobulle et comme noms accessibles. Garder leurs positions, leurs actions et tous leurs états désactivés.

**Périmètre prévu :** boutons et styles correspondants dans la barre de `TimelineEditor.vue`, ajustements des vérifications navigateur et du guide/aperçus. Ne pas modifier les icônes précédent/suivant, l’insertion, le zoom, la création de séquence ou les règles de capture.

**Critères d’acceptation :**

- Aucun texte visible dans les deux boutons; icônes distinctes pour ajouter une étape et enregistrer sa pose.
- Infobulles et noms accessibles « Étape suivante » / « Enregistrer l’étape » conservés; activation clavier, pointeur et toucher fonctionnelle.
- La création de l’étape suivante et la capture des positions conservent les gardes existantes, dont la protection des poses modifiées et les limites de séquence.
- La barre reste sur une ligne, avec temps/vitesse à droite et défilement interne si nécessaire.

**Validation prévue :** contrôles visuels desktop/mobile, noms accessibles et géométrie compacte, parcours d’ajout/enregistrement au clavier et au pointeur, vérification des états désactivés et non-régression de BKL-007 sur les trois projets navigateur.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 008 and 009 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-010 — Onglet Équipes et regroupement des panneaux à droite

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « add a teams tab to the right pane and move the left pane over there ». **Précision utilisateur du 2026-11-20 :** « make the right pane a bit wider and expand the rink viewport to use the left over space on the left ».

**Situation actuelle :** le panneau de gauche affiche les équipes, les patineurs et la rondelle. Le panneau de droite contient les onglets Joueur et Étape. Le roster occupe une colonne séparée à gauche de la patinoire sur grand écran.

**Comportement proposé :**

- Ajouter **Équipes** aux onglets du panneau de droite, dans l’ordre **Équipes / Joueur / Étape**. Conserver Joueur comme onglet initial au chargement.
- Déplacer l’intégralité du contenu du panneau gauche dans Équipes : titre/compteur 5 × 5, choix d’équipe A/B, effectif, sens d’attaque, liste des patineurs avec numéro/poste ou rôle et indicateur de possession, sélection de la rondelle et carte de stratégie existante. Un seul exemplaire de ce contenu est rendu.
- Le choix d’une équipe reste dans Équipes et actualise son roster selon le comportement existant. Sélectionner un patineur ou la rondelle dans cette liste ouvre Joueur pour accéder à ses propriétés; sélectionner un élément sur la patinoire actualise la sélection sans imposer un autre onglet. L’onglet Étape et ses paramètres restent disponibles.
- Supprimer la colonne de gauche et donner la place libérée à la patinoire et à sa timeline. Sur desktop, conserver un atelier à deux colonnes, patinoire à gauche et panneau à onglets à droite. Élargir légèrement le panneau de droite, actuellement de 252 à 270 px selon la largeur, vers environ **320 px** sur desktop, avec adaptation responsive. Le viewport de la patinoire et la timeline remplissent toute la largeur restante de la colonne gauche, jusqu’au bord gauche de l’atelier, sans colonne vide ni marge réservée à l’ancien roster. Le cadrage conserve les proportions de la glace et les coordonnées existantes. Sur les petits écrans, placer le panneau à onglets sous la zone patinoire/timeline et conserver le défilement interne des commandes.
- Garder **Créer une séquence** en haut à gauche de l’atelier, désormais au-dessus de la patinoire. Après création, l’en-tête Montage continue de couvrir toute la largeur de l’atelier, de la patinoire au panneau de droite. La timeline reste immédiatement sous le viewport et de même largeur.
- Les trois onglets conservent les relations ARIA, le focus visible, la navigation Gauche/Droite/Début/Fin et Tab. Le changement d’onglet ou d’équipe et la sélection d’un joueur ne doivent pas supprimer les positions modifiées ou capturer une étape implicitement.

**Périmètre prévu :** composition de `EditorView.vue`, extraction éventuelle du roster dans un composant, styles responsives de l’atelier et du contenu des onglets, navigation de l’inspecteur, adaptation des vérifications de disposition/sélection, guide et aperçus. Aucun ajout de champs d’équipe, calcul tactique, format de séquence ou changement de lecture. BKL-006 reste séparé et non approuvé.

**Critères d’acceptation :**

- Le panneau de droite contient exactement trois onglets et un seul contenu actif; il n’existe plus de panneau roster séparé à gauche ni de duplication de la liste.
- Équipes permet toujours de choisir les deux équipes, chacun de leurs cinq joueurs et la rondelle; numéros, rôles, possession et sens d’attaque suivent l’état courant, y compris pendant un aperçu.
- Une sélection depuis la liste ouvre Joueur et affiche le bon élément. Le changement d’équipe reste dans Équipes. Les positions non enregistrées sont conservées et les protections de capture/navigation restent appliquées.
- Sur desktop, le panneau de droite est visiblement plus large (cible d’environ 320 px) et la patinoire remplit la largeur restante, sans espace réservé à l’ancien panneau gauche; ses proportions et les coordonnées des joueurs restent correctes après redimensionnement. Sur mobile/tablette, onglets et champs restent accessibles sans débordement horizontal. L’alignement viewport/timeline et l’en-tête sur toute la largeur de l’atelier sont conservés.
- Création de séquence, sélection sur la glace, modification de joueur/rondelle et d’étape, capture, lecture, sauvegarde/rechargement et historique conservent leur comportement.

**Validation prévue :** tests navigateur sur Chromium desktop/mobile et WebKit mobile pour les trois onglets et leur clavier, sélection des deux équipes/joueurs/rondelle, ouverture de Joueur et préservation des poses modifiées; géométrie et contrôle visuel desktop/tablette/mobile, alignement du montage, largeur accrue du panneau droit, occupation complète de la colonne gauche par le viewport et absence de colonne vide; non-régression pertinente des parcours d’édition, de séquence, persistance et simulation.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approce 010 » (approbation explicite de la proposition 010 mise à jour). **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-011 — Barre d’outils verticale à gauche de la patinoire

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « move these left of the rink and show them vertically », avec une capture des outils Déplacer, Placer, Tracer une cible, Déplacer la vue, Annuler et Rétablir.

**Situation actuelle :** ces commandes sont disposées horizontalement au-dessus de la patinoire, avec un séparateur entre les outils de manipulation et l’historique.

**Comportement proposé :**

- Déplacer ce groupe dans une barre compacte directement à gauche du viewport de la patinoire, à l’intérieur de la zone de travail de gauche. Afficher les icônes de haut en bas : Déplacer, Placer, Tracer une cible (lorsqu’elle est disponible), Déplacer la vue, puis Annuler et Rétablir après un séparateur horizontal.
- La barre est adjacente au viewport, sans superposition sur la glace. La patinoire occupe toute la largeur restante à sa droite; la timeline reste directement sous le viewport, avec les mêmes bords et la même largeur. Le panneau à onglets de droite garde sa largeur desktop de 320 px et sa disposition responsive BKL-010.
- Garder Réinitialiser le scénario comme commande distincte en haut à droite de la zone de patinoire. Les commandes de lecture/capture restent dans la timeline.
- Conserver les icônes, noms accessibles et infobulles en français, outil actif, actions et états désactivés existants, y compris pendant une simulation, la lecture ou un aperçu. Le mode séquence continue de proposer uniquement les outils actuellement disponibles dans ce mode.
- Maintenir la disposition verticale sur mobile et tablette, avec des cibles tactiles utilisables et un accès à toutes les commandes sans élargir la page. Le viewport conserve ses proportions de glace et ses coordonnées après la réorganisation.
- Déclarer l’orientation verticale de la toolbar et permettre la navigation clavier Haut/Bas/Début/Fin, avec focus visible et activation native Entrée/Espace; conserver les raccourcis d’édition existants.

**Périmètre prévu :** structure de la zone patinoire dans `EditorView.vue`, styles de la barre et du viewport, navigation clavier de la toolbar, adaptation des vérifications de disposition et des commandes déplacées, guide et aperçus. Aucun changement aux outils eux-mêmes, à l’historique, au store, au moteur, à la lecture ou au format de séquence. BKL-006 reste séparé et non approuvé.

**Critères d’acceptation :**

- Les commandes de la capture apparaissent dans une seule colonne à gauche du viewport, dans l’ordre proposé, avec un séparateur horizontal avant Annuler/Rétablir; elles ne sont plus dupliquées en rangée au-dessus.
- Aucune commande ne recouvre la glace ou les joueurs. La timeline reste alignée sur le viewport; le panneau droit et l’en-tête Montage conservent leur placement.
- Les actions déplacées sont accessibles au pointeur, au toucher et au clavier; noms accessibles, infobulles, outil actif, disponibilité selon le mode et états désactivés restent corrects.
- Déplacer/placer un joueur, tracer une cible, déplacer la vue et annuler/rétablir conservent leurs effets et leurs conventions de coordonnées.
- Sur desktop, tablette et mobile, toutes les commandes restent atteignables sans débordement horizontal de page ni perte de positions modifiées.

**Validation prévue :** contrôles géométriques et visuels à plusieurs largeurs sur Chromium desktop/mobile et WebKit mobile; navigation clavier verticale, activation des outils et gestes tactiles pertinents; parcours d’édition et historique, états de simulation/lecture/aperçu, alignement viewport/timeline et non-régression pertinente de BKL-010.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « I approve 11,12 and 13 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-012 — Options d’affichage dans un quatrième onglet Patinoire

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « Move these to a fourth "patnoire" tab on the right panel. », avec une capture des cases Rôles, Trajectoires et Grille. Le libellé proposé reprend l’orthographe française **Patinoire**.

**Situation actuelle :** ces trois options d’affichage sont sous la patinoire, dans `rink-options`. Le panneau de droite présente Équipes, Joueur et Étape.

**Comportement proposé :**

- Ajouter un quatrième onglet **Patinoire**, après **Équipes / Joueur / Étape**, dans le panneau de droite.
- Déplacer les cases **Rôles**, **Trajectoires** et **Grille** dans cet onglet, présentées verticalement avec leurs libellés complets. Un seul exemplaire de chaque contrôle est rendu; la rangée correspondante sous la patinoire disparaît.
- Réutiliser les états d’affichage actuels et conserver leurs valeurs lorsque l’utilisateur change d’onglet, de joueur, d’équipe ou d’étape. Joueur reste l’onglet initial au chargement; ouvrir Patinoire ne change ni la sélection ni le temps de lecture.
- Conserver le comportement existant des options selon le mode : affichage des rôles dans le roster et sur la glace, grille, et trajectoires existantes du simulateur. Le montage continue d’afficher ses mouvements selon ses règles actuelles.
- Les quatre onglets partagent leurs relations ARIA, l’état actif et la navigation clavier : Gauche/Droite circulent entre les quatre, Début sélectionne Équipes et Fin Patinoire. Les cases restent utilisables au clavier, au pointeur et au toucher.
- Conserver le panneau desktop de 320 px, la disposition sous la patinoire sur petits écrans et l’alignement viewport/timeline. Les quatre libellés et le contenu restent accessibles sur les petites largeurs sans élargir la page.

**Périmètre prévu :** composition et navigation des onglets dans `EditorView.vue`, déplacement des contrôles d’affichage, styles responsives pertinents, adaptation des tests qui les utilisent, guide et aperçus. Les options restent des réglages de vue locaux : aucun changement des poses, de l’historique, du format enregistré, des calculs de simulation/lecture ou de la persistance. BKL-011 couvre séparément la barre verticale, approuvée dans le même message. BKL-006 demeure non approuvé.

**Critères d’acceptation :**

- Le panneau de droite présente exactement quatre onglets dans l’ordre Équipes / Joueur / Étape / Patinoire, avec un seul contenu actif.
- Patinoire contient exactement les trois cases demandées; elles ne sont plus présentes sous le viewport.
- Les cases conservent leurs états et effets actuels après navigation entre onglets, équipes, joueurs et étapes. Leur modification ne change pas le document exporté, ne capture pas une pose et n’ajoute pas d’entrée d’historique.
- La sélection courante et les positions modifiées restent conservées; les protections de montage et de simulation sont inchangées.
- Les quatre onglets et les cases restent accessibles au clavier et au toucher, sur desktop/tablette/mobile, sans débordement de page ni désalignement de la timeline.

**Validation prévue :** tests navigateur Chromium desktop/mobile et WebKit mobile couvrant les quatre onglets et leur clavier, les trois options et leurs effets visuels, le maintien des valeurs et l’égalité de l’export/historique; parcours avec positions modifiées, aperçu et simulation; vérification visuelle et géométrique aux largeurs pertinentes, puis checks de non-régression adaptés.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « I approve 11,12 and 13 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-013 — Défilement vers Montage après création d’une séquence

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « When clicking on "Creer une sequence" scroll so that the "Montage" heading is at the top of the browser view port ».

**Situation actuelle :** Créer une séquence remplace le bouton par l’en-tête Montage, mais le défilement vertical du navigateur reste à son emplacement précédent.

**Comportement proposé :**

- Après une création réussie par **Créer une séquence**, attendre que le titre **Montage** soit rendu puis faire défiler la page pour aligner le haut de ce titre sur le haut du viewport du navigateur, dans la limite du défilement disponible.
- Appliquer ce comportement à l’activation au pointeur, au toucher et au clavier (Entrée/Espace), en desktop comme en mobile. Conserver un parcours clavier cohérent lorsque le bouton de création disparaît.
- Déclencher ce déplacement dans le parcours de création explicite; les affichages de Montage issus d’un rechargement, d’un import ou de l’historique conservent leur comportement de défilement existant.
- Une création bloquée ou en erreur conserve la position de lecture de la page. Les positions des joueurs, la pose initiale, l’onglet actif et le temps de la séquence suivent les règles de création existantes.

**Périmètre prévu :** gestion de l’action de création dans `EditorView.vue` et/ou référence au titre dans `TimelineHeader.vue`, synchronisation après rendu, ajustements de focus nécessaires, vérifications navigateur et guide. Aucun changement de disposition, de contrat, de sauvegarde, de calcul de lecture ou de création des poses. BKL-011 et BKL-012 couvrent séparément leurs changements d’interface, approuvés dans le même message. BKL-006 demeure non approuvé.

**Critères d’acceptation :**

- Après création par le bouton, le titre Montage est visible en haut de la zone de navigateur; son bord supérieur coïncide à un pixel CSS près avec celui du viewport lorsque la hauteur de page permet ce défilement.
- L’action fonctionne depuis différentes positions de défilement et tailles de viewport, sans répétition du déplacement à chaque rendu ou édition.
- Entrée, Espace, clic et toucher produisent la même création et le même cadrage, sans perdre les positions préparées ou créer une deuxième séquence.
- La garde pendant la simulation physique reste appliquée; aucun défilement automatique n’est déclenché par une création refusée, un rechargement, un import ou une action d’historique.
- La timeline reste alignée sur la patinoire et le panneau à onglets conserve son état.

**Validation prévue :** tests Chromium desktop/mobile et WebKit mobile mesurant le titre après création depuis plusieurs positions, activations clavier/pointeur/toucher, différentes hauteurs de viewport et limites de défilement; contrôle de la pose initiale et de la garde de simulation, puis non-régression pertinente du parcours de création/restauration/import/historique.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « I approve 11,12 and 13 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-014 — Supprimer la bande supérieure et rendre sa hauteur à la patinoire

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** capture annotée « Remove this band and give more space to the rink », visant la bande avec « Situation initiale » à gauche et les dimensions à droite.

**Situation actuelle :** `rink-topline` affiche le contexte courant (situation initiale/simulée, nom d’étape ou aperçu) et les dimensions, au-dessus du viewport. La marge supérieure de `rink-surface` et cette ligne réservent de la hauteur avant la glace.

**Comportement proposé :**

- Supprimer cette bande et son espace supérieur dédié, dans les états édition, simulation, montage et aperçu.
- Réaffecter la hauteur récupérée au viewport de la patinoire pour agrandir la zone de visualisation, en conservant le cadrage proportionnel de la glace. La timeline reste immédiatement sous le viewport, avec les mêmes bords; le déplacement des éléments conserve autant que possible la hauteur totale de la zone de travail.
- Présenter les dimensions existantes en information compacte dans l’onglet **Patinoire**. Le nom de l’étape et les indications de mode continuent d’être accessibles via Étape, les contrôles de simulation et les messages d’aperçu existants.
- Conserver la barre verticale à gauche, Réinitialiser en haut à droite, les quatre onglets et le défilement vers Montage après création. Les coordonnées des joueurs, les réglages de vue et les règles d’édition restent identiques.

**Périmètre prévu :** retrait de `rink-topline` dans `EditorView.vue`, styles de hauteur/espacement du viewport dans `editor.css`, présentation des dimensions dans Patinoire, vérifications géométriques/visuelles pertinentes et guide/aperçus. Aucun changement au store, aux dimensions du modèle, au moteur, au calcul de lecture ou aux formats enregistrés. BKL-006 reste séparé et non approuvé.

**Critères d’acceptation :**

- La bande annotée et la place qu’elle réservait au-dessus de la glace ne sont plus affichées dans aucun mode.
- La hauteur disponible pour le viewport augmente de l’espace récupéré, au lieu de simplement raccourcir le panneau. Le cadrage conserve les proportions de la glace et les coordonnées restent correctes après redimensionnement.
- Les dimensions sont consultables dans Patinoire; le nom d’étape et les indications de simulation/aperçu restent accessibles dans leurs zones existantes.
- Timeline et viewport restent alignés, sans commande superposée à la glace ni débordement horizontal sur desktop/tablette/mobile.
- Les outils, l’édition des positions, la capture/relecture, les quatre onglets et le cadrage après création conservent leur comportement.

**Validation prévue :** mesures navigateur de la hauteur récupérée et de l’alignement viewport/timeline, vérification des états édition/simulation/montage/aperçu, contrôle visuel desktop/mobile et dimensions dans Patinoire; vérifications pertinentes des coordonnées, outils et création sur Chromium desktop/mobile et WebKit mobile, puis checks adaptés au changement.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 014, 015, 016 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-015 — Déplacer la légende et les contrôles de vue à la place de la consigne

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** capture annotée « Move these below in place of the striked through text. », encadrant la légende des équipes et les contrôles de zoom/cadrage/inversion, avec la consigne générique barrée en dessous.

**Situation actuelle :** `rink-bottomline` se trouve dans `rink-surface`, après le viewport et la timeline éventuelle. La consigne `tool-hint` occupe une rangée séparée plus bas, dans le panneau de patinoire.

**Comportement proposé :**

- Déplacer l’ensemble **légende Équipe A / Équipe B + réduire / pourcentage de zoom / agrandir / cadrer / inverser la vue** dans une rangée de bas de panneau, à l’emplacement de la consigne barrée.
- Remplacer la consigne visible par cette rangée : légende à gauche, commandes de vue à droite sur les largeurs suffisantes. Un seul exemplaire de chaque commande et de la légende est rendu; leur ancienne rangée dans la surface de patinoire disparaît.
- Conserver les couleurs/libellés des équipes, le pourcentage courant, les actions et noms accessibles existants. Sur petites largeurs, adapter la rangée pour que la légende et toutes les commandes restent accessibles sans débordement horizontal.
- Garder l’aide associée à la patinoire pour les lecteurs d’écran. Les états de positions modifiées, d’aperçu/lecture et de simulation continuent d’être expliqués dans les zones de statut existantes de la timeline et des contrôles de simulation.
- Conserver la timeline immédiatement sous le viewport et de même largeur, la barre d’outils verticale et les quatre onglets de droite. Les commandes déplacées modifient uniquement la vue et gardent leur fonctionnement dans les différents modes.

**Périmètre prévu :** déplacement de `rink-bottomline` et remplacement de `tool-hint` dans `EditorView.vue`, nettoyage des styles/valeurs devenus inutiles, styles responsives de la nouvelle rangée, vérifications navigateur pertinentes et guide/aperçus. Aucun changement au store, aux poses, à l’historique, aux formats enregistrés, au moteur ou au calcul de lecture. BKL-014 couvre séparément la bande supérieure, approuvée dans le même message. BKL-006 demeure non approuvé.

**Critères d’acceptation :**

- La légende et les contrôles encadrés apparaissent dans la zone auparavant occupée par le texte barré; aucun doublon ne subsiste dans la surface de patinoire.
- La consigne générique visible est retirée de cette zone; l’aide accessible et les statuts nécessaires restent disponibles.
- Réduire/agrandir actualisent la vue et le pourcentage; Cadrer et Inverser conservent leurs effets. Ces actions ne modifient pas les positions, l’export ou l’historique du document.
- Sur desktop, la légende est à gauche et les contrôles à droite dans une même rangée. Sur tablette/mobile, tous restent lisibles et atteignables au clavier/toucher sans élargir la page.
- L’alignement viewport/timeline, la barre verticale, les onglets et la création d’une séquence conservent leur comportement.

**Validation prévue :** contrôles visuels et géométriques de la rangée et de l’absence de duplication sur Chromium desktop/mobile et WebKit mobile; activation clavier/pointeur/toucher du zoom/cadrage/inversion, vérification du pourcentage, des coordonnées et de l’absence de modification du document/historique; parcours pertinents en édition, montage, aperçu et simulation.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 014, 015, 016 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-016 — Cadrage de création sur l’en-tête Montage complet

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « Prefer the third screenshot for the auto scroll position ». La deuxième capture montre le titre Montage tout en haut avec la partie supérieure de la carte hors écran; la troisième montre la carte depuis son bord supérieur, avec « SÉQUENCE PÉDAGOGIQUE », Montage et les compteurs visibles, et un petit espace au-dessus.

**Situation actuelle :** BKL-013 aligne le h2 Montage sur le haut du viewport après création. Le libellé supérieur et le bord haut de la carte peuvent ainsi sortir de l’écran.

**Comportement proposé :**

- Après création explicite d’une séquence, prendre le bord supérieur de la carte d’en-tête Montage comme cible du défilement, avec une petite marge supérieure d’environ **8 px CSS**, conformément à la troisième capture.
- Afficher ensemble le bord supérieur de la carte, **SÉQUENCE PÉDAGOGIQUE**, **Montage**, le nombre d’étapes et la durée. Conserver la disposition responsive existante de l’en-tête.
- Garder le focus clavier sur le titre Montage tout en conservant le cadrage de la carte entière; le focus ne doit pas provoquer un second déplacement vers le titre seul.
- Conserver les règles de BKL-013 : défilement après rendu et création réussie, activations clic/toucher/Entrée/Espace, bornage naturel lorsque la page est trop courte, et comportement de défilement habituel lors de rechargement/import/historique ou de création bloquée.

**Périmètre prévu :** cible de défilement dans `TimelineHeader.vue` et styles/marge de défilement associés si nécessaires, adaptation des vérifications de cadrage BKL-013, guide et aperçus. Cette proposition ajuste le comportement livré par BKL-013; elle ne change ni la création de pose ni le reste de la disposition. BKL-014 et BKL-015 sont approuvés dans le même message et conservent leurs périmètres distincts. BKL-006 demeure non approuvé.

**Critères d’acceptation :**

- Après création, le bord supérieur de la carte se situe à environ 8 px CSS du haut du viewport de contenu, à un pixel près lorsque le défilement disponible le permet.
- Le libellé supérieur, Montage et les compteurs restent tous visibles, comme dans la troisième capture.
- Le titre reçoit le focus sans déplacer de nouveau la carte; les activations clavier, pointeur et toucher donnent le même cadrage.
- L’action reste unique au parcours de création explicite et préserve la pose initiale, l’onglet actif et les gardes existantes.
- Le cadrage s’adapte aux largeurs desktop/mobile et aux limites de hauteur du document.

**Validation prévue :** tests navigateur Chromium desktop/mobile et WebKit mobile mesurant le haut de la carte et la visibilité de ses éléments après création, plusieurs positions/hauteurs et activations; contrôle du focus, des limites de défilement et des gardes BKL-013; comparaison visuelle avec le cadrage de la troisième capture et actualisation des aperçus.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 014, 015, 016 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé.

## BKL-017 — Zoom et pan réinitialisés pendant la lecture

**Date de proposition :** 2026-11-20. **Origine :** vérification des commandes de vue déplacées par BKL-015. **Statut :** Implémenté.

**Problème observé :** pendant l’animation d’un montage, Agrandir passe à 120 % puis revient à 100 % au rendu suivant. En pause, le zoom reste à 120 %. Le déplacement BKL-015 ne modifie pas la caméra ou son watcher; le comportement vient de la logique existante de `RinkBoard.vue`.

**Reproduction en lecture seule :** Chromium, montage à deux étapes de 0 et 2 000 ms, vitesse 0,25×. Après activation d’Agrandir, les mesures de `data-zoom` sur quatre frames donnent `[120, 100, 100, 100, 100]` pendant la lecture, puis `[120, 120, 120, 120, 120]` après pause. Aucun fichier applicatif n’a été changé pour ce diagnostic.

**Cause identifiée :** le watcher existant `watch(() => [props.scenario.rink.length, props.scenario.rink.width], fit)` renvoie un nouveau tableau lorsque le scénario d’aperçu est remplacé. Son identité change à chaque rendu même lorsque les dimensions restent constantes, ce qui appelle `fit` et réinitialise zoom/pan.

**Comportement proposé :** observer les valeurs de longueur et largeur individuellement pour recadrer uniquement lorsque leurs valeurs changent. Conserver zoom/pan pendant les mises à jour de pose de lecture ou de simulation; garder Cadrer, Inverser et le cadrage nécessaire après changement de dimensions.

**Périmètre prévu :** source du watcher de caméra dans `RinkBoard.vue` et tests navigateur ciblés. Aucun changement au cadenceur, aux coordonnées enregistrées ou aux formats. Cette correction est séparée du déplacement de commandes BKL-015 et de BKL-006.

**Critères d’acceptation :**

- Zoom et pan choisis pendant une animation restent stables sur les frames suivantes et lors de la pause/reprise, lorsque les dimensions ne changent pas.
- Un changement réel de dimensions recadre toujours; Cadrer et Inverser conservent leurs actions.
- Les commandes restent utilisables en édition, montage et simulation, au clavier/pointeur/toucher, sans modifier poses, export ou historique.

**Validation prévue :** mesures du zoom et des marqueurs sur plusieurs frames, pause/reprise et simulation physique; changement de dimensions et commandes explicites de cadrage/inversion; tests Chromium desktop/mobile et WebKit mobile.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 017 to 022 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé. Voir la validation groupée de BKL-017 à BKL-022 ci-dessous.

## BKL-018 — Insérer une étape et ajouter après l’étape sélectionnée

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** capture annotée « Change etape suivante for Inserer une etape and add Ajouter une etape apres option », visant le bouton plus de la barre de montage.

**Situation actuelle :** le bouton plus porte le nom/infobulle Étape suivante et ajoute toujours deux secondes après la dernière pose du montage, quelle que soit l’étape sélectionnée. Le raccourci Insérer une étape ici capture séparément la pose au curseur.

**Comportement proposé :**

- Conserver un déclencheur compact **+**, nommé et décrit par **Insérer une étape**, ouvrant un menu avec deux actions explicites.
- **Insérer une étape** : insérer à l’instant du curseur en réutilisant la capture interpolée actuelle. Les étapes voisines et la durée ne sont pas déplacées; les bornes et l’espacement minimal existants s’appliquent. Le raccourci d’insertion au curseur déjà présent conserve cette même action.
- **Ajouter une étape après** : en édition d’une étape enregistrée sélectionnée, créer une pose Jeu copiée de celle-ci à **+2 secondes**, puis décaler de deux secondes les étapes qui la suivent. Cette règle garde leurs intervalles relatifs et leur contenu; elle prolonge la durée totale de deux secondes. Après la dernière étape, elle produit l’ajout de fin existant. Après la pose de départ seule, elle permet de commencer le montage.
- La nouvelle pose est sélectionnée pour placer les joueurs puis enregistrer, avec un ID propre et sans copier une consigne Observation sur la nouvelle étape Jeu. Les étapes existantes gardent leurs IDs, poses, types et annotations; seule leur date peut être décalée par Ajouter une étape après.
- Protéger les positions non enregistrées et respecter les limites de 120 étapes, cinq minutes et 100 ms entre poses. Ajouter après requiert l’édition d’une étape sélectionnée; en aperçu intermédiaire, l’action disponible est l’insertion au curseur. Lecture et simulation conservent leurs gardes.
- Menu utilisable au clavier/pointeur/toucher : libellés français complets, état ouvert, navigation des options, fermeture Échap/clic extérieur et retour du focus. Il reste visible hors de la zone défilante de la barre. La barre tient toujours sur une ligne, temps/vitesse à droite.

**Périmètre prévu :** commande d’ajout/menu dans `TimelineEditor.vue` (composant dédié si utile), opération d’ajout après sélection dans le store et les helpers de séquence, styles et accessibilité, tests numériques/de document et navigateur, guide et aperçus. Le format de séquence reste compatible. Aucun changement du calcul de lecture, de BKL-006 ou du correctif caméra BKL-017.

**Critères d’acceptation :**

- Le bouton plus est annoncé comme Insérer une étape et permet de choisir les deux actions demandées, avec les gardes propres à chacune.
- L’insertion au curseur capture exactement la pose intermédiaire sans déplacer ses voisines ni changer la durée.
- Ajouter après fonctionne au début, au milieu et à la fin : nouvelle pose à +2 s, étapes ultérieures décalées de +2 s, contenu existant intact et nouvelle pose sélectionnée.
- Une action impossible aux limites ou avec positions non enregistrées ne modifie pas le document. Une insertion/ajout forme une seule transaction annulable/rétablissable et reste compatible avec sauvegarde/import/export.
- Le menu et la barre restent accessibles sur desktop/tablette/mobile, sans rognage ou débordement de page; navigation, capture et type Observation restent fonctionnels.

**Validation prévue :** tests déterministes des dates, poses, IDs, annotations et limites; historique/persistance; parcours navigateur des deux options au curseur et après sélection, activation clavier/pointeur/toucher, menu dans une barre défilante et vérifications des états désactivés sur Chromium desktop/mobile et WebKit mobile.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 017 to 022 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé. Voir la validation groupée de BKL-017 à BKL-022 ci-dessous.

## BKL-019 — Commandes de vue dans la barre verticale à gauche

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** capture du groupe réduire / pourcentage / agrandir / cadrer / inverser, annotée « MOVE THESE WITH VERTICAL ICONS LEFT OF THE RINK ».

**Situation actuelle :** ces commandes de vue de la patinoire sont dans la rangée de bas de panneau, à droite de la légende, après BKL-015.

**Comportement proposé :**

- Déplacer ce groupe dans la barre verticale existante à gauche de la patinoire, sous les outils et Annuler/Rétablir, après un séparateur horizontal.
- Empiler **Réduire**, le **pourcentage de zoom** centré, **Agrandir**, **Cadrer la patinoire**, puis **Inverser la vue**. Garder les icônes et noms accessibles/infobulles français existants; le pourcentage reste synchronisé avec la caméra.
- Conserver la légende des équipes dans la rangée inférieure. Un seul exemplaire des commandes de vue et du pourcentage est rendu; le zoom propre à la timeline reste dans sa barre de montage.
- Intégrer les nouveaux boutons à la navigation Haut/Bas/Début/Fin de la toolbar et à l’activation Entrée/Espace. La valeur de pourcentage reste lisible et les cibles restent utilisables au toucher.
- Si la hauteur disponible ne suffit pas à afficher tous les groupes, permettre le défilement vertical interne de la barre et révéler la commande focalisée. La barre ne recouvre pas la glace et ne force pas une grande zone vide sous le viewport. Conserver l’alignement viewport/timeline, la largeur du panneau droit et le cadrage de création.
- Les commandes gardent leurs handlers et leur comportement de caméra existants. Le défaut de réinitialisation pendant l’animation reste proposé séparément en BKL-017.

**Périmètre prévu :** composition de la toolbar et de la rangée inférieure dans `EditorView.vue`, styles et défilement vertical, accessibilité/focus, vérifications navigateur et guide/aperçus. Aucun changement à la caméra, aux poses, au store, à l’historique ou au calcul de lecture. BKL-017 et BKL-006 restent non approuvés.

**Critères d’acceptation :**

- Les commandes de la capture et leur pourcentage sont regroupés verticalement dans la barre de gauche, dans l’ordre proposé, sans doublon dans la rangée inférieure.
- La légende reste disponible en bas du panneau; le zoom de la timeline conserve son emplacement et son fonctionnement.
- Zoom/cadrage/inversion gardent leurs effets existants en édition et aperçu en pause, sans modifier le document ni l’historique; leur disponibilité selon les modes est conservée.
- Toutes les commandes de la toolbar restent atteignables au clavier/pointeur/toucher, même avec faible hauteur; le focus révèle les éléments défilés sans superposition sur la glace ou élargissement de la page.
- La zone de glace agrandie par BKL-014, ses coordonnées, la timeline et les quatre onglets restent fonctionnels sur desktop/tablette/mobile.

**Validation prévue :** mesures de disposition et de défilement interne à plusieurs largeurs/hauteurs, contrôle visuel, navigation verticale et focus des nouveaux boutons, gestes tactiles et zoom/cadrage/inversion; vérifications du pourcentage, de l’export/historique et de l’alignement viewport/timeline sur Chromium desktop/mobile et WebKit mobile.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 017 to 022 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé. Voir la validation groupée de BKL-017 à BKL-022 ci-dessous.

## BKL-020 — Identité HockeyDoo et logo dans l’interface

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « Use HockeyDoo Rink Swoosh Logo.png and update the web app layout to reflect the same look and feel and incorporate the logo to the ui. »

**Source retrouvée et inspectée :** `/Users/jackycote/Downloads/HockeyDoo Rink Swoosh Logo.png`, PNG RGB de 2 007 × 783 px. Le logo présente un mot-symbole HockeyDoo en lettres grasses inclinées, une patinoire et une rondelle, en bleu marine, bleu vif, blanc et touches rouges. L’asset actuel possède un fond blanc.

**Situation actuelle :** les pages Atelier et Fondations utilisent le monogramme HIQ, le nom Hockey IQ et une palette vert/beige. Les styles de l’éditeur, du montage et de la simulation partagent cette apparence, avec des couleurs codées dans leurs feuilles de styles.

**Comportement proposé :**

- Intégrer le fichier fourni comme asset local de l’application et l’utiliser dans le lien de marque des en-têtes Atelier et Fondations. Respecter ses proportions, son fond blanc et son dessin; l’afficher sur un en-tête blanc avec une taille responsive lisible qui laisse de la place à la navigation. Associer un nom accessible HockeyDoo et conserver le lien vers l’accueil.
- Remplacer la marque visible Hockey IQ/HIQ par **HockeyDoo** sur ces surfaces de navigation et dans le titre d’onglet du navigateur; conserver Atelier tactique comme description du produit et les textes pédagogiques/scénarios existants.
- Harmoniser la présentation autour du **bleu marine** pour les titres/textes structurants, du **bleu vif** pour les actions et sélections, de **fonds blancs/bleu glace** et de **touches rouges** pour les accents pertinents. Remplacer l’habillage vert/beige par cette identité dans les en-têtes, panneaux, onglets, boutons, champs, toolbar, timeline et contrôles de simulation.
- Donner aux titres et actions une présence plus nette et sportive, inspirée des lignes du logo, avec une typographie sans sérif lisible, des contours sobres et des espacements cohérents. Garder les textes de saisie et de consigne faciles à lire; réserver les accents graphiques à la structure de l’interface.
- Harmoniser les couleurs des équipes et des repères visuels entre la glace, le roster et la légende si elles sont adaptées à la palette; conserver deux équipes clairement distinctes et les différences entre sélection, Observation, enregistrement, erreur et état désactivé. Ces ajustements restent visuels et ne changent aucun identifiant ou rôle du modèle.
- Conserver la composition fonctionnelle actuelle (patinoire/timeline, barre verticale, quatre onglets), les comportements, les noms accessibles des commandes et le cadrage complet de Montage. La largeur demandée et le déplacement de Réinitialiser sont couverts séparément par BKL-021 et BKL-022.

**Périmètre prévu :** asset statique local, en-têtes d’Atelier/Fondations, libellés de marque et titre HTML, styles globaux/éditeur/timeline/simulation et palette de rendu si nécessaire pour la cohérence visuelle; vérifications d’accessibilité/disposition, guide et aperçus. Aucun changement de calcul tactique, simulation, interpolation, document enregistré, historique ou stockage. Les noms des packages et des formats techniques restent compatibles. Les propositions BKL-006, BKL-017, BKL-018 et BKL-019 restent distinctes et non approuvées.

**Critères d’acceptation :**

- Le logo fourni apparaît correctement dans les en-têtes des deux pages, avec proportions préservées, lien d’accueil et nom accessible HockeyDoo, sur desktop et mobile.
- La marque et le titre navigateur reflètent HockeyDoo; la présentation des panneaux, contrôles et montage reprend une palette et une hiérarchie cohérentes avec le logo.
- Les équipes, états sélectionnés/désactivés, consignes d’Observation, champs et focus restent lisibles et distincts. Les repères de glace et de roster restent concordants.
- Aucun débordement horizontal ou commande inaccessible sur petites largeurs; le logo ne masque ni navigation ni contenu utile de la patinoire.
- Édition, capture, lecture, quatre onglets, import/export, sauvegarde et historique conservent leur fonctionnement et leurs données.

**Validation prévue :** contrôle visuel des pages et des états édition/montage/Observation, logo chargé et ratio correct, noms accessibles et focus, contraste et lisibilité des nouveaux styles; géométrie desktop/tablette/mobile et non-régression pertinente sur Chromium desktop/mobile et WebKit mobile, puis checks du projet.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 017 to 022 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé. Voir la validation groupée de BKL-017 à BKL-022 ci-dessous.

## BKL-021 — Panneau droit 15 % plus large

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « Make right panel 15% wider ».

**Situation actuelle :** la grille desktop réserve 320 px au panneau à onglets de droite; la colonne de gauche prend la largeur restante. À 1 000 px et moins, le panneau passe sous la patinoire et occupe la largeur disponible.

**Comportement proposé :** augmenter la largeur desktop du panneau de **320 à 368 px** (320 × 1,15). Laisser la patinoire et la timeline remplir le reste de la colonne de gauche. Conserver l’adaptation du panneau à la largeur disponible lorsqu’il est empilé sous la patinoire, sans dépasser le viewport. Les quatre onglets et leurs champs utilisent l’espace supplémentaire.

**Périmètre prévu :** largeur de grille et styles responsives pertinents dans `editor.css`, adaptations des mesures navigateur qui attendent 320 px, guide et aperçus. Aucun changement des données, des actions ou du cadrage de caméra.

**Critères d’acceptation :**

- Sur les largeurs desktop où deux colonnes sont affichées, le panneau mesure 368 px à un pixel CSS près et reste aligné au bord droit de l’atelier.
- La patinoire/timeline remplissent toute la largeur restante, avec les mêmes bords entre viewport et montage, sans chevauchement ou débordement.
- Sur tablette/mobile en disposition empilée, le panneau respecte la largeur disponible et les onglets/champs restent accessibles.
- Le cadrage après création, les commandes, les sélections et les positions enregistrées restent corrects après redimensionnement.

**Validation prévue :** mesures de largeur et alignement à plusieurs tailles, contrôle visuel des onglets, absence de débordement, redimensionnement et non-régression pertinente sur les trois projets navigateur.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 017 to 022 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé. Voir la validation groupée de BKL-017 à BKL-022 ci-dessous.

## BKL-022 — Réinitialiser en premier dans la barre verticale

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** capture de Réinitialiser le scénario, annotée « Move this left of the rink with other vertical icons, make it first at the top ».

**Situation actuelle :** Réinitialiser le scénario est seul dans une rangée au-dessus de la patinoire. La barre verticale commence par Déplacer, puis les autres outils et Annuler/Rétablir.

**Comportement proposé :**

- Déplacer **Réinitialiser le scénario** en toute première position en haut de la barre verticale gauche, avant Déplacer. Le séparer visuellement des outils de manipulation tout en conservant une seule colonne de commandes.
- Supprimer l’ancienne rangée supérieure devenue vide pour libérer son espace. Conserver le viewport agrandi, son alignement avec la timeline, et les panneaux de droite.
- Garder l’icône, le nom accessible, l’infobulle et l’action de réinitialisation actuels, avec leurs gardes et la restauration possible via l’historique. La commande reste une action distincte d’un outil actif.
- L’intégrer à la navigation Haut/Bas/Début/Fin et à l’activation Entrée/Espace. Si la hauteur disponible est insuffisante, garder toutes les commandes atteignables par défilement interne avec révélation au focus, sans recouvrir la glace ou imposer un espace vide sous elle.
- Si BKL-019 est ensuite approuvé, Réinitialiser reste le premier élément et les commandes de vue rejoignent leur groupe distinct plus bas.

**Périmètre prévu :** position du bouton et retrait de la rangée supérieure dans `EditorView.vue`, styles de la toolbar et du défilement si nécessaire, navigation/focus et vérifications de disposition/action, guide et aperçus. Aucun changement de logique de réinitialisation, de garde, de moteur ou de format.

**Critères d’acceptation :**

- Réinitialiser est le premier bouton visuel et clavier de la barre lorsqu’il est disponible; aucune copie ni rangée supérieure vide ne subsiste.
- L’action, son nom accessible, son infobulle et les états désactivés en simulation/aperçu/lecture restent ceux existants; l’historique garde son comportement.
- La commande et les autres outils restent accessibles au pointeur/toucher/clavier, avec un focus visible et la bonne révélation en cas de défilement.
- La glace n’est pas recouverte et l’alignement viewport/timeline, les quatre onglets et le cadrage Montage sont préservés sur desktop/tablette/mobile.

**Validation prévue :** ordre et géométrie de la toolbar à plusieurs largeurs/hauteurs, activation de réinitialisation et annulation, gardes en modes non éditables, navigation clavier et toucher, contrôle visuel et non-régression pertinente sur Chromium desktop/mobile et WebKit mobile.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 017 to 022 ». **Implémentation :** terminée le 2026-11-20 dans le périmètre approuvé. Voir la validation groupée de BKL-017 à BKL-022 ci-dessous.

## BKL-023 — Texte alternatif et aides des icônes

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « Add alt text for all icons ».

**Constat en lecture seule :** les boutons de la barre gauche ont déjà des noms accessibles, mais Réduire/Agrandir n’ont pas d’infobulle. Plusieurs commandes de la timeline, dont précédent, lecture/pause et suivant enregistré, ont un nom accessible sans infobulle. Le SVG partagé est décoratif (`aria-hidden`) : le nom de l’action doit être porté par sa commande, sans annonce redondante du dessin.

**Comportement proposé :** auditer toutes les icônes des pages Atelier et Fondations, y compris toolbar, montage, simulation, documents et menus. Chaque commande à icône reçoit un libellé français descriptif pour les lecteurs d’écran et une aide textuelle visible au survol et au focus clavier. Les noms des actions dynamiques reflètent leur état (Lecture/Pause, Annuler/Rétablir, etc.). Les icônes accompagnées d’un libellé visible ne provoquent pas d’annonce double; les icônes purement décoratives restent masquées aux lecteurs d’écran. Les images informatives conservent un texte alternatif pertinent, dont le logo HockeyDoo. Sur tactile, les commandes et leurs noms accessibles restent utilisables sans exiger un survol.

**Périmètre prévu :** inventaire des commandes à icônes, libellés et aides contextuelles partagées si utile, composants/styles concernés et tests d’accessibilité/navigateur. Aucun changement de données, d’actions, de moteur ou de format. Conserver les noms accessibles existants lorsqu’ils décrivent correctement l’action.

**Critères d’acceptation :**

- Chaque commande représentée par une icône possède un nom accessible français explicite; aucune commande n’est annoncée comme bouton sans nom.
- Une aide correspondante est lisible au survol et au focus clavier, sans être rognée par les conteneurs défilants ni occuper de place permanente dans la disposition. Les boutons désactivés restent identifiables au survol lorsque le navigateur le permet; leur nom accessible est conservé.
- Les états dynamiques ont des libellés à jour et les icônes décoratives n’ajoutent pas d’annonces parasites.
- Clavier, lecteurs d’écran, toucher, actions et focus existants restent fonctionnels; aucun débordement sur mobile.

**Validation prévue :** audit des noms accessibles et aides, focus/survol dans les deux barres et les menus, Lecture/Pause, commandes désactivées et actions de document/simulation; contrôles Chromium desktop/mobile et WebKit mobile, puis checks appropriés du projet.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 006, 023 and 024 ». **Implémentation :** terminée le 2026-11-20. Voir la validation groupée de BKL-006, BKL-023 et BKL-024 ci-dessous.

## BKL-024 — Zoom compact dépliant à droite

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « Change this for a slide out right control to save on verticl space », avec capture du groupe vertical Réduire / 100 % / Agrandir dans la barre à gauche de la glace.

**Interprétation proposée :** compacter ce groupe de zoom de la patinoire, en conservant le reste de la barre verticale. Cadrer et Inverser restent des commandes distinctes à leur emplacement actuel; le zoom de la timeline conserve son panneau vertical existant.

**Comportement proposé :** remplacer les trois éléments empilés Réduire/pourcentage/Agrandir par un seul bouton d’icône Zoom de la patinoire. Son activation ouvre un petit panneau horizontal vers la droite, au-dessus de la glace, sans pousser la patinoire/timeline ou consommer une rangée verticale supplémentaire. Le panneau contient Réduire, un curseur horizontal de 100 à 300 %, le pourcentage courant et Agrandir. Les boutons gardent leurs incréments actuels (facteur 1,2); le slider permet le réglage direct, par pas de 10 points de pourcentage. Le panneau reflète aussi les changements par molette/pincement, Cadrer et les changements de dimensions. Il respecte les limites de la caméra et reste utilisable pendant lecture/simulation, en conservant le correctif BKL-017.

**Accessibilité et comportement :** déclencheur nommé avec son état ouvert/fermé et le zoom courant; ouverture clic/toucher/Entrée/Espace, slider natif au clavier, aides BKL-023 lorsqu’il est approuvé. Échap ferme et restitue le focus; un clic extérieur ferme sans détourner le focus de la nouvelle cible. Le panneau est ancré au bouton, suit défilement/redimensionnement et reste dans le viewport, y compris à 320 px; sa largeur/position s’adaptent à l’espace disponible. Le défilement de la toolbar et sa révélation au focus restent opérationnels.

**Périmètre prévu :** groupe zoom dans EditorView/composant dédié si utile, raccordement aux commandes de caméra existantes, styles/ancrage/focus et tests de disposition/interaction. Aucun changement des positions, étapes, historique, données sauvegardées ou moteur. BKL-006 reste distinct.

**Critères d’acceptation :**

- À l’état fermé, le zoom n’occupe qu’un emplacement de bouton dans la barre gauche, libérant l’espace des anciens éléments empilés; aucun doublon des contrôles.
- Le panneau s’ouvre vers la droite et réunit les réglages horizontalement; aucune modification de la largeur/hauteur du viewport ou de la timeline à son ouverture.
- Pourcentage, limites 100–300 %, boutons et slider sont synchronisés avec la caméra; zoom, pan, cadrage et inversion gardent leurs effets prévus sans modifier le document ou son historique.
- Clavier, toucher, fermeture et focus fonctionnent; le panneau n’est pas coupé par la toolbar et ne déborde pas du viewport sur desktop/tablette/mobile.
- Les commandes Cadrer/Inverser et le zoom vertical du montage restent accessibles et distincts.

**Validation prévue :** hauteur économisée et alignement, panneau ouvert/fermé à plusieurs largeurs, slider et boutons, synchronisation molette/pincement/cadrage, stabilité en animation, focus/fermeture et document/historique inchangés; contrôles Chromium desktop/mobile et WebKit mobile, puis checks pertinents du projet.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 006, 023 and 024 ». **Implémentation :** terminée le 2026-11-20. Voir la validation groupée de BKL-006, BKL-023 et BKL-024 ci-dessous.

## BKL-025 — Barre gauche plus compacte verticalement

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « reduce the vertical space between these icons », avec capture de la barre d’outils verticale à gauche de la patinoire.

**Constat en lecture seule :** la barre utilise des boutons de 40 px de haut, un gap de 3 px, un padding vertical de 6 px et des séparateurs de 1 px avec 6 px de marge au-dessus/en dessous. L’espacement visible comprend donc aussi le padding interne des boutons et les séparateurs, pas seulement le gap. Le zoom compact dépliant BKL-024 est conservé.

**Comportement proposé :** réduire la hauteur/padding vertical des boutons à **34 px sur souris**, avec icônes de taille inchangée et largeur de bouton conservée à 40 px. Réduire le gap de 3 à **2 px**, les marges verticales des séparateurs de 6 à **3 px**, et le padding haut/bas de la barre de 6 à **4 px**. Les centres des boutons successifs passent de 43 à 36 px sur souris. Sur dispositif à pointeur tactile, conserver les cibles de 40 px de haut tout en appliquant les marges et gaps réduits. Les groupes restent distincts, Réinitialiser reste premier et le défilement interne continue à révéler toutes les commandes.

**Périmètre prévu :** styles limités à la toolbar gauche dans `editor.css`, adaptation des mesures navigateur qui attendent une hauteur minimale de 38 px sur souris, vérification visuelle/géométrique et des interactions concernées; documentation et aperçu si utile. Aucun changement à l’ordre, aux actions, à la largeur de la barre ou des panneaux, au viewport, au zoom dépliant, aux étapes ou au moteur.

**Critères d’acceptation :**

- La colonne est visiblement plus dense sur desktop : centres des boutons successifs espacés de 36 px, séparateurs conservés avec marges plus courtes, tailles des dessins inchangées.
- Les cibles restent de 40 × 40 px sur tactile; la barre conserve sa largeur de 52 px et n’empiète pas sur la glace.
- Tous les boutons et leurs aides restent accessibles au clavier/pointeur/toucher, avec focus visible et révélation après défilement; le zoom dépliant reste ancré correctement.
- Viewport/timeline restent alignés, sans débordement ni espace vertical imposé par la barre. Le reste des commandes de l’application conserve ses dimensions.

**Validation prévue :** mesures et captures desktop/mobile, contrôle de la hauteur gagnée, séparateurs et icônes, navigation verticale et historique, aides au focus/survol et ouverture du zoom à plusieurs largeurs; vérifications ciblées Chromium desktop/mobile et WebKit mobile, puis checks proportionnés au changement.

**Décision utilisateur :** approuvé le 2026-11-20, message exact : « approve 025 ». **Implémentation :** terminée le 2026-11-20. Voir la validation de BKL-025 ci-dessous.

## BKL-026 — Remettre le zoom à 100 % depuis son panneau

**Date de proposition :** 2026-11-20. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** capture du panneau horizontal de zoom annotée « Add a reset button to go back to 100% ».

**Comportement proposé :** ajouter une icône de réinitialisation à droite du bouton + dans le panneau de zoom de la patinoire. Son nom accessible et son infobulle sont **Réinitialiser le zoom à 100 %**. Elle reprend le cadrage de caméra existant : retour à 100 % et recentrage, avec orientation de vue conservée. Le panneau reste ouvert, le focus reste sur la commande activée et le slider/pourcentage se mettent à jour immédiatement. La commande reste disponible à 100 % et en édition/aperçu/lecture/simulation, comme les autres commandes de vue. L’action n’affecte pas le scénario, ses étapes ou son historique.

**Périmètre prévu :** bouton dans `RinkZoom.vue`, raccordement à la commande de cadrage de `RinkBoard` via `EditorView.vue`, adaptation de largeur/espacement du panneau si nécessaire et vérifications ciblées. Conserver la rangée horizontale, l’ancrage à droite, la compacité de la toolbar BKL-025, les limites du slider et l’accessibilité BKL-023.

**Critères d’acceptation :**

- Le panneau comporte un bouton de réinitialisation clairement nommé avec aide au survol/focus; activation clavier, clic et toucher.
- Depuis un zoom arbitraire entre 100 et 300 %, une activation revient à 100 %; slider, pourcentage et description du déclencheur sont synchronisés. La caméra est recentrée sans changer l’inversion de vue.
- Le panneau reste ouvert avec un focus utilisable; Échap, clic/focus extérieur et redimensionnement gardent leurs comportements.
- Aucun débordement à 320 px, pas de nouvelle rangée verticale permanente et aucune modification du document/export/historique. L’action reste utilisable pendant lecture/simulation.

**Validation prévue :** zoom augmenté puis remise à 100 % par clavier/pointeur/toucher, synchronisation et orientation, focus/aide, géométrie desktop/mobile et vérification du document inchangé; contrôles ciblés Chromium desktop/mobile et WebKit mobile, puis checks proportionnés.

**Décision utilisateur :** message exact du 2026-11-20 : « approve 025 and 206 ». Dans le contexte de la demande d’approbation immédiatement précédente, « 206 » est interprété comme BKL-026 (aucune proposition BKL-206); cette interprétation est annoncée à l’utilisateur avant modification applicative. BKL-025 est déjà implémenté. **Implémentation de BKL-026 :** terminée le 2026-11-20. Voir la validation de BKL-026 ci-dessous.

## Autorisation globale v1.2 — 2026-11-20

Message utilisateur exact : « Inspect Hockey_Doo_MVP_v1.2.zip in downloads and implement them all. I would like that you implement all milstones without my interventoin during the night while I am sleeping. Is this something you can do ? » (espaces normalisés).

Cette instruction autorise explicitement tous les jalons du package v1.2 et les décisions d’implémentation nécessaires sans nouvelle validation entre jalons. Elle prévaut sur les arrêts pour revue M0 des documents importés et sur l’approbation individuelle antérieure pour ce périmètre. Les propositions BKL-027 à BKL-036 sont enregistrées et approuvées ici **avant modification applicative**. Les documents v1.2 sont normatifs, devant v1.1 et v1.0; leurs originaux sont préservés avec empreintes sous `docs/source/v1.2`. Aucune autorisation de paiement réel, publication publique, déploiement de production ou communication externe n’est inférée.

Les jalons incluent implémentation, tests, démonstration locale, données factices et bilan. Les revues humaines externes, fournisseur OIDC/hébergement et décisions juridiques ouvertes restent des dépendances de lancement à documenter honnêtement. Les exigences hors périmètre (paiements réels, MP4, réseau social, IA générative, 3D) restent exclues.

## BKL-027 — M0 v1.2 — contrats, stockage PostgreSQL, migrations/seeds et architecture

**Statut :** Implémenté. **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** voir les preuves par jalon et les limites dans [V1.2-STATUS.md](V1.2-STATUS.md). `pnpm check` réussi : 190 tests unitaires/API, formatage, lint, typage strict et builds. Les revues humaines, le fournisseur de production et le contrôle PostgreSQL17/MinIO combiné restent explicitement externes.

## BKL-028 — M1 v1.2 — projets et éditeur de scénarios intégrés

**Statut :** Implémenté. **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** voir les preuves par jalon et les limites dans [V1.2-STATUS.md](V1.2-STATUS.md). `pnpm check` réussi : 190 tests unitaires/API, formatage, lint, typage strict et builds. Les revues humaines, le fournisseur de production et le contrôle PostgreSQL17/MinIO combiné restent explicitement externes.

## BKL-029 — M2 v1.2 — exécution déterministe et enregistrement des interventions

**Statut :** Implémenté. **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** voir les preuves par jalon et les limites dans [V1.2-STATUS.md](V1.2-STATUS.md). `pnpm check` réussi : 190 tests unitaires/API, formatage, lint, typage strict et builds. Les revues humaines, le fournisseur de production et le contrôle PostgreSQL17/MinIO combiné restent explicitement externes.

## BKL-030 — M3 v1.2 — 2-1-2 et quatre sorties de zone contextuelles

**Statut :** Implémenté. **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** voir les preuves par jalon et les limites dans [V1.2-STATUS.md](V1.2-STATUS.md). `pnpm check` réussi : 190 tests unitaires/API, formatage, lint, typage strict et builds. Les revues humaines, le fournisseur de production et le contrôle PostgreSQL17/MinIO combiné restent explicitement externes.

## BKL-031 — M3.5 v1.2 — systèmes, règles typées, validation et versions

**Statut :** Implémenté. **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** voir les preuves par jalon et les limites dans [V1.2-STATUS.md](V1.2-STATUS.md). `pnpm check` réussi : 190 tests unitaires/API, formatage, lint, typage strict et builds. Les revues humaines, le fournisseur de production et le contrôle PostgreSQL17/MinIO combiné restent explicitement externes.

## BKL-032 — M4 v1.2 — replays figés, annotations et publication de leçons

**Statut :** Implémenté. **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** voir les preuves par jalon et les limites dans [V1.2-STATUS.md](V1.2-STATUS.md). `pnpm check` réussi : 190 tests unitaires/API, formatage, lint, typage strict et builds. Les revues humaines, le fournisseur de production et le contrôle PostgreSQL17/MinIO combiné restent explicitement externes.

## BKL-033 — M5 v1.2 — organisations, équipes, membres, sessions et invitations

**Statut :** Implémenté. **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** voir les preuves par jalon et les limites dans [V1.2-STATUS.md](V1.2-STATUS.md). `pnpm check` réussi : 190 tests unitaires/API, formatage, lint, typage strict et builds. Les revues humaines, le fournisseur de production et le contrôle PostgreSQL17/MinIO combiné restent explicitement externes.

## BKL-034 — M5.5 v1.2 — plans FREE/TEAM_PRO et quotas atomiques

**Statut :** Implémenté. **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** voir les preuves par jalon et les limites dans [V1.2-STATUS.md](V1.2-STATUS.md). `pnpm check` réussi : 190 tests unitaires/API, formatage, lint, typage strict et builds. Les revues humaines, le fournisseur de production et le contrôle PostgreSQL17/MinIO combiné restent explicitement externes.

## BKL-035 — M6 v1.2 — catalogue, affectations et portail joueur mobile

**Statut :** Implémenté. **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** voir les preuves par jalon et les limites dans [V1.2-STATUS.md](V1.2-STATUS.md). `pnpm check` réussi : 190 tests unitaires/API, formatage, lint, typage strict et builds. Les revues humaines, le fournisseur de production et le contrôle PostgreSQL17/MinIO combiné restent explicitement externes.

## BKL-036 — M7 v1.2 — E2E, sécurité, observabilité, performance et guides

**Statut :** Implémenté (livraison technique; validations externes de lancement restantes). **Approbation :** autorisation globale v1.2 ci-dessus, 2026-11-20.

**Périmètre et critères :** jalon correspondant de [PLAN_DEVELOPPEMENT_v1.2.md](source/v1.2/PLAN_DEVELOPPEMENT_v1.2.md), addendum v1.2 et exigences héritées compatibles. Plan de fichiers, dépendances, preuves attendues et progression détaillés dans [V1.2-STATUS.md](V1.2-STATUS.md).

**Validation réalisée :** contrôles techniques, sauvegarde/restauration, 190 tests unitaires/API/OIDC, scans axe et suite navigateur complète (180 réussites, trois skips de plateforme). Les revues humaines et de déploiement restent des dépendances de lancement; voir [V1.2-STATUS.md](V1.2-STATUS.md).

## BKL-037 — Démonstrations : timeline des étapes, lecture animée pas à pas et bulle descriptive

**Date de proposition :** 2026-11-21. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** afficher chaque étape d'une démonstration sur une timeline; ajouter une icône de lecture pas à pas qui anime jusqu'à l'étape suivante puis s'arrête; conserver l'icône de lecture complète. La capture demande aussi une bulle descriptive dans l'espace à gauche de la patinoire.

**Constat :** l'essai du catalogue propose actuellement une lecture continue et une avance d'un seul tick physique (1/30 s), sans étapes pédagogiques ni timeline. Le lecteur des leçons possède un curseur temporel et des annotations, sans navigation animée entre étapes pédagogiques. Ces deux parcours nécessitent une présentation cohérente.

**Comportement proposé :**

1. Afficher une timeline immédiatement sous la patinoire, dans la même largeur, à côté des commandes de lecture. Montrer des repères numérotés avec leur temps et leur titre; mettre en évidence l'étape courante et la tête de lecture. Cliquer un repère place la démonstration à cet instant et la met en pause. Les petits écrans défilent dans la timeline sans élargir la page.
2. Une étape est un moment pédagogique identifiable : situation initiale, récupération, lecture de pression/soutien, passe ou renversement, réception, transition ou perte de possession. Utiliser les annotations horodatées existantes et les événements réellement visibles dans la piste; regrouper les repères simultanés et éviter une étape par tick. Prévoir début/fin et un repli compréhensible pour une séquence sans annotation. Ne pas annoncer une action absente du déroulement.
3. Ajouter une icône distincte **Lire jusqu’à l’étape suivante** : depuis l'instant courant, animer normalement jusqu'au prochain repère strictement ultérieur, s'y arrêter exactement et afficher sa description. Une nouvelle activation lance le segment suivant. Conserver vitesse et possibilité de pause; gérer le début, le milieu d'un segment, la dernière étape et les clics répétés sans sauter de repère.
4. Conserver l'icône **Tout lire**, qui traverse les nouveaux repères sans arrêt automatique à chacun. Les pauses pédagogiques explicites déjà présentes dans les leçons conservent leur comportement. Les deux commandes utilisent la même piste et la même position; passer d'un mode à l'autre ne redémarre pas la démonstration.
5. Afficher une bulle **Étape n/N · titre · description**, dans l'espace libre à gauche de la glace comme sur la capture. Expliquer l'action et l'information à observer, sans IDs internes. La description reste lisible pendant l'arrêt et se met à jour avec l'étape. Adapter la bulle au-dessus de la glace sur petit écran pour préserver la visibilité des joueurs et de la rondelle.
6. Appliquer ce comportement à **Essayer le modèle** et au lecteur des démonstrations publiées. Pour l'essai, préparer un déroulement déterministe borné dans le Worker afin de disposer des repères et de permettre la navigation; les deux modes lisent les mêmes états. Les publications existantes restent lisibles; calculer les repères de présentation sans modifier leurs snapshots immuables. L'édition de poses du montage local reste hors de cette proposition.

**Périmètre prévu :** contrôles partagés de timeline/lecture pédagogique dans `apps/web/src/platform`, intégration dans `CatalogTest.vue`, `LessonPlayer.vue` et `TeamRink.vue`, icône et aides françaises accessibles; adaptation bornée du protocole Worker si nécessaire. Guides et tests associés. Pas d'écriture des anciennes publications ni de changement des règles physiques pour créer artificiellement des étapes.

**Critères d'acceptation :** chaque repère correspond à un état et une description vérifiables; timeline sous la patinoire et bulle à l'emplacement demandé; lecture pas à pas animée avec arrêt exact à chaque repère, reprise au suivant sans reboucler; lecture complète toujours disponible; sélection/seek et changement de vitesse cohérents; aucune perte de position au changement de mode; restitution identique des snapshots et des leçons existantes; commandes clavier/tactiles nommées, focus visible, annonce de l'étape aux arrêts et absence de débordement mobile.

**Validation prévue :** tests du calcul des repères et des arrêts (repères rapprochés/simultanés, grands incréments, départ exact d'un repère, fin, absence d'annotations); tests navigateur sur essai D à D et leçon publiée, clavier/toucher, mode continu/pas à pas, sélection directe, changement de vitesse et bulle; scans axe et captures desktop/mobile. Vérifier les hashes de la piste et la non-régression de l'ancien montage.

**Approbation :** reçue le 2026-11-21 : « implement 037 ». Approbation enregistrée avant modification applicative.

**Validation réalisée — 2026-11-21 :**

- `pnpm check` réussi : formatage, lint, typage strict, **197 tests unitaires/API dans 18 fichiers** et builds. Sept tests ajoutés pour les repères, événements réels, immutabilité, annotations simultanées, marqueurs rapprochés, reprise exacte et pauses explicites triées.
- **66 tests navigateur réussis**, sans skip ni échec, Chromium desktop/mobile et WebKit mobile : démonstrations, parcours coach→joueur, scans axe, parité Worker/Node et suite complète du montage local.
- **Six vérifications renforcées supplémentaires réussies** : activation tactile, navigation clavier, bascule directe de lecture continue à pas à pas sans retour au début, arrêt sur un repère réel et seek intermédiaire, sur les mêmes trois navigateurs.
- Piste d'essai D à D de 12 secondes préparée dans le Worker; sept étapes observées, dont renversement à 0,63 s, réception à 1,57 s et sortie de zone à 4,07 s. Hashes comparés au moteur Node et checksum publié vérifié inchangé après utilisation.
- Timeline alignée avec la surface de visualisation; bulle à gauche sur desktop et au-dessus sur mobile; défilement horizontal interne sans élargir la page. Captures contrôlées : [desktop](demo/demonstration-steps-desktop.png), [mobile WebKit](demo/demonstration-steps-mobile.png).
- Guide : [DEMONSTRATION-STEPS.md](DEMONSTRATION-STEPS.md). Démonstration sur `http://127.0.0.1:5184/equipes`; actualiser le navigateur. Validation locale en navigateurs émulés, sans téléphone physique ni CI distante revendiquée.

## BKL-038 — Nom anglais d’origine des démonstrations

**Date de proposition :** 2026-11-21. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « We need to show the original "english" name for each demontration. »

**Constat :** les quatre démonstrations du catalogue affichent uniquement leur nom français. Le modèle tactique associé conserve son identifiant anglais dans le snapshot : `BOARDS_BREAKOUT`, `D_TO_D_REVERSE`, `LOW_CENTER_SUPPORT`, `UNDER_PRESSURE_BREAKOUT`.

**Comportement proposé :** afficher un nom anglais lisible à côté du titre français dans chaque carte du catalogue, dans l’en-tête de l’essai et dans le lecteur des démonstrations publiées ou affectées. Correspondances : **Boards Breakout**, **D-to-D Reverse**, **Low Center Support**, **Under Pressure Breakout**; pour une séquence utilisant `FORECHECK_212`, **Forecheck 2-1-2**. Conserver le titre français et les titres personnalisés. Déduire le nom anglais du modèle associé à la séquence, sans transformer un ID technique en libellé visible ni modifier les publications enregistrées. Pour une leçon à plusieurs séquences, afficher le nom du modèle de la séquence courante.

**Périmètre prévu :** table de libellés anglais et présentation dans les cartes du catalogue, `CatalogTest.vue` et `LessonPlayer.vue`; guide des démonstrations. Aucun changement aux événements, aux étapes ou aux commandes de lecture.

**Critères d’acceptation :** les quatre démonstrations présentent chacune le bon nom anglais dans les trois parcours; le nom correspond au modèle courant après changement de séquence; le français reste visible; présentation lisible sur desktop/mobile, nom anglais identifié par `lang="en"`; aucune modification des snapshots, checksums ou titres enregistrés.

**Validation prévue :** vérification ciblée des quatre correspondances et des titres dans catalogue/essai/lecteur, changement de séquence, contrôle de disposition mobile et vérification de formatage/typage appropriée.

**Décision utilisateur :** approuvé le 2026-11-21, message exact : « I approve 038 ». Approbation enregistrée avant modification applicative.

**Validation réalisée — 2026-11-21 :**

- Table de présentation exhaustive des cinq modèles dans `labels.ts`; nom anglais sous le titre français dans les cartes du catalogue, l’essai et le lecteur. Langue `en` déclarée; aucune modification des noms sauvegardés, des contrats ou des pistes.
- Lint, typage strict de tous les packages/apps et des outils/tests, build web de production, formatage et `git diff --check` réussis. Aucun nouveau test unitaire pour ce changement de présentation.
- **12 tests navigateur existants réussis**, sans échec ni skip : démonstrations pas à pas/continues et accessibilité, Chromium desktop/mobile et WebKit mobile. Les états et commandes de BKL-037 restent vérifiés.
- Vérification ciblée sur le serveur de démonstration, dans chacun de ces trois navigateurs : quatre cartes, quatre essais et quatre lecteurs publiés avec les bons noms anglais et titres français; données API intégralement identiques avant/après consultation. Lecture d’une affectation réelle M11 également vérifiée.
- Fixture limitée aux réponses du navigateur pour une leçon regroupant les quatre pistes originales et une piste Forecheck générée : les cinq changements de séquence actualisent le nom anglais, conservent le titre personnalisé et remettent la position à zéro. Aucun enregistrement en base pour cette fixture. Scans axe sans violation A/AA et absence de débordement de page vérifiés.
- Captures de cette fixture : [desktop](demo/demonstration-english-desktop.png), [mobile Chromium](demo/demonstration-english-mobile.png), [mobile WebKit](demo/demonstration-english-mobile-webkit.png); desktop et WebKit contrôlés visuellement. Validation locale en navigateurs émulés, sans téléphone physique.
- Guide des démonstrations actualisé. Bundle disponible sur `http://127.0.0.1:5184/equipes`; actualiser la page. Serveurs existants conservés.

## BKL-039 — Libellé de navigation uniforme

**Date de proposition :** 2026-11-21. **Demandeur :** utilisateur. **Statut :** Implémenté.

**Demande :** « When in equipes route, the navigation shows "atelier libre" and when in root route, it shows "Atelier", I would like both roure to show "Atelir" »

**Constat :** le lien vers `/` affiche « Atelier libre » sur `/equipes` et « Atelier » sur `/`. La valeur de l’éditeur sert aussi à nommer des éléments hors navigation.

**Comportement approuvé :** afficher exactement « Atelier » pour le lien de navigation vers `/` sur les deux routes, selon la correction de l’utilisateur.

**Périmètre prévu :** libellés de navigation de l’éditeur et de l’espace équipe, et tests associés. Préserver la destination des liens, leur état actif et les autres usages du mot « Atelier », y compris les noms accessibles hors navigation.

**Critères d’acceptation :** sur `/` et `/equipes`, le lien de navigation vers `/` affiche « Atelier »; il mène toujours à `/`; les autres libellés restent inchangés.

**Validation prévue :** vérifier les deux routes et leur navigation dans les tests navigateur existants, ainsi que le formatage, le lint et le typage concernés.

**Décision utilisateur :** approuvé le 2026-11-21, message exact : « You need to show "Atelier", I approve 039 ». Approbation enregistrée avant modification applicative.

**Validation réalisée — 2026-11-21 :** `pnpm check` réussi (197 tests unitaires/API), avant et après modification. Test de navigation sur les deux routes réussi sur Chromium desktop/mobile et WebKit mobile. Un premier essai parallèle a été interrompu par l’arrêt des serveurs de test; la reprise séquentielle a réussi. Navigateurs mobiles émulés, sans appareil physique.

## Validation de BKL-001 et BKL-002 — 2026-11-20

- `pnpm check` : réussi, sans erreur de formatage, lint ou typage; **146 tests unitaires/API** et builds réussis.
- `pnpm exec playwright test` sur le bundle construit : **78 tests réussis, trois skips de plateforme** (81 cas), sur Chromium desktop/mobile et WebKit mobile. Aucun échec.
- BKL-001 : tests d’alignement à un pixel CSS près avant/après création de séquence et après redimensionnement; timeline immédiatement après le viewport; ordre mobile avant roster/inspecteur; défilement interne sans débordement de page. Dispositions contrôlées visuellement.
- BKL-002 : pause et sélection du départ depuis aperçu, lecture et fin; reprise depuis zéro; retour horizontal au début des pistes; activation Entrée/Espace; séquence d’une seule pose; comparaison des exports et vérification de l’historique; positions non enregistrées conservées jusqu’à capture ou rétablissement.
- Non-régression : édition des poses, insertion, Observation, sauvegarde/rechargement, retiming/suppression, annuler/rétablir et hashes du Worker vérifiés par la suite navigateur.
- Aperçus mis à jour : [rink et timeline desktop](demo/rink-timeline-desktop.png), [mobile](demo/rink-timeline-mobile.png). Guide : [Timeline](TIMELINE-REVIEW.md).

Les résultats couvrent les navigateurs testés; ils ne constituent pas un essai sur iPhone physique. Aucun changement au format enregistré ou au moteur physique n’a été nécessaire.

## Validation de BKL-003 — 2026-11-20

- Icônes SVG dédiées `stepPrevious` (`◀|`) et `stepNext` (`|▶`) utilisées uniquement dans la navigation de la timeline; l’icône de pas physique reste identique.
- Formatage vérifié, lint des deux composants sans erreur et build web avec typage strict réussis.
- Vérification navigateur ciblée sur le bundle de production : Chromium desktop, Chromium mobile et WebKit mobile. Avec trois poses distinctes, précédent/suivant sélectionnent chaque étape voisine à 0/2/4 secondes, affichent la bonne position du joueur, respectent les états désactivés aux bornes et permettent toujours le retour au début.
- Contrôle visuel de la barre : [desktop](demo/timeline-step-icons-desktop.png), [mobile](demo/timeline-step-icons-mobile.png). Aucun changement des actions ou du format enregistré.
- Le serveur temporaire de preview utilisé pour cette vérification a été arrêté.

## Validation de BKL-004 — 2026-11-20

- `pnpm check` : réussi — formatage, lint, typage strict, **146 tests unitaires/API** et builds de production, sans erreur.
- `pnpm exec playwright test` : **84 réussites, trois skips de plateforme** (87 cas) sur Chromium desktop/mobile et WebKit mobile. Aucun échec après corrections.
- En-tête unique avant création et pendant montage; compteurs/durée synchronisés, restauration après sauvegarde/rechargement. Alignement sur toute la grille et position au-dessus de ses panneaux vérifiés après redimensionnements desktop, tablette et mobile.
- Les six boutons de navigation/création/capture partagent une rangée sans repli. Les petites largeurs disposent d’un défilement horizontal interne; le focus révèle complètement le bouton actif. Le parcours Tab puis Entrée/Espace est vérifié sur les trois projets, y compris la capture d’une pose modifiée.
- Non-régression de l’alignement viewport/timeline, de la protection des poses modifiées, de lecture/pause, précédent/suivant, retour au début, insertion, Observation, sauvegarde, import/export et des hashes du Worker.
- Guide et aperçus actualisés : [atelier desktop](demo/sequence-workspace-desktop.png), [atelier mobile](demo/sequence-workspace-mobile.png), [commandes desktop](demo/sequence-commands-desktop.png), [commandes mobile](demo/sequence-commands-mobile.png).
- La correction de focus est limitée à la nouvelle rangée : ordre Tab explicite et révélation horizontale au focus. Aucune modification des actions, gardes, icônes BKL-003 ou du format des séquences.
- Les serveurs temporaires de validation ont été arrêtés. La validation mobile utilise les navigateurs émulés de Playwright, pas un iPhone physique.

## Validation de BKL-005 — 2026-11-20

- `pnpm check` : réussi — formatage, lint, typage strict, **146 tests unitaires/API** et builds de production.
- Les **six vérifications navigateur BKL-005** réussissent (deux scénarios sur chacun des projets desktop, mobile Chromium et mobile WebKit). Alignement et hauteur compacte après redimensionnement; remplacement par l’en-tête unique; capture inchangée des dix joueurs/rondelle; création Entrée/Espace; blocage pendant la simulation physique; rechargement, import, réinitialisation et historique vérifiés.
- Suite Playwright complète : **89 réussites, trois skips, un échec** sur 93 cas. L’échec concerne la pause Observation desktop, dans un comportement de lecture existant. Sa cause est reproduite numériquement et consignée en BKL-006 pour approbation; la suite complète n’est donc pas déclarée verte.
- Aperçus contrôlés visuellement : [avant création desktop](demo/sequence-creation-before-desktop.png), [après création desktop](demo/sequence-creation-after-desktop.png), [avant mobile](demo/sequence-creation-before-mobile.png), [après mobile](demo/sequence-creation-after-mobile.png).
- L’implémentation applicative est limitée à l’affichage conditionnel de `TimelineHeader` et à la rangée compacte. Le store, les actions, le calcul de lecture et les formats enregistrés ne changent pas.
- Les serveurs temporaires de validation sont arrêtés après le run; aucun résultat sur appareil iOS physique n’est revendiqué.

## Validation de BKL-007 — 2026-11-20

- `pnpm check` : réussi — formatage, lint, typage strict, **146 tests unitaires/API** et builds de production.
- `pnpm exec playwright test` : **99 réussites, trois skips de plateforme** sur 102 cas, sur Chromium desktop/mobile et WebKit mobile. Aucun échec dans cette exécution.
- Les **neuf vérifications BKL-007** passent également dans une exécution ciblée : ligne unique, temps/vitesse fixes à droite, défilement interne des commandes et révélation au focus, sans débordement de page, aux largeurs de 320 à 1 440 px.
- Insertion par icône : nom accessible/infobulle conservés, désactivation aux bornes et capture à l’instant intermédiaire vérifiées. Vitesse et navigation restent fonctionnelles.
- Zoom vertical : bornes, flèches/Début/Fin, pointeur et toucher; restitution du focus avec Échap/Tab, clic extérieur, ancrage après défilement/redimensionnement et absence de modification du document enregistrable vérifiés.
- Aperçus contrôlés visuellement : [barre desktop](demo/timeline-toolbar-desktop.png), [barre mobile](demo/timeline-toolbar-mobile.png), [zoom desktop](demo/timeline-zoom-desktop.png), [zoom mobile](demo/timeline-zoom-mobile.png). Guide et ADR-009 actualisés.
- BKL-006 reste une proposition séparée non approuvée : le défaut numérique existant n’a pas été modifié, même si le test Observation réussit dans cette exécution. Aucun changement de format de séquence ni de calcul de lecture.
- Les serveurs temporaires de validation sont arrêtés après l’exécution. Les navigateurs mobiles sont émulés; aucun essai sur iPhone physique n’est revendiqué.

## Validation de BKL-008 et BKL-009 — 2026-11-20

- `pnpm check` : réussi — formatage, lint, typage strict de l’application et des outils/tests, **146 tests unitaires/API** et builds de production.
- `pnpm exec playwright test` : **111 réussites, trois skips de plateforme** sur 114 cas, sur Chromium desktop/mobile et WebKit mobile. Aucun échec dans l’exécution complète finale; les **12 vérifications BKL-008/BKL-009** passent sur les trois projets.
- BKL-008 : deux onglets, un seul panneau visible/accessibilité, liens ARIA, navigation Gauche/Droite/Début/Fin et Tab; états sans séquence, joueur/rondelle, étape initiale, aperçu et lecture vérifiés. Le formulaire d’étape apparaît uniquement dans le panneau de droite.
- Positions non enregistrées conservées au changement d’onglet, y compris en quittant un champ actif; blocage du retiming/suppression et de la lecture/ajout jusqu’à capture. Métadonnées d’Observation (observateur, cible joueur/point, coordonnées et consigne), nom, temps, suppression, annuler/rétablir, sauvegarde/rechargement et égalité du document après navigation vérifiés.
- BKL-009 : boutons sans texte visible, format compact, noms accessibles/infobulles conservés, ajout par Entrée et capture par Espace; gardes pendant pose modifiée, aperçu et lecture vérifiées. Après ajout de gestes tactiles natifs aux deux projets mobiles, le scénario ciblé repasse sur les trois projets : **trois réussites**, lint et typage des tests également réussis.
- Contrôles de disposition de 320 à 1 440 px : champs dans les limites du panneau, aucune extension horizontale de la page. Les tests historiques de la barre sur une ligne, de son défilement, du focus, du zoom et de l’alignement viewport/timeline passent également.
- Aperçus contrôlés visuellement : [Joueur desktop](demo/inspector-player-desktop.png), [Étape desktop](demo/inspector-step-desktop.png), [Joueur mobile](demo/inspector-player-mobile.png), [Étape mobile](demo/inspector-step-mobile.png), [icônes desktop](demo/timeline-actions-desktop.png), [icônes mobile](demo/timeline-actions-mobile.png). README, guide et ADR-009 actualisés.
- Le store, le format des séquences et le calcul de lecture ne changent pas. BKL-006 demeure proposé et non approuvé, sans correction du défaut numérique; les tests Observation réussissent dans cette exécution.
- Les serveurs temporaires de validation sont arrêtés après exécution. Les résultats mobiles proviennent des navigateurs émulés de Playwright, sans essai sur iPhone physique.

## Validation de BKL-010 — 2026-11-20

- `pnpm check` : réussi — formatage, lint sans avertissement, typage strict, **146 tests unitaires/API** et builds de production.
- `pnpm exec playwright test` : **120 réussites, trois skips de plateforme** sur 123 cas, sur Chromium desktop/mobile et WebKit mobile. Aucun échec. Les **neuf vérifications BKL-010** passent également dans l’exécution ciblée après correction du débordement du roster mobile.
- Dispositions contrôlées de **320 à 1 600 px**, avant/après création d’une séquence : exactement deux colonnes au-delà de 1 000 px, panneau droit de **320 px**, patinoire jusqu’au bord gauche et sur toute la largeur disponible; en dessous du seuil, panneau sous la patinoire. Aucun panneau roster à gauche, une seule liste dans Équipes et un seul onglet visible/accessibilité.
- Le viewport remplit sa colonne et la timeline partage ses bords et sa largeur à un pixel CSS près. En-tête Montage sur tout l’atelier et création au-dessus de la patinoire conservés. Les contrôles du roster ne débordent plus sur les petites largeurs : sa grille passe à une colonne lorsque deux cellules de 160 px ne tiennent pas.
- Sélection des dix patineurs et de la rondelle par roster, activation tactile sur les deux projets mobiles, ouverture/focus de Joueur, maintien d’Équipes lors du choix d’équipe, sens d’attaque, rôle et possession vérifiés. Une sélection sur la glace actualise le roster sans changer d’onglet. Ces actions seules ne modifient pas l’export ni l’historique.
- Modifications de positions des deux équipes, rôle et possession conservées avant capture, au changement d’équipe/onglet, après annuler/rétablir et après sauvegarde/rechargement. Gardes du retiming/suppression et des poses modifiées, transfert libre de rondelle dans l’aperçu et champs en lecture seule vérifiés.
- Les tests historiques ont été adaptés pour ouvrir Équipes avant l’accès au roster et mesurer l’atelier sans l’ancienne colonne; édition, onglets/clavier, capture, transport, zoom, Observation et hashes du Worker passent dans la suite complète.
- Aperçus contrôlés visuellement : [atelier desktop](demo/teams-workspace-desktop.png), [atelier mobile](demo/teams-workspace-mobile.png), [Équipes desktop](demo/teams-inspector-desktop.png), [Équipes mobile](demo/teams-inspector-mobile.png), [Joueur desktop](demo/teams-player-desktop.png), [Joueur mobile](demo/teams-player-mobile.png). README, guide et ADR-009 actualisés.
- Aucun changement au store, aux contrats, aux coordonnées ou au calcul de lecture. BKL-006 demeure une proposition non approuvée; son défaut numérique n’a pas été corrigé, même si Observation réussit dans cette exécution.
- Les serveurs temporaires de validation sont arrêtés après exécution. Les résultats mobiles utilisent les navigateurs émulés de Playwright; aucun essai sur iPhone physique n’est revendiqué.

## Validation de BKL-011, BKL-012 et BKL-013 — 2026-11-20

- `pnpm check` : réussi — formatage, lint sans avertissement, typage strict, **146 tests unitaires/API** et builds de production.
- Suite finale `pnpm exec playwright test` : **138 réussites, trois skips de plateforme** sur 141 cas, sur Chromium desktop/mobile et WebKit mobile. Aucun échec. Les **18 vérifications des trois propositions** passent dans cette suite; les six vérifications ciblées BKL-011 passent également après corrections.
- BKL-011 : barre verticale sans recouvrement à gauche, boutons de 40 px, séparateur horizontal, ordre des commandes et alignement viewport/timeline vérifiés de 320 à 1 600 px. Navigation Haut/Bas/Début/Fin en sautant les commandes désactivées, placement au centre par pointeur/toucher, annuler/rétablir au clavier, garde de simulation et d’aperçu/lecture et disponibilité des outils en séquence vérifiés.
- La désactivation du bouton Annuler/Rétablir après activation conserve le focus sur une commande disponible de la barre. Le padding horizontal du transport mobile est passé de 8 à 6 px : à 320 px, WebKit laissait auparavant 28,64 px à une icône de 30 px après ajout de la bande de gauche. La révélation complète au focus, les temps et la vitesse fixes à droite passent désormais dans la suite finale, sans réduire les caractères affichés.
- BKL-012 : quatre onglets accessibles et trois cases dans Patinoire, aucune duplication sous le rink; navigation clavier jusqu’à Patinoire et aux cases, activation tactile et clavier vérifiées. Les captures du canvas changent réellement pour la grille, les rôles et les trajectoires d’une pose préparée; les valeurs persistent entre onglets/joueurs/étapes, sans modifier l’export ni ajouter d’historique.
- Les positions non enregistrées et les gardes de capture restent intactes au changement d’options. L’aperçu reste en lecture seule et au même instant; le rechargement restaure le document mais remet les options locales à leurs valeurs initiales, comme auparavant.
- BKL-013 : création par clic, Entrée, Espace et toucher; mesure du titre Montage aligné à un pixel CSS près sur le haut du viewport, depuis plusieurs positions et hauteurs. Le focus rejoint le titre. Une hauteur de viewport dépassant le contenu vérifie le bornage naturel du défilement. Pose initiale, rondelle et onglet actif conservés.
- Le défilement de création ne se répète pas lors des changements de vue, de l’historique, de l’import ou du rechargement. Une création bloquée pendant la simulation conserve l’absence de séquence et la position de la page; après retour à l’édition, la création et son cadrage fonctionnent.
- Non-régression des contrôles de timeline, des quatre onglets, du roster, de l’édition sur glace, de la possession, de l’Observation, des imports/sauvegardes et des hashes du Worker. Le store, les contrats, le renderer et le calcul de lecture restent inchangés; BKL-006 reste non approuvé et son défaut numérique n’est pas corrigé par cette livraison.
- Aperçus contrôlés visuellement et actualisés : [atelier desktop](demo/rink-tools-workspace-desktop.png), [atelier mobile](demo/rink-tools-workspace-mobile.png), [barre verticale desktop](demo/rink-tools-vertical-desktop.png), [mobile](demo/rink-tools-vertical-mobile.png), [Patinoire desktop](demo/rink-options-tab-desktop.png), [mobile](demo/rink-options-tab-mobile.png), [Montage au sommet desktop](demo/montage-create-scroll-desktop.png), [mobile](demo/montage-create-scroll-mobile.png). README, guide et ADR-009 actualisés.
- Les serveurs temporaires de validation et de diagnostic sont arrêtés. Les résultats mobiles proviennent des navigateurs émulés de Playwright; aucun essai sur iPhone physique n’est revendiqué.

## Validation de BKL-014, BKL-015 et BKL-016 — 2026-11-20

- `pnpm check` : réussi — formatage, lint sans avertissement, typage strict, **146 tests unitaires/API** et builds de production.
- Les **12 vérifications ciblées** passent sur Chromium desktop/mobile et WebKit mobile : deux parcours de disposition/commandes et deux parcours de cadrage de création sur chacun des projets.
- Suite Playwright complète : **143 réussites, trois skips de plateforme, un échec** sur 147 cas. L’échec desktop « pauses at an Observation marker… » affiche 00:02.00 au lieu de 00:01.00, même signature que le défaut existant BKL-006. Les tests des propositions 014–016 passent; la suite complète n’est pas déclarée verte et BKL-006 reste non approuvé, sans correction du cadenceur.
- BKL-014 : mesures du bundle précédent (ligne de 11 px sur desktop/tablette ou 10 px sur mobile, plus 17 px de padding), puis mesures du nouveau viewport aux largeurs de 320 à 1 600 px. Gains vérifiés de **28 px** sur desktop/tablette et **27 px** à 760 px et moins; aucune place réservée à rink-topline, proportions et coordonnées conservées, timeline immédiatement sous le viewport avec les mêmes bords.
- Dimensions déplacées dans Patinoire et actualisées après import d’un scénario de test de 64 × 28 m. États édition, simulation en pause, montage et aperçu vérifiés; le nom d’étape et les statuts de lecture/simulation restent accessibles dans les zones existantes. Les dimensions par défaut du produit restent 60,96 × 25,9 m.
- BKL-015 : une seule rangée de bas de panneau après rink-workspace, aucune consigne générique visible ou rangée dupliquée dans rink-surface; aide rink-help toujours reliée au viewport. Dispositions sur une ligne à largeur suffisante et repli sur petits écrans, commandes dans les limites du panneau et absence de débordement de page vérifiés.
- Agrandir/Réduire/Cadrer/Inverser vérifiés au pointeur, au clavier et au toucher, avec mise à jour du pourcentage, conservation des coordonnées, égalité de l’export et absence d’entrée d’historique. Leurs effets sont vérifiés en édition et en aperçu en pause; leur disponibilité est vérifiée pendant la lecture.
- Limite observée : pendant l’animation, le watcher existant de RinkBoard réinitialise le zoom au rendu suivant. Diagnostic Chromium en lecture seule : `[120, 100, 100, 100, 100]` en lecture et `[120, 120, 120, 120, 120]` en pause. Correction enregistrée en **BKL-017**, proposée et non approuvée. Les tests du déplacement ne revendiquent pas de correction de ce comportement existant et aucun test historique n’a été supprimé ou ignoré pour masquer les défauts.
- BKL-016 : l’en-tête complet est cadré avec un bord supérieur à 8 px du viewport, à un pixel CSS près lorsque la page le permet; Séquence pédagogique, Montage et les compteurs sont visibles. Clic, Entrée, Espace, toucher, plusieurs positions et hauteurs, focus sur le titre sans second déplacement et bornage de la page vérifiés. Rechargement/import/historique et création bloquée conservent les règles de BKL-013.
- Pose initiale, onglet actif, étapes et formats conservés. Les contrôles de transport, zoom de timeline, quatre onglets, roster, édition sur glace, sauvegarde/import et hashes du Worker passent dans la suite complète, sous réserve de l’échec Observation explicitement décrit plus haut.
- Aperçus contrôlés et actualisés : [atelier desktop](demo/rink-layout-desktop.png), [mobile](demo/rink-layout-mobile.png), [nouveau cadrage desktop](demo/montage-header-scroll-desktop.png), [mobile](demo/montage-header-scroll-mobile.png), [rangée de bas desktop](demo/rink-footer-desktop.png), [mobile](demo/rink-footer-mobile.png), [dimensions du scénario de test desktop](demo/rink-dimensions-desktop.png), [mobile](demo/rink-dimensions-mobile.png). README, guide et ADR-009 actualisés.
- Aucun changement au store, au renderer, au watcher de caméra, aux contrats ou au calcul de lecture. Les serveurs temporaires de mesure, diagnostic et validation sont arrêtés; aucun essai sur iPhone physique n’est revendiqué.

## Validation de BKL-017 à BKL-022 — 2026-11-20

Approbation enregistrée avant toute modification applicative : « approve 017 to 022 ». Les six propositions sont **implémentées**.

- **017 — Caméra :** watcher séparé des deux dimensions primitives; aucune réinitialisation sur une nouvelle pose. Mesures sur douze frames de lecture : zoom 120 % et position du marqueur stationnaire conservés après pan de 18 px; pause/reprise, puis pan et zoom physique sur dix frames. Cadrer et un changement réel de longueur recadrent toujours; les vérifications d’inversion restent réussies.
- **018 — Étapes :** menu + nommé Insérer une étape; insertion au curseur et ajout après sélection à +2 000 ms, avec décalage des dates suivantes. Tests des poses interpolées, des IDs et annotations conservés, d’une nouvelle pose Jeu sans consigne Observation, du départ/milieu/fin, des limites de durée/120 étapes et des positions non enregistrées. Une transaction réversible; export/import et sauvegarde/rechargement validés. Menu hors du conteneur horizontal, clavier, toucher, focus et fermeture, position bornée à 320 px vérifiés.
- **019/022 — Barre gauche :** Réinitialiser en premier, puis manipulation, historique et commandes de vue avec pourcentage. La légende reste seule en bas; plus de rangée supérieure. Hauteur bornée au viewport, défilement interne et révélation du bouton focalisé, y compris après Annuler/Rétablir qui désactive son bouton; géométrie, ordres clavier et gardes des modes validés.
- **020 — HockeyDoo :** composant Brand partagé sur Atelier/Fondations; PNG servi localement et copié sans modification. SHA-256 source et asset identiques : `7ac1cc3681cc81f3fdc01808a2e1900e602ca96c8ebc16b1d3fe98a90981153d`. Ratio 2 007/783, lien/nom accessible, titre navigateur, couleurs des deux équipes concordantes, Observation dorée et palette marine/bleu/blanc/rouge vérifiés visuellement. Les petits en-têtes se replient, sans débordement à 320 px.
- **021 — Largeur :** panneau desktop mesuré à 368 px (+15 %), empilement conservé à 1 000 px et moins. Mesures de 320 à 1 600 px, viewport/timeline alignés et absence de débordement conservés.

**Checks réels :** `pnpm check` réussi : formatage, lint, typage strict, **148 tests unitaires/API dans neuf fichiers**, builds. Après le dernier ajustement de révélation du focus : lint ciblé, typage des outils/tests et build web réussis. Suite navigateur complète du bundle final : `pnpm exec playwright test`, **153 réussites, trois skips de plateforme sur 156 cas**, Chromium desktop/mobile et WebKit iPhone. Les trois nouveaux parcours groupés réussissent dans les trois projets. Les skips restent ceux des gestes tactiles réservés au mobile et du pincement CDP indisponible en WebKit; aucun test ignoré ajouté. Les parcours existants ont été adaptés aux nouveaux emplacements, dimensions et menu, sans affaiblir leurs vérifications de document/historique.

**Aperçus contrôlés :** [Atelier desktop](demo/hockeydoo-workspace-desktop.png), [Atelier mobile](demo/hockeydoo-workspace-mobile.png), [menu desktop](demo/hockeydoo-step-menu-desktop.png), [menu mobile](demo/hockeydoo-step-menu-mobile.png), [Observation desktop](demo/hockeydoo-observation-desktop.png), [Observation mobile](demo/hockeydoo-observation-mobile.png), [Fondations desktop](demo/hockeydoo-foundation-desktop.png), [Fondations mobile](demo/hockeydoo-foundation-mobile.png). Le guide et l’ADR-009 décrivent les opérations finales. Les cas de démonstration sont créés dans des contextes navigateur isolés.

**Limites :** validation locale et navigateurs émulés, sans appareil iOS réel ni résultat de CI distante. Le défaut numérique existant d’Observation **BKL-006 reste proposé et non approuvé**, même si son parcours navigateur passe dans cette exécution; aucune modification de `advanceSequence`, aucun affaiblissement ou retrait de son test. Les données, contrats et moteur physique restent compatibles.

## Validation de BKL-006, BKL-023 et BKL-024 — 2026-11-20

Approbation enregistrée avant les modifications applicatives : « approve 006, 023 and 024 ». Les trois propositions sont **implémentées**.

- **006 — Pause Observation corrigée :** comparaison stricte `current < marker <= next`, sans exclusion des marqueurs à moins de 0,001 ms. Régression déterministe vérifiée : depuis 999,9999 ms avec un incrément de 16,667 ms, arrêt à **1 000 ms, paused=true**. Tests juste avant/à/après, premier de plusieurs marqueurs, reprise à 1 000 ms sans se rebloquer, delta négatif et fin bornée. Le parcours navigateur Observation passe sur les trois projets; moteur physique et formats inchangés.
- **023 — Aides des icônes :** audit des commandes de l’Atelier, documents, rink, montage, roster, simulation et Fondations. Noms français accessibles conservés, SVG décoratifs masqués, logo avec alt HockeyDoo; les aides communes sont visibles au survol et au focus, sans symbole décoratif ajouté à leur texte. Les noms Lecture/Pause se mettent à jour. L’aide sort des conteneurs défilants, reste cadrée à 320 px, accepte son propre survol, ferme avec Échap et ne bloque pas les actions. Les descriptions existantes sont préservées lors de l’association temporaire du tooltip. Audit automatisé des noms et tests focus/survol, commandes désactivées, menus et actions réussis.
- **024 — Zoom compact :** une seule icône remplace −/pourcentage/+ dans la barre. Panneau horizontal à droite avec slider **100–300 %**, valeur et boutons (facteur 1,2). Réglage direct précis, flèches/Début/Fin, boutons désactivés aux bornes, toucher, synchronisation avec le zoom clavier et Cadrer, focus/Échap, clic/focus extérieur, redimensionnement et fermeture lorsque l’ancre disparaît vérifiés. Le panneau ne change pas la géométrie du viewport; toolbar/timeline et panneau droit restent alignés, sans débordement à 320 px. Cadrer/Inverser restent séparés; zoom de timeline indépendant. Caméra stable sur douze frames de lecture après réglage; document/export/historique inchangés.

**Validation réelle :**

- `pnpm check` réussi : formatage, lint, typage strict, **149 tests unitaires/API dans neuf fichiers** et builds des packages/apps.
- **12 tests ciblés réussis** pour les nouvelles aides et le zoom, Chromium desktop/mobile et WebKit iPhone; vérifications numériques dédiées d’Observation réussies.
- Suite navigateur complète du bundle final : `pnpm exec playwright test`, **165 réussites, trois skips de plateforme sur 168 cas**, aucun échec. Les trois skips restent les deux gestes réservés au mobile sur desktop et le pincement CDP indisponible en WebKit. Aucun skip ajouté pour cette livraison.
- Régression des anciens tests adaptée à l’ouverture du panneau pour accéder à Agrandir/Réduire, au nombre réduit d’éléments de toolbar et aux aides partagées remplaçant les anciens attributs title. Les contrôles de positions, données, historique, caméra, sauvegarde/import et moteur/hash restent en place et réussis.
- Guide et ADR-009 actualisés; aperçus du bundle final contrôlés visuellement dans des contextes navigateur isolés : [zoom desktop](demo/rink-zoom-slideout-desktop.png), [zoom mobile](demo/rink-zoom-slideout-mobile.png), [aide desktop](demo/icon-help-desktop.png), [aide mobile](demo/icon-help-mobile.png).

**Limites de validation :** contrôles locaux des noms accessibles et des navigateurs émulés; pas de vérification manuelle VoiceOver ni d’appareil iOS réel ou de CI distante. Les anciens bilans mentionnant BKL-006 non approuvé décrivent leur état historique; la proposition est maintenant corrigée et implémentée dans cette livraison.

## Validation de BKL-025 — 2026-11-20

Approbation enregistrée avant modification des styles : « approve 025 ». Proposition **implémentée**.

- Boutons souris de **34 px** de haut, largeur de 40 px et icônes inchangées; centres consécutifs à **36 px**. Gap de 2 px, marges des séparateurs de 3 px et padding vertical de barre de 4 px. La media query `pointer: coarse` conserve les cibles tactiles de **40 × 40 px** à toutes les largeurs.
- Mesure comparative dans deux contextes navigateur isolés, en montage (neuf commandes), avec les anciens styles réappliqués temporairement dans le navigateur : hauteur naturelle **444 → 357 px sur desktop (−87 px)** et **444 → 411 px sur tactile (−33 px)**. Ces mesures retirent temporairement la borne de hauteur pour comparer le contenu; la version livrée conserve la borne et le défilement interne. Aucun style de comparaison n’a été ajouté à l’application.
- Géométrie vérifiée de 320 à 1 600 px : largeur de barre 52 px, boutons alignés sans chevauchement, viewport/timeline alignés, sans débordement. Les tests existants distinguent les hauteurs souris/tactile et vérifient la révélation du focus avec ou sans besoin de défilement. Navigation verticale, Annuler/Rétablir, réinitialisation, aides, zoom dépliant et cadrage après création restent opérationnels.

**Validation réelle :** build web avec typage Vue réussi; `pnpm lint`, typage strict des outils/tests et vérification de formatage réussis. **39 tests navigateur ciblés réussis**, sans skip ni échec, sur Chromium desktop/mobile et WebKit iPhone (`workspace`, aides/zoom et contrôles de l’atelier). Aucun test unitaire ajouté pour ce changement de présentation; les résultats unitaires et de suite complète des livraisons précédentes restent leurs résultats historiques, sans être présentés comme réexécutés pour cette modification.

**Aperçus contrôlés :** [atelier desktop](demo/compact-tools-desktop.png), [barre desktop](demo/compact-tools-rail-desktop.png), [atelier mobile](demo/compact-tools-mobile.png), [barre mobile](demo/compact-tools-rail-mobile.png). Guide et ADR-009 actualisés. Validation locale en navigateurs émulés, sans appareil iOS réel ni CI distante.

## Validation de BKL-026 — 2026-11-20

Message utilisateur exact : « approve 025 and 206 ». « 206 » est interprété comme **026**, la proposition immédiatement précédente; interprétation annoncée et enregistrée avant modification. BKL-025 était déjà implémenté. **BKL-026 est implémenté**.

- Icône Reset après +, nom accessible et aide **Réinitialiser le zoom à 100 %**. Le bouton émet `reset`, relié au cadrage de caméra existant. Retour à 100 %, pan annulé et orientation conservée, sans modifier le document ou son historique.
- Panneau conservé ouvert et focus maintenu sur le bouton après clavier/clic/toucher, y compris WebKit. Slider, pourcentage et description du déclencheur synchronisés. La commande reste disponible à 100 % et pendant lecture/simulation.
- Largeur maximale du panneau portée de 260 à 300 px pour accueillir la commande en conservant la rangée horizontale; adaptation au viewport conservée. Contrôles contenus sur une seule ligne, ancrage à droite, limites du panneau et absence de débordement vérifiés à partir de 320 px. La densité verticale BKL-025 reste inchangée.

**Validation réelle :** build web avec typage Vue, lint du projet et typage strict des outils/tests réussis; vérification de formatage réussie. **Neuf tests navigateur ciblés réussis**, sans skip ni échec, Chromium desktop/mobile et WebKit iPhone. Les parcours existants du zoom et de la caméra ont été étendus pour couvrir remise à 100 % depuis 180/300 %, activation Entrée/clic/toucher, aide au focus, panneau ouvert/focus conservé, vue inversée, données/export/historique inchangés, remise à 100 % pendant lecture avec stabilité sur douze frames, et reset/recentrage après pan pendant simulation physique. Les vérifications de Cadrer et du recadrage lors d’un changement de dimensions restent présentes. Aucun test unitaire ajouté pour ce raccordement de commande existante; la suite complète antérieure n’est pas présentée comme réexécutée.

**Aperçus contrôlés :** [panneau avec Reset desktop](demo/zoom-reset-desktop.png), [panneau avec Reset mobile](demo/zoom-reset-mobile.png). Ces captures du test montrent le bouton disponible à 180 % avant activation; les assertions qui suivent vérifient le retour à 100 %. Guide et ADR-009 actualisés. Validation locale en navigateurs émulés, sans appareil iOS réel ni CI distante.
