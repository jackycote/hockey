# Bilan M1 — Patinoire et éditeur local

Date : 2026-11-20. Portée : phase 1 du plan original, après autorisation de poursuivre M0. Aucun travail de moteur M2 ni de backend privé M5 n’est inclus.

## Livraison

L’application ouvre maintenant un vrai éditeur sur `/`. La patinoire 2D, ses lignes et buts, dix patineurs, leurs étiquettes et la rondelle sont dessinés par PixiJS. La page technique M0 demeure sous `/fondation`.

Le roster sélectionne une équipe et un patineur; l’inspecteur modifie étiquette, coordonnées, vitesse initiale, orientation et rôle manuel. La possession est modifiable et la rondelle suit le porteur. Le glisser et l’outil Placer modifient le scénario; l’outil cible définit une flèche, dont l’affichage peut être masqué avec les trajectoires. Zoom, pan, pincement tactile, inversion de vue de 180°, grille et vue des rôles sont disponibles.

L’historique couvre les modifications initiales, le glisser complet, les imports et la réinitialisation. Annuler/rétablir est limité à 100 commandes; Échap annule un glisser sans ajouter de commande. Les champs numériques, le roster, les boutons accessibles et les raccourcis clavier permettent de travailler sans souris.

Enregistrer conserve un brouillon local explicite, restauré au rechargement. Exporter JSON et Importer utilisent Scenario v1, avec validation de tous les champs et limite UTF-8 de 256 Kio. Un fichier invalide ne remplace pas le travail courant. Le stockage navigateur indisponible est signalé; l’export reste utilisable.

## Fichiers principaux

| Chemin                                                                         | Changement                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `apps/web/src/editor/EditorView.vue`, `editor.css`, `Icon.vue`                 | Atelier, roster, inspecteur et contrôles                               |
| `apps/web/src/editor/RinkBoard.vue`                                            | Pont Vue/Pixi, Pointer Events, clavier, pan et pincement               |
| `apps/web/src/editor/renderer.ts`                                              | Rendu PixiJS sans logique de simulation                                |
| `apps/web/src/editor/geometry.ts`                                              | Transformations réversibles et projection dans les bandes              |
| `apps/web/src/editor/scenario.ts`, `store.ts`                                  | Situation de départ, validation, transactions, historique et brouillon |
| `apps/web/src/main.ts`, `messages.ts`                                          | Routes et libellés fr-CA                                               |
| `apps/web/test`                                                                | Tests géométriques et tests d’édition headless                         |
| `e2e/editor.spec.ts`, `e2e/foundation.spec.ts`, `playwright.config.ts`         | Parcours éditeur et régression M0, desktop/mobile                      |
| `vitest.config.ts`, `apps/web/tsconfig.json`, `package.json`, `pnpm-lock.yaml` | Découverte/typage des tests et contrat partagé disponible aux E2E      |
| `.github/workflows/ci.yml`                                                     | Installation de Chromium et WebKit                                     |
| `README.md`, `docs/adr/006-local-editor.md`, `docs/demo/m1-*.png`              | Démarrage, usage, décisions et démonstration                           |

## Validation exécutée

| Vérification                     | Résultat local                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Réussite                                                                                              |
| `pnpm check`                     | Réussite : format, lint, typage, tests et build des sept workspaces                                   |
| Vitest                           | 55 tests réussis dans 4 fichiers, dont 25 nouveaux tests d’éditeur/géométrie                          |
| Playwright                       | 42 tests réussis : Chromium desktop/mobile et WebKit mobile; 3 exclusions spécifiques à la plateforme |

Les tests unitaires couvrent les transformations mètres/pixels, les deux orientations, les tailles desktop/mobile, le zoom ancré, les limites arrondies, les commandes atomiques, les annulations et la sauvegarde. Les tests navigateur vérifient le canvas Pixi, les dix patineurs, le glisser/cancel, la possession, la sauvegarde/rechargement, les fichiers, l’orientation et les cibles, le pan/zoom, le refus d’une réduction de patinoire invalide et le fonctionnement sans stockage local.

Le pincement natif est testé via Chromium CDP sur le profil mobile. Les tests tactiles spécifiques sont ignorés dans les projets où leur protocole ne s’applique pas; ils ne sont pas comptés comme réussis. Les E2E construisent et servent le bundle de production sur 5193 avec l’API sur 3100, séparément du dev sur 3000/5174.

## Démonstration et limites

Éditeur : http://127.0.0.1:5174. Captures réelles : [desktop](demo/m1-desktop.png) et [mobile](demo/m1-mobile.png).

Les positions/trajectoires sont initiales et manuelles. Aucune simulation, décision tactique automatique ou attribution F1/F2/F3 calculée n’est présentée. Les rôles d’attaquants et de défenseurs restent distincts dans l’inspecteur. Les valeurs tactiques du scénario sont des hypothèses configurables, à revoir avec des entraîneurs lors de M3.

La géométrie des bandes de l’éditeur devra être partagée/versionnée avec le moteur M2. Les imports v1 valides proches des angles du rectangle sont conservés sans modification, même si les bandes visuelles sont arrondies (ADR-006). Les marquages sont une représentation pédagogique paramétrable par dimensions; il ne s’agit pas d’un validateur de règlement.

Le brouillon est local au navigateur et à l’origine; il n’y a pas de compte, synchronisation serveur ou publication. L’historique n’est pas persistant et un fichier JSON ne contient que le scénario. L’absence de Docker sur cette machine et l’exécution distante de GitHub Actions restent des limites héritées de M0; aucune réussite de services Compose ou de CI distante n’est revendiquée ici. La validation sur iPhone physique reste à faire. En mode développement, le kit Devtools de Vue accède au stockage dès l’import et empêche le démarrage si l’accès à localStorage lui-même est bloqué. Il est éliminé du bundle de production; le test de stockage bloqué porte sur ce bundle, avec le message d’erreur et l’export fonctionnels.

## Prochain jalon proposé

Après revue de M1 : **M2 — moteur déterministe**. Unifier la géométrie, implémenter le pas fixe à 30 Hz et le RNG seedé, l’orchestration Worker, les mouvements et la rondelle, les événements et hashes, puis play/pause/step/reset avec interpolation de rendu. Critère essentiel : même scénario + mêmes inputs = mêmes hashes, sans horloge réelle ni hasard global dans la simulation.
