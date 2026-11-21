# Hockey Doo — Plan de développement MVP v1.2 pour Codex

Ordre recommandé, avec jalons démontrables. Prioriser le vertical slice plutôt que l'implémentation de toutes les abstractions avant une démo.

| Jalon | Livraison | Tests bloquants |
|---|---|---|
| M0 | Monorepo TS, conventions, CI, Docker PostgreSQL, seeds, contrats Zod | build/lint/test, migrations répétables |
| M1 | Rink PixiJS, éditeur initial, postes et rondelle, responsive | sauvegarde/restauration scénario, coordonnées cohérentes |
| M2 | Moteur déterministe, mouvements, possession, journal et snapshots | même seed => mêmes checksums; invariants physiques |
| M3 | Forecheck 2-1-2 + sorties de zone (4 templates), phases et rôles contextuels | golden scenarios, interceptions et renversements |
| M3.5 | PlaySystem/Scenario/Sequence/Lesson, éditeur règles typées, versions | schémas invalides rejetés, versions immuables |
| M4 | Enregistrement/replay, annotations, leçon publiable | seek et lecture reproductibles après changement moteur |
| M5 | Organisations, équipes, membres, rôles, authz, invitations | tests cross-tenant/IDOR, permissions négatives |
| M5.5 | FREE/TEAM_PRO, quota projet, entitlement, archivage/rétrogradation | double-create concurrent, 409, pas de perte de données |
| M6 | Catalogue global, assignation sans duplication, portail joueur mobile | accès uniquement aux leçons autorisées, progression |
| M7 | E2E, sécurité mineurs, observabilité, performances, documentation | parcours coach→joueur, sauvegarde/restauration, a11y |

## Lots Codex
Chaque lot: (1) proposer plan et fichiers touchés; (2) implémenter uniquement le jalon demandé; (3) tests automatisés; (4) démo locale et données seed; (5) résumer décisions et limites; (6) attendre validation. Ne pas commencer les jalons suivants sans instruction.

## Priorité des scénarios de sorties de zone
1. Récupération derrière le filet + centre bas.
2. Passe par la bande, ailier côté rondelle.
3. Renversement D à D sous pression.
4. Interception et transition défensive.

## Données de démo
Organisation « Association Démo », équipes « M11 Démo » FREE et « M13 Démo » PRO, coach membre des deux, joueurs factices, 4 templates globaux, 1 projet Free complet avec 2 scénarios et 2 séquences, 2 projets Pro, une leçon assignée. Aucune donnée personnelle réelle.

## Non-objectifs
Ne pas ajouter un système de paiement réel, de l'IA générative ou des fonctionnalités de réseau social au MVP. Le prix de 49 CAD/saison reste configurable et indicatif.
