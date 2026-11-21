# Hockey Doo — MVP v1.2: addendum normatif

## 0. Décisions et priorité
Nom produit: Hockey Doo (anciennement Hockey IQ Simulator). Audience: hockey mineur M11–M18. Simulation hybride 2D, éditeur de systèmes, enregistrement déterministe, diffusion privée par équipe. Cet addendum prévaut sur v1.1 et v1.0 en cas de conflit. Ne pas renommer les anciens documents, conservés pour traçabilité.

## 1. Définitions du domaine
- **PlaySystem**: règles, responsabilités, phases, déclencheurs, priorités et transitions tactiques, indépendamment des positions initiales.
- **Scenario**: état initial de patinoire, joueurs, rondelle, possession, équipes, pression et paramètres; référence une version de système.
- **Sequence**: replay immuable et déterministe d'une simulation, événements et annotations horodatées.
- **Lesson**: contenu pédagogique publié (séquences, commentaires texte, pauses, focus sur joueur) et assignable.
- **TacticalProject**: unité de création et de quota, propriétaire d'un ensemble cohérent de systèmes, scénarios, séquences et leçons; une création indépendante ne peut pas être ajoutée artificiellement au projet pour contourner le quota.
- **CatalogItem**: modèle générique global, publié par l'administration, versionné et accessible en lecture/simulation à toutes les équipes, sans consommer de quota.
- **Team**: tenant de facturation, quotas, données privées et autorisations; **Organization** regroupe facultativement plusieurs équipes.

## 2. Freemium — règles métier
Plans: FREE (1 TacticalProject actif/team), TEAM_PRO (nombre illimité de projets actifs). Le prix indicatif 49 CAD/saison est une hypothèse commerciale configurable et NON une règle codée en dur. Une équipe Free peut modifier/remplacer son projet actif, créer plusieurs scénarios et séquences cohérents à l'intérieur de celui-ci, publier et assigner des leçons; accès complet au catalogue générique. Le nombre de joueurs n'est pas facturé, mais des limites raisonnables anti-abus de stockage et débit peuvent s'appliquer, clairement documentées et configurables. Les copies éditables de contenu générique deviennent des ressources privées et consomment le quota si elles créent un projet. La consultation et la simulation des modèles génériques ne le consomment jamais.

**Anti-contournement:** chaque ressource personnalisée appartient exactement à un project_id; les créations d'un projet doivent respecter son périmètre tactique déclaré. L'API ne permet pas des projets « conteneurs » sans limite de sujets indépendants; les changements majeurs de sujet impliquent remplacement du projet ou création d'un autre. Prévoir une politique explicite et vérifiable, sans arbitrage opaque de l'IA.

**Comptage:** statut ACTIVE compte, DRAFT compte dès sa création (évite les projets brouillons illimités); ARCHIVED ne compte pas mais reste en lecture seule. FREE autorise au plus 1 projet non archivé. Les publications antérieures restent consultables suivant politique de rétention. Sur rétrogradation Pro→Free, préserver tous les projets, demander de choisir un projet actif; archiver les autres en lecture seule. Ne jamais supprimer silencieusement des contenus. Sur suppression du projet actif, réactivation d'un autre autorisée. Toute vérification de quota est atomique côté serveur (transaction, verrouillage team/entitlement, contrainte DB ou sérialisation) pour résister aux requêtes concurrentes.

**Abonnement:** entitlement calculé côté serveur avec dates de saison et état du paiement; séparer `plan_code`, `subscription_status`, `effective_from/to`, `season_id`, `billing_provider_ref`. Prévoir FREE par défaut et paiement simulé pour développement; ne pas intégrer un prestataire de paiement réel sans décision ultérieure. Contrôle d'accès distinct du contrôle de quota.

## 3. Multi-tenant et autorisations
Entités: Organization(id,name), Team(id,organization_id,age_division,season_id,plan), User(id), TeamMembership(team_id,user_id,role,status), Invitation(team_id,token_hash,expires_at,role), TacticalProject(team_id,...), ProjectVersion(project_id,...), PlaySystemVersion, ScenarioVersion, Sequence, Lesson, LessonAssignment, LessonProgress, CatalogItem, Subscription/Entitlement, AuditEvent.
Rôles minimum: PLATFORM_ADMIN (catalogue global), TEAM_ADMIN (membres, plan, projets), COACH (édition/publication/assignation), PLAYER (lecture des leçons autorisées), GUARDIAN (option de parcours mineurs; ne pas déployer d'accès guardian incomplet). Un compte peut avoir plusieurs memberships. Chaque endpoint team-scoped valide l'identité, le membership actif, le rôle et l'accès à la ressource, et jamais seulement un team_id envoyé par le client. Éviter IDOR et fuite par listes/recherches/exports. PostgreSQL RLS recommandé comme défense en profondeur, pas substitut à l'autorisation API. Tests croisés Team A/Team B obligatoires.

## 4. Moteur de sorties de zone
Introduire des phases explicites `DEFENSIVE_ZONE_RECOVERY`, `BREAKOUT_SETUP`, `BREAKOUT_EXECUTION`, `NEUTRAL_ZONE_TRANSITION`, `TURNOVER_DEFENSE`; conserver les phases de forecheck existantes. Les rôles de sortie de zone sont `PUCK_RETRIEVER`, `D_SUPPORT`, `CENTER_LOW`, `STRONG_SIDE_WINGER`, `WEAK_SIDE_WINGER`, indépendants des labels F1/F2/F3 (utilisés pour l'échec avant). Un joueur conserve son identité et son poste nominal; le moteur attribue dynamiquement des responsabilités contextuelles.

Templates initiaux: `BOARDS_BREAKOUT`, `D_TO_D_REVERSE`, `LOW_CENTER_SUPPORT`, `UNDER_PRESSURE_BREAKOUT`. Conditions configurables: position/zone de rondelle, possession, angle/temps d'interception, pression et distance adverses, lignes de passe, disponibilité du centre, couverture de l'axe, zone d'occupation. Actions typées: se rendre à une zone, offrir ligne de passe, protéger intérieur, porter, passer, renverser, attendre soutien, repli. Pas d'exécution de JS arbitraire fourni par l'entraîneur.

**Simulation:** pas fixe, seed enregistrée, ordre stable de résolution, états déterministes, géométrie de patinoire en mètres ou unités normalisées documentées, temps de réaction et limites cinématiques plausibles. Séparer politique tactique, mouvement et physique de rondelle. Journaliser événement, décisions et justification structurée. Replay basé sur snapshots + événements versionnés (moteur versionné, checksum d'état); si le moteur change, les leçons existantes restent lisibles grâce à une piste de lecture figée. Pause, seek, vitesse et focus par rôle. L'adversaire dispose de comportements simples mais cohérents: forecheck, interception, couverture et transition.

**Cas d'acceptation:** (1) D1 récupère derrière le filet et cherche centre bas; (2) pression forte ferme la bande, D1 renverse vers D2; (3) passe interceptée déclenche TURNOVER_DEFENSE; (4) sortie réussie franchit ligne bleue avec soutien; (5) l'entraîneur change une consigne et rejoue même seed; (6) changement de côté actualise les responsabilités sans oscillation à chaque tick. Tests de golden scenarios avec métriques d'écart et invariants (pas de téléportation, pas de double possession, pas de joueurs hors glace).

## 5. Publication et bibliothèque
Catalogue global read-only, catégories (sorties de zone, forecheck, entrée de zone, jeu offensif/défensif, transitions), versions publiées. Une équipe peut utiliser/assigner une leçon générique sans duplication privée. Un coach peut créer un projet depuis zéro ou depuis un template, éditer système/scénarios, enregistrer séquences, ajouter annotations et publier leçons. Publication pointe vers des versions immuables de chaque dépendance; modifier un système ne modifie pas rétroactivement une leçon publiée. Les joueurs ne voient que les leçons publiées autorisées à leur équipe/assignation; aucun lien public indexable. Progression minimale: non commencée/en cours/terminée; ne pas exposer de classement public de mineurs.

## 6. API REST (exemples de contrats)
- `GET /v1/catalog?category=breakout` ; `GET /v1/catalog/:id` ; `POST /v1/teams/:teamId/catalog/:id/assign` (assignation sans copie privée)
- `GET /v1/teams/:teamId/entitlements` (plan, quota, used, remaining, season)
- `POST /v1/teams/:teamId/projects` (création transactionnelle; 409 `PROJECT_QUOTA_EXCEEDED`)
- `GET /v1/teams/:teamId/projects` ; `PATCH /v1/teams/:teamId/projects/:projectId` ; `POST .../:projectId/archive` ; `POST .../:projectId/activate`
- `POST /v1/teams/:teamId/projects/:projectId/systems` ; `POST .../scenarios` ; `POST .../sequences` ; `POST .../lessons`
- `POST /v1/teams/:teamId/lessons/:lessonId/publish` ; `POST /v1/teams/:teamId/lessons/:lessonId/assign`
- `GET /v1/me/teams` ; `GET /v1/me/lessons` ; `PATCH /v1/me/lesson-progress/:assignmentId`
All writes: validate schemas (Zod), enforce roles/ownership, idempotency keys for retryable creates, optimistic version checks for editing, audit trail. Return stable typed error codes.

## 7. Stack et frontières
Monorepo TypeScript: `apps/web` Vue3+Pinia+PixiJS (responsive mobile player), `apps/api` NodeJS (Fastify ou Express, décision à figer), `packages/simulation-core`, `packages/tactical-engine`, `packages/play-systems`, `packages/scenario-schema`, `packages/replay`, `packages/entitlements`, `packages/authz`. PostgreSQL for relational entities; object storage for immutable snapshots/recordings; worker pour simulation UI; moteur partagé testé en Node. Éviter couplage de la physique aux comptes/abonnements. `team_id` présent sur toutes les entités privées et indexé. Migrations et seeds de catalogue versionnés.

## 8. Protection des mineurs et sécurité
Accès privé, minimum de données personnelles, consentements/autorisations parentales lorsque requis, rétention et suppression documentées, invitations expirables, journaux d'accès et d'administration, secrets hors code, TLS, limitation de débit, politique de sauvegarde/restauration. Revoir obligations applicables au Québec/Canada avec conseil juridique avant lancement. Aucun profil de joueur public; ne pas afficher le suivi individuel à d'autres joueurs.

## 9. Définition de terminé
- Deux équipes indépendantes, un coach membre des deux, isolation stricte des données et rôles.
- Free: 1 projet complet, plusieurs scénarios/séquences/lessons internes; tentative de second projet = 409 même avec 2 requêtes concurrentes; génériques accessibles sans quota.
- Pro: plusieurs projets, rétrogradation sans perte de données et choix du projet conservé actif.
- Quatre templates de sorties de zone simulables, événements et responsabilités cohérents, replay déterministe et publication immuable.
- Entraîneur publie une leçon, joueur assigné la visionne sur mobile, progression mise à jour.
- Tests unitaires, intégration, e2e, accessibilité de base, journal d'audit, documentation des limites et scripts de démo.

## 10. Hors périmètre MVP
Export MP4, audio, moteur 3D, analytics avancées, marketplace, paiements réels, intégration de fédérations, recommandations IA, partage public, synchronisation temps réel multi-utilisateur.
