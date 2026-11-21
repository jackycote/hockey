# Hockey IQ Simulator — Plan de développement Codex

## Règles d'exécution
Travailler en incréments vérifiables. Chaque phase inclut tests, documentation et démonstration. Ne pas anticiper les phases ultérieures sans validation. Maintenir une application démarrable après chaque étape. Ne pas présenter des règles tactiques comme universelles : fournir paramètres et jeux de tests revus par un entraîneur.

## Phase 0 — Fondation et contrats (jalon M0)
- Initialiser monorepo pnpm, TS strict, lint/format, Vitest, Playwright, CI GitHub Actions.
- Créer apps/web, apps/api, packages/contracts, simulation-core, tactics, replay, coaching.
- Docker Compose PostgreSQL + stockage objet local (MinIO) pour développement; .env.example sans secrets.
- Écrire ADR-001 déterminisme, ADR-002 auth, ADR-003 replay et ADR-004 vie privée.
- Définir schémas Zod Scenario, WorldState, SimEvent, Recording, Lesson, Assignment.
**Acceptation :** build, lint, tests et CI verts; README de démarrage reproductible.

## Phase 1 — Patinoire et éditeur (M1)
- Rendu PixiJS patinoire 2D, 10 joueurs, rondelle, noms/labels, zoom/pan, tactile.
- Outils placer/déplacer, choisir équipe/possession, reset, save/load scénario local JSON.
- Vue rôle/trajectoire, orientation patinoire, undo/redo initial.
**Tests :** limites patinoire, transformations de coordonnées, interactions E2E desktop/mobile.

## Phase 2 — Moteur déterministe (M2)
- Fixed-step 30 Hz, RNG seedé, Web Worker, mouvements (accélération/virage/steering), rondelle, passes, possession simplifiée.
- Event bus, trace de tick, hash d'état, tests invariants et fixtures de simulation.
- Contrôles play/pause/step/reset; animation interpolée.
**Tests :** seed + inputs = hashes identiques, pas de joueur hors limites, aucune dépendance à Date.now/Math.random dans simulation.

## Phase 3 — Intelligence tactique 2-1-2 (M3)
- Phase detector; rôle assigner collectif F1/F2/F3 avec pénalité couverture et hystérésis; D1/D2 soutien/écart.
- Comportements adverses simples, y compris passe D-D; trajectoires d'interception.
- DecisionTrace explicable, visualisation cibles, lignes de passe et raisons.
**Tests :** pression orientée; rotation lors de passe D-D; couverture F3; stabilité de rôles; scénarios de référence validables par coach.

## Phase 4 — Interventions et enregistrement (M4)
- Pause, drag joueur/rondelle, modifier consigne, reprise; journal d'inputs.
- Recording schema versionné, snapshots/keyframes, compression, checksum, seek, replay sans moteur tactique actif.
- Éditeur annotations texte/flèches/pauses à timestamps; brouillons.
**Tests :** intervention enregistrée et reproduite; seek à plusieurs timestamps; lecture d'une version publiée malgré évolution du moteur.

## Phase 5 — Backend privé et équipes (M5)
- OIDC provider configurable, sessions sécurisées; migrations PostgreSQL, MinIO/S3, API OpenAPI.
- CRUD équipes/membres/invitations/scénarios/leçons; rôles et autorisations serveur.
- Tests IDOR, isolation multi-équipe, expirations invitations, validation payload et limites d'upload.
**Tests :** coach et joueur d'équipes distinctes ne voient jamais les ressources de l'autre; accès anonyme refusé.

## Phase 6 — Publication et lecteur joueur (M6)
- Versions immuables, affectations par équipe/sous-groupe, page « Mes leçons ».
- Lecteur mobile (play/pause/seek/vitesse/focus), annotations synchronisées, suivi complétion.
- Historique minimal de progression coach; UX accessible, localisation fr-CA.
**Tests :** parcours complet coach -> publication -> assignation -> joueur -> complétion; mobile Playwright.

## Phase 7 — Stabilisation et pilote (M7)
- Audit sécurité, accessibilité, performance, backups/restauration, observabilité minimale.
- Revue de tactiques avec 2–3 entraîneurs M11–M18; corriger règles non crédibles.
- Tests utilisateurs, documentation coach/joueur, checklist de conformité vie privée et consentement avant déploiement à des mineurs.
**Critère de sortie :** AC01–AC10 validés, aucune vulnérabilité critique connue, déploiement de démonstration avec comptes fictifs.

## Ordre de livraison
M0 -> M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7. Les phases M4 et M5 peuvent être parallélisées une fois les contrats stabilisés.

## Backlog initial priorisé
P0 : déterminisme; scénario; rendu; 2-1-2; intervention; replay; contrôle d'accès; leçon; lecture mobile.
P1 : annotations riches; sous-groupes; statistiques complétion; undo/redo; audit et rétention.
P2 : voix, MP4, quiz avancés, autres systèmes, comparaisons A/B.

## Définition de terminé par story
Code typé et documenté; tests unitaires et intégration pertinents; UI accessible; erreurs traitées; aucun secret dans dépôt; migration si changement données; capture de démo; critères d'acceptation passés.
