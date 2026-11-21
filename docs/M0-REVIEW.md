# Bilan M0 — Fondation et contrats

Date : 2026-11-20. Portée : première affectation du CODEX_PROMPT, phase 0 uniquement. Les fichiers d'origine et `hockey.code-workspace` sont préservés. Le workspace était sans application ni conventions préexistantes.

## Livrables

- Monorepo pnpm : deux applications et cinq packages, TypeScript strict, ESLint, Prettier, Vitest, Playwright et lockfile.
- Vue 3/Vite avec Router, Pinia, localisation fr-CA et écran de fondation responsive. PixiJS installé; rendu de patinoire prévu M1.
- Fastify/Node : health réel et OpenAPI; erreurs normalisées pour routes inexistantes. Aucun faux backend d'équipe.
- Contrats Zod stricts v1 : Scenario, WorldState, SimEvent, DecisionTrace, Recording, Lesson, Assignment, annotations et inputs. Validation des références, effectifs 5v5, coordonnées, ticks, durée et versions publiées.
- Compose PostgreSQL/MinIO, `.env.example` sans secrets et génération idempotente de `.env` local ignoré par Git.
- Cinq ADR : déterminisme, OIDC, stabilité des replays, vie privée, construction locale MinIO.
- Workflow GitHub Actions incluant checks, E2E et services Compose. README avec commandes de démarrage, tests et limites.

## Validation exécutée

| Commande                         | Résultat local                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile` | Réussite                                                                                               |
| `pnpm check`                     | Réussite : format, lint, typage, tests et build                                                        |
| `pnpm test` (inclus dans check)  | 30 tests réussis, 2 fichiers                                                                           |
| `pnpm build` (inclus dans check) | Les 7 workspaces compilent; bundle web généré                                                          |
| `pnpm test:e2e`                  | 4 tests réussis : desktop + mobile tactile Chromium, API connectée et récupération après erreur réseau |
| `pnpm setup:env`                 | `.env` local généré, sans publier les valeurs                                                          |
| `pnpm services:up`               | Non exécuté : commande Docker absente (`docker: command not found`)                                    |

Les tests E2E utilisent 3100/5193 pour ne pas interférer avec l'application existante sur 5173. Le dev web utilise 5174. Les fixtures utilisent exclusivement des équipes fictives. Les hashes de fixtures sont des valeurs structurelles, pas des preuves de simulation déterministe.

## Démonstration

Application locale : http://127.0.0.1:5174. Captures réelles du navigateur : [desktop](demo/m0-desktop.png) et [mobile](demo/m0-mobile.png).

## Limites et décisions à revoir

Docker et les healthchecks PostgreSQL/MinIO n'ont pas été validés en exécution locale; le build source MinIO n'a donc pas été exécuté. Le téléchargement et l'empreinte SHA-256 de l'archive officielle ont été vérifiés. La CI est configurée mais n'a pas été exécutée sur GitHub. L'acceptation M0 reste partielle pour ces vérifications d'environnement.

Aucun moteur, rendu de patinoire, enregistrement, lecteur, authentification, migration, persistance ou endpoint privé n'est livré. Les schémas n'imposent pas seuls les contrôles d'accès, l'immuabilité de publication ou l'intégrité des hashes : ces mécanismes et leurs tests appartiennent aux jalons suivants. Le choix OIDC, l'hébergement, les durées de rétention et les modalités de consentement demeurent ouverts.

Le format de recording v1 retient tous les états pour une lecture indépendante des tactiques futures; les unités temporelles sont des ticks, pas des millisecondes. Ces précisions par rapport au document initial sont consignées dans ADR-003. MinIO est compilé depuis les sources officielles plutôt que récupéré via une image devenue inaccessible (ADR-005).

## Prochain jalon proposé

Après revue de M0 : M1, patinoire PixiJS et éditeur local. Placement de dix patineurs et rondelle, sélection/possession, pan/zoom, coordonnées, sauvegarde/chargement JSON validé, undo/redo et contrôles clavier/tactile. Aucun démarrage de M1 dans cette livraison.
