# ADR-007 — Moteur M2, snapshots complets et transport Worker

Statut : implémenté pour M2; validation finale consignée dans le bilan. Date : 2026-11-20. Moteur `0.1.0`, physique `m2-1`, protocole Worker `1`.

## Temps et frontières

Le cœur headless avance uniquement sur `step(inputs)` et intègre exactement `dt = 1/30 s`. Il ne lit ni DOM, réseau, Date, performance ni Math.random. Le lint interdit les accès directs aux horloges et au hasard global dans simulation-core/tactics. La classe engine ne référence pas le renderer, le Worker ou les règles tactiques.

Le Worker utilise une horloge monotone uniquement pour cadencer ces ticks, avec un accumulateur et au plus cinq ticks par passage. Un retard ne change jamais dt; le retard excessif est abandonné plutôt que transformé en un saut massif. L’onglet masqué entraîne une pause explicite du Worker. La simulation se termine à 9 000 ticks (cinq minutes simulées), puis peut être réinitialisée.

Le rendu reçoit des snapshots et interpole seulement positions et orientation entre deux ticks consécutifs. Les changements de possession et les resets sont affichés directement. La préférence de réduction des animations désactive l’interpolation. Aucun état interpolé ne retourne au moteur ou au calcul des hashes.

## Géométrie et déplacements

Mètres, m/s, radians. `clampToRink` et `cornerRadius` sont maintenant partagés entre M1 et M2 : bandes arrondies avec rayon `min(8,5 m, largeur/3)`. Le centre d’un patineur conserve un dégagement par défaut de 0,7 m; la rondelle, 0,3 m.

Un scénario v1 est conservé intact dans l’éditeur. La création du snapshot simulé projette les positions/cibles dans les bandes et borne les vitesses importées aux maxima physiques. Ces normalisations sont propres au tick zéro simulé et ne réécrivent pas le fichier ou le brouillon initial. Une restauration de snapshot incompatible ou physiquement hors limites est refusée.

Avec cible, le patineur oriente progressivement son cap et accélère vers une vitesse désirée, avec ralentissement à l’approche de la cible. Sans cible, il conserve sa vitesse initiale, puis glisse contre les bandes. Quatre passages de résolution de paires, triées par identifiant, réduisent les chevauchements. Ce solveur simple ne garantit pas la séparation rigide d’un groupe densément superposé.

La rondelle tenue suit position/vitesse du porteur. Une rondelle libre est freinée et réfléchie aux bandes. Une passe valide lance la rondelle à vitesse configurée avec dispersion seedée, puis impose un délai global de récupération et un délai propre au passeur. La récupération utilise la distance à la trajectoire parcourue pendant le tick et l’orientation du patineur, avec départage stable des candidats. Aucun tir, gardien, contact réaliste, vol automatique d’une rondelle tenue ou règle de match complète n’est simulé.

## Déterminisme et empreintes

Mulberry32 avec un état uint32 persistant, y compris la seed zéro. Chaque passe valide consomme exactement une valeur; une passe refusée n’en consomme aucune. Les entités sont triées par identifiant ASCII/ordre lexical explicite, sans locale. Positions, vitesses et cibles sont quantifiées à 10⁻⁶ après chaque tick; les orientations sont bornées à `[-π,π]` après quantification.

SHA-256 utilise [noble-hashes](https://github.com/paulmillr/noble-hashes) (`2.4.0`) sur un JSON canonique : clés triées, tableaux d’entités triés, nombres finis, zéro négatif normalisé et champs optionnels undefined omis comme en JSON. L’empreinte couvre le snapshot complet : WorldState, état RNG, configuration/version physique, délais de récupération, dernier passeur et compteurs de séquence. Un WorldState seul ne suffit pas pour reprendre un passage en cours.

Le snapshot M2 et le protocole Worker ont leurs propres schémas stricts versionnés. Les agrégats Scenario/WorldState/Recording v1 restent compatibles; `domain.ts` contient les contrats M0 et `simulation.ts` les nouveaux contrats. Les hashes M2 portent sur SimulationSnapshot; leur intégration au format d’enregistrement et à la publication reste à définir en M4. Aucune prétention d’authenticité ou d’autorisation ne découle d’une empreinte calculée localement.

Les fixtures versionnées figent des hashes Node sur 300 ticks avec mouvement et passe. Les E2E comparent les vrais Workers Chromium et WebKit aux points de référence après mouvement, passe et reset. Cela donne une preuve sur les runtimes testés, pas une garantie universelle de tous les moteurs numériques ou appareils futurs. Les changements de règles physiques devront changer de version et conserver les fixtures précédentes.

## Inputs, événements et isolation du renderer

Les inputs sont appliqués avant l’intégration du prochain tick. Leur séquence globale doit augmenter; les payloads sont validés avant mutation. Une passe inapplicable est rejetée explicitement dans la trace. Le bus publie des copies d’événements après commit; exceptions et appels réentrants d’observateurs ne peuvent modifier l’état autoritaire.

Les commandes et réponses Worker portent version de protocole, identifiant de session et identifiant de requête. Les réponses d’une ancienne session sont ignorées. Les erreurs de chargement, de message ou les requêtes sans réponse entraînent un état d’erreur récupérable; le Worker est détruit au démontage de la route. Le journal UI est borné aux 120 derniers ticks.

Le scénario initial et l’historique M1 ne sont jamais modifiés par la simulation. Pendant une prévisualisation, le modèle reste consultable et la caméra fonctionne; les contrôles d’édition sont désactivés. « Modifier la situation initiale » détruit la session temporaire et restaure l’affichage du scénario préparé. Les interventions en pause, l’enregistrement, le seek et les leçons appartiennent à M4–M6.
