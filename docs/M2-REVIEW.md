# Bilan M2 — Simulation déterministe

Date : 2026-11-20. Portée : phase 2 du plan original, autorisée après M1. Le moteur tactique 2-1-2, les interventions enregistrées et le backend privé restent aux jalons suivants.

## Livraison

- Moteur TypeScript headless à pas fixe de 1/30 s, état RNG Mulberry32 persistant et ordre d’entités stable.
- Déplacements avec accélération et virage limités, steering vers les cibles M1, ralentissement, inertie, bandes arrondies et résolution simple de chevauchements.
- Rondelle liée au porteur ou libre avec traînée/rebond; passes seedées et récupération par proximité/orientation/délai.
- Snapshot complet versionné, SHA-256 canonique, traces par tick et bus d’événements isolé des décisions.
- Web Worker réel avec protocole validé, commandes de lecture, cadence bornée, pause quand l’onglet est masqué et destruction à la sortie de l’atelier.
- Play/pause/step/reset, préparation d’une passe, inspection de l’état simulé et interpolation PixiJS respectant la réduction des animations.
- Situation initiale et historique M1 préservés; retour explicite à l’édition, sans modifier le brouillon avec l’état simulé.

## Fichiers principaux

| Chemin                                                                                   | Rôle                                                                       |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `packages/simulation-core/src/engine.ts`                                                 | Moteur, restauration, mouvements, inputs, passes et possession             |
| `packages/simulation-core/src/geometry.ts`, `rng.ts`, `hash.ts`, `events.ts`             | Géométrie partagée, RNG, sérialisation/hashes et événements                |
| `packages/contracts/src/domain.ts`, `index.ts`, `simulation.ts`                          | Contrats M0 conservés et nouveaux snapshots/config/protocole M2            |
| `apps/web/src/simulation/runtime.ts`, `simulation.worker.ts`                             | Commandes headless et cadence dans le Worker                               |
| `apps/web/src/simulation/useSimulation.ts`, `interpolation.ts`, `SimulationControls.vue` | Transport, cycle de vie, rendu interpolé et contrôles                      |
| `apps/web/src/editor` et `messages.ts`                                                   | Vue simulée séparée, lecture seule et libellés fr-CA                       |
| `packages/simulation-core/test`, `apps/web/test/simulation.test.ts`                      | Déterminisme, physique, reprise, protocole et interpolation                |
| `e2e/simulation.spec.ts`                                                                 | Vrais Workers dans Chromium/WebKit, référence Node et erreurs récupérables |
| `package.json`, manifests et lockfile                                                    | Dépendance SHA-256 et construction du cœur avant dev/E2E                   |
| `README.md`, `docs/adr/007-m2-simulation.md`, `docs/demo/m2-*`                           | Usage, décisions, mesures et démonstration                                 |

## Résultats exécutés

| Vérification                     | Résultat local                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Réussite                                                                                                                                             |
| `pnpm check`                     | Réussite : format, lint, typage, tests et builds des sept workspaces                                                                                 |
| Vitest                           | 82 tests réussis dans 6 fichiers, dont 27 nouveaux depuis M1                                                                                         |
| Playwright                       | 57 tests réussis (Chromium desktop/mobile et WebKit mobile), 3 exclusions tactiles spécifiques à la plateforme                                       |
| Référence numérique              | Hashes Node figés à 0, 1, 15, 30, 60, 120 et 300 ticks; comparaisons Worker Chromium/WebKit aux ticks 0, 1, 15 et 30 après mouvement, passe et reset |
| Limite de durée                  | 9 000 pas exécutés en test headless; arrêt à cinq minutes et reset validés                                                                           |
| Mesure indicative                | 2 000 ticks Node en 431,12 ms : moyenne 0,216 ms/tick, p95 0,350 ms/tick                                                                             |

La mesure est un essai du cœur sur cette machine de développement (Node 24.16.0, macOS x64), pas une garantie de performance sur téléphone ou une mesure de FPS PixiJS. Les données brutes sont dans [m2-performance.json](demo/m2-performance.json).

La fixture versionnée [motion-v0.1.0.json](../packages/simulation-core/test/fixtures/motion-v0.1.0.json) comprend le scénario, les inputs et les hashes. Le test navigateur importe cette fixture, exécute le vrai Worker, prépare la passe au tick 15 et compare ses empreintes à celles calculées dans Node. La validation locale inclut Chromium desktop/mobile et WebKit mobile. Les trois exclusions tactiles héritées de M1 correspondent à des protocoles non applicables à ces projets.

Les tests vérifient également la reprise au milieu d’une passe, la seed zéro, les inversions d’ordre des entités, les références/ticks invalides sans mutation, le refus de snapshots physiques invalides, les limites vitesse/accélération/virage, les bandes et rebonds, le retour à l’édition sans perte, le pause/step sans ticks parasites, la mise en pause d’un onglet masqué et les erreurs de chargement ou de transport du Worker avec nouvelle tentative, y compris après progression de la simulation.

## Démonstration

Application locale : http://127.0.0.1:5174. Captures réelles : [desktop](demo/m2-desktop.png) et [mobile](demo/m2-mobile.png).

Pour reproduire un exercice : importer [m2-scenario.json](demo/m2-scenario.json), ou préparer une cible dans M1, puis démarrer/mettre en pause/avancer d’un pas. Le menu de passe cible un coéquipier du porteur réel, indépendamment de l’équipe actuellement sélectionnée. « Détails de simulation » expose la graine, la version, le hash et les derniers événements.

## Limites et décisions

Les rôles et phases conservent la configuration de départ : pas de détection de phase, rotation F1/F2/F3 ou comportement automatique adverse avant M3. Le mouvement suit les cibles préparées. Les contacts, les gardiens, les tirs, le vol d’une rondelle tenue et les règles complètes de match ne sont pas modélisés. Les paramètres physiques sont une approximation pédagogique configurable et versionnée.

Les imports M1 valides sont conservés; le snapshot simulé initial projette les entités dans les bandes et borne leurs vitesses, sans réécrire le scénario. Les imports angulaires hérités de v1 peuvent donc avoir un tick zéro simulé normalisé. La garantie de hashes est testée sur les runtimes locaux; elle ne couvre pas sans validation tous les futurs moteurs et appareils.

L’interpolation reste propre au rendu; les hashes couvrent uniquement les états autoritaires. Une UI bloquée ou un Worker en retard peut ralentir le temps simulé, sans agrandir dt ni sauter des ticks. Aucun replay publié, export d’enregistrement, seek, annotation ou stockage serveur n’est livré. Les snapshots M2 devront être raccordés aux contrats d’enregistrement en M4.

Docker/Compose et GitHub Actions distant restent non exécutés ici, comme indiqué au bilan M0. Une validation sur iPhone physique reste nécessaire. La limitation Devtools/localStorage en mode développement documentée en M1 demeure; les E2E s’exécutent sur le bundle de production.

## Prochain jalon proposé

Après revue de M2 : **M3 — intelligence tactique 2-1-2**. Détecter les phases, attribuer collectivement F1/F2/F3 avec couverture et hystérésis, traiter D1/D2 distinctement, ajouter les adversaires simples et leurs passes D-D, puis afficher les DecisionTrace et valider des scénarios de référence avec des entraîneurs. Aucun démarrage de M3 dans cette livraison.
