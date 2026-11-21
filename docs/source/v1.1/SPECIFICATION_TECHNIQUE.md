# Hockey IQ Simulator — Spécification technique MVP v1.0
Date : 2026-11-20
Public : hockey mineur M11 à M18, Québec; interface française en premier, internationalisation prévue.

## 1. Objectif
Permettre à un entraîneur de créer une situation 5 contre 5, simuler de façon hybride les déplacements tactiques, intervenir en cours de simulation, enregistrer une démonstration commentée et publier une leçon accessible uniquement aux membres autorisés de son équipe. Le joueur peut revoir la leçon sur téléphone ou ordinateur.

## 2. Périmètre MVP
Inclus : équipes privées; invitations contrôlées; rôles coach/player/team-admin; éditeur 2D; patinoire réglementaire paramétrable; 10 patineurs et rondelle (gardiens visuels statiques facultatifs); possession simplifiée; échec avant 2-1-2; rotation dynamique F1/F2/F3; D1/D2 avec couverture; adversaires automatiques simples; simulation déterministe; pause/avance/retour à état initial; intervention par glisser-déposer pendant pause; enregistrement et replay; annotations textuelles/flèches à horodatage; leçon publiée; affectation à l'équipe ou sous-groupe; lecteur mobile; suivi minimal de complétion.
Exclus : vraie vidéo MP4, commentaires audio, chat, messagerie privée, classement public, évaluations psychométriques, statistiques individuelles de performance, moteurs 3D, jeu en direct multijoueur, contacts réalistes, hors-jeu/pénalités complets, IA générative obligatoire.

## 3. Principes
- Les rôles F1/F2/F3 sont des responsabilités contextuelles et non des identités fixes.
- Un système tactique est une configuration explicite, révisable par l'entraîneur.
- Les décisions doivent être explicables et testables.
- Simulation locale déterministe, graine fixe, pas de temps fixe 1/30 s; rendu indépendant à 60 fps si possible.
- La publication produit une version immuable de la leçon; les brouillons peuvent être modifiés.
- Les données d'équipes sont isolées strictement côté serveur.
- Vie privée des mineurs par défaut.

## 4. Parcours utilisateur
### Entraîneur
1. Créer une équipe M11–M18, inviter les membres via codes à usage unique et expiration.
2. Ouvrir l'éditeur, placer 10 patineurs, sélectionner possession, position et vitesse initiales de la rondelle, stratégie 2-1-2 et consignes.
3. Démarrer, mettre en pause, intervenir, reprendre; voir la timeline et les rôles.
4. Enregistrer les événements et snapshots; rejouer; placer des annotations temporelles et pauses pédagogiques.
5. Sauvegarder brouillon, publier version, affecter à toute l'équipe ou à un groupe, définir date cible facultative.
6. Voir complétions individuelles seulement dans l'équipe autorisée.
### Joueur
1. Accéder à son espace privé et à ses leçons assignées.
2. Visionner le replay avec play/pause, vitesse 0.5x/1x/1.5x, timeline, zoom, choix de joueur et annotations.
3. Marquer comme terminé; la complétion peut être calculée selon visionnement de >= 90 % des segments uniques, avec possibilité d'un bouton explicite de confirmation.

## 5. Architecture
Monorepo pnpm + TypeScript strict.
- `apps/web`: Vue 3 + Vite + Pinia + Vue Router + PixiJS; i18n fr-CA; accessible clavier/tactile.
- `apps/api`: Node.js LTS + Fastify ou Express, Zod, OpenAPI, auth via provider OIDC compatible et sessions sécurisées.
- `packages/simulation-core`: état, horloge, géométrie, déplacements, possession, événements, snapshots, RNG seedé.
- `packages/tactics`: phase detection, stratégie, affectation des rôles, objectifs, décision et trace explicative.
- `packages/replay`: sérialisation versionnée, validation, lecture, seek, snapshots.
- `packages/contracts`: Zod schemas partagés et types API.
- `packages/coaching`: annotations, versions et critères de complétion.
- PostgreSQL : métadonnées, comptes, équipe, affectations, progression.
- Stockage objet compatible S3 : enregistrements compressés et miniatures.
- Web Worker pour boucle simulation; pas de dépendance DOM dans le moteur.

## 6. Modèle tactique
Phases : `neutral`, `offensive_possession`, `defensive_possession`, `loose_puck`, `transition_to_attack`, `transition_to_defense`. Sous-phase initiale : `forecheck_212`.
Entités : `Player {id, teamId, nominalPosition, pos, vel, heading, stamina?, role, objective}`; `Puck {pos, vel, holderId|null}`; `WorldState {tick, seed, players, puck, phase, tacticsByTeam}`.
Rôle de pression : sélection parmi les attaquants à partir du temps d'interception estimé, de l'angle d'approche, des lignes de passe, de la couverture et de la continuité du rôle. Optimisation collective sur permutations F1/F2/F3; pénalité de zones non couvertes et coût de changement de rôle. Hystérésis configurable (p.ex. 0.5 s de maintien, sauf événement de possession) afin d'éviter le scintillement des rôles.
D1/D2 : protéger le centre, maintenir écart et soutien; ne pas appliquer aveuglément les règles de F1/F2/F3. Configurer l'engagement offensif et le risque de contre-attaque.
Chaque décision émet `DecisionTrace {tick, playerId, oldRole, newRole, reasonCodes[], candidateScores?, targetPoint}`. Codes traduisibles (`PUCK_SWITCH_SIDE`, `BEST_PRESSURE_ANGLE`, `CENTER_COVERAGE`, `ROLE_STABILITY`, etc.).
Mouvements : accélération, vitesse maximale, inertie, virage limité, steering vers une cible; résolution simple des chevauchements. Possession simplifiée par proximité + orientation + délai de récupération, passes à trajectoire calculée, pertes/récupérations déclenchées par événements.
Adversaires : comportements minimaux crédibles (protéger rondelle, passe latérale D-D, dégagement, déplacement en soutien). Les tactiques doivent être évaluées par entraîneurs; les résultats ne prétendent pas prédire les vrais matchs.

## 7. Simulation et reproductibilité
Boucle : input events -> phase detection -> role assignment -> tactical decisions -> motion/puck integration -> collision/possession -> emitted events -> state hash. Pas fixe 33.333 ms, RNG seedé, ordre de tri stable par id, aucune horloge réelle dans la logique.
Le `Scenario` comprend version de schéma, dimensions patinoire, équipes, positions, possession, seed, paramètres tactiques. L'enregistrement contient `engineVersion`, `rulesetVersion`, `scenarioSnapshot`, `seed`, `inputEvents`, `keyframes`, `annotations`, `stateHashes` et durée.
Replays : privilégier keyframes périodiques + états interpolés ou événementiel; pour un rendu identique malgré évolution du moteur, conserver snapshots/keyframes d'état complets et version du moteur. Le replay publié doit fonctionner sans relancer la logique tactique courante. Seek par keyframe la plus proche. Limiter taille et durée (MVP 5 min) et compresser.

## 8. Éditeur et lecteur
Éditeur : vue dessus; sélection, glisser-déposer, grille facultative, zoom, pan, orientation gauche/droite, identification des rôles, flèches de trajectoire et zones de couverture; undo/redo au minimum pour les positions initiales; contrôle play/pause/step/reset; capture de leçon.
Lecteur : mobile-first, contrôles tactiles, vitesse, seek, focus joueur, panneau d'explication et annotations synchronisées, indication du statut de leçon. Pas d'édition pour le joueur.
Accessibilité : contrastes, alternatives aux seules couleurs (labels F1...), commandes clavier, focus visible, support réduction des animations.

## 9. Données PostgreSQL (minimum)
`users(id, oidc_sub, display_name, created_at)`; `teams(id, name, age_group, owner_id)`; `memberships(id, team_id, user_id, role, status)`; `invitations(id, team_id, role, token_hash, expires_at, used_at)`; `scenarios(id, team_id, owner_id, title, schema_version, json, updated_at)`; `lessons(id, team_id, author_id, title, description, status, created_at)`; `lesson_versions(id, lesson_id, version, recording_key, checksum, published_at)`; `annotations(id, lesson_version_id, at_ms, kind, payload)`; `assignments(id, team_id, lesson_version_id, target_type, target_id, due_at)`; `lesson_progress(id, assignment_id, user_id, watched_percent, completed_at)`; `audit_events(id, actor_id, team_id, action, target_id, at)`.
Indices sur team_id et clés étrangères; contraintes uniques (team_id,user_id), (lesson_id,version), (assignment_id,user_id). Suppression et rétention contrôlées.

## 10. API REST v1
`POST /teams`, `GET /teams/:id`, `POST /teams/:id/invitations`, `POST /invitations/accept`, `GET /teams/:id/members`;
`GET/POST /teams/:id/scenarios`, `GET/PATCH /scenarios/:id`;
`POST /teams/:id/lessons`, `PATCH /lessons/:id`, `POST /lessons/:id/recordings` (upload autorisé signé ou direct), `POST /lessons/:id/publish`, `GET /lessons/:id/versions/:v`;
`POST /teams/:id/assignments`, `GET /me/assignments`, `POST /assignments/:id/progress`;
`GET /teams/:id/completions` (coach only).
Chaque endpoint valide auth, membership, role, team ownership, payload, taille et version. Utiliser pagination, erreurs normalisées, OpenAPI, rate limiting. Ne jamais faire confiance au teamId transmis sans vérification.

## 11. Sécurité et vie privée
- Accès privé uniquement; pas d'URL publique vers les leçons.
- Authentification OIDC; tokens dans cookies HttpOnly Secure SameSite, CSRF selon architecture; TLS.
- Vérification d'autorisation sur chaque accès objet; téléchargement via URL signée courte après contrôle serveur.
- Invitations aléatoires, hachées, expirables et révocables; ne pas exposer de listes de mineurs publiquement.
- Collecte minimale : pseudonyme ou prénom choisi; pas de date de naissance complète requise; pas de photos ni de coordonnées dans le MVP.
- Processus de consentement parental/autorisation adapté aux âges et exigences locales à faire valider juridiquement avant déploiement réel; prévoir suppression, export, rétention, audit et réponse aux incidents.
- Aucune communication directe joueur-joueur, ni classement public, ni publicité comportementale.
- Isolation multi-tenant et tests systématiques IDOR; chiffrement au repos et en transit; sauvegardes et politique de rétention.

## 12. Exigences non fonctionnelles
- Desktop moderne + Safari/Chrome mobiles; 30 ticks/s stables sur appareil moyen, rendu fluide avec dégradation visuelle si nécessaire.
- Chargement leçon courte en moins de 3 s sur connexion correcte (objectif à mesurer), lecture sans blocage UI.
- Enregistrement/replay sans divergence pour une même version du moteur; tests de hashes déterministes.
- API versionnée; migrations DB; observabilité minimale (erreurs, latence, stockage) sans collecte de données excessives.
- Tests unitaires, intégration, E2E Playwright, audits sécurité et accessibilité.

## 13. Critères d'acceptation MVP
AC01 Un coach crée une équipe M13 privée et invite un joueur qui ne voit aucune autre équipe.
AC02 Le coach crée une situation avec 10 patineurs, une rondelle, une possession et la stratégie 2-1-2.
AC03 La simulation tourne à pas fixe; même seed + mêmes inputs produisent les mêmes hashes d'état.
AC04 Passe D-D adverse : les rôles F1/F2/F3 sont réévalués, les traces expliquent les changements, pas de changements incessants.
AC05 Une intervention en pause est enregistrée puis reproduite exactement au replay.
AC06 Le coach annote la timeline et publie une version immuable.
AC07 Le joueur assigné voit et lit la leçon sur mobile; un joueur hors équipe reçoit 403/404 sans fuite.
AC08 Seek, pause, vitesse et focus joueur fonctionnent en lecture.
AC09 Une complétion est enregistrée et visible uniquement par coach autorisé.
AC10 Les tests d'isolation, de reproductibilité, de migration et de restauration de données passent.

## 14. Décisions ouvertes
Provider OIDC, hébergement, rétention, modèle exact de consentement des mineurs, dimensions/variantes de patinoire, conventions F1/F2/F3 propres aux clubs, règles précises d'attribution et durée max des leçons. Documenter en ADR avant de figer ces choix.
