# Hockey IQ Simulator — Addendum MVP v1.1 : systèmes tactiques personnalisés

Date : 2026-11-20. Cet addendum étend et prévaut sur les sections contradictoires du package MVP v1.0. Le MVP inclut désormais la création, le test, la publication et le partage privé de systèmes tactiques personnalisés.

## 1. Concepts et relations
- **PlaySystem** : configuration de stratégie de l'équipe, comportant phases, rôles, règles, zones et priorités. Appartient à une équipe; peut dériver d'un modèle fourni.
- **PlaySystemVersion** : version immuable publiée, avec schemaVersion, rulesetVersion, checksum et auteur.
- **Scenario** : positions initiales, rondelle, équipes, événements de départ et référence à une version précise du système.
- **Recording** : déroulement déterministe et interventions, avec snapshot complet du système utilisé.
- **Lesson** : une ou plusieurs séquences de replay annotées, éventuellement reliées à la version publiée du système.
- **Assignment** : affectation privée à l'équipe ou un sous-groupe; accès vérifié serveur.
- Un système peut alimenter plusieurs scénarios et leçons. Modifier un brouillon ne modifie jamais une leçon publiée.

## 2. Parcours coach MVP
1. Ouvrir « Mes systèmes » dans l'espace équipe; créer depuis le modèle 2-1-2 ou dupliquer un système de son équipe.
2. Nommer, décrire, choisir la catégorie et les phases couvertes; positionner les joueurs sur la patinoire.
3. Dessiner des zones et cibles, définir les priorités de couverture et les consignes par rôle.
4. Construire des règles « SI [événement/condition] ALORS [action] », avec opérateurs prédéfinis et paramètres bornés; visualiser la priorité des règles.
5. Valider le système (conflits, couverture manquante, règles inatteignables, cycles, références invalides).
6. Tester dans un scénario : play/pause/step, visualisation des décisions et des règles déclenchées; modifier puis retester.
7. Publier une version immuable et l'associer à une leçon avec démonstration enregistrée et annotations; affecter aux joueurs autorisés.

## 3. Parcours joueur MVP
- Consulter les systèmes et leçons publiés et assignés à son équipe.
- Ouvrir une fiche de système en lecture seule : objectif, formation, rôles, règles expliquées en français, phases et variantes.
- Visionner les démonstrations interactives (pause, vitesse, focus joueur, annotations).
- Aucun accès aux brouillons, à l'édition ou aux systèmes d'autres équipes.

## 4. Éditeur visuel et règles autorisées
MVP : modèles 2-1-2, zones rectangulaires/polygonales simples, points-cibles, flèches de déplacement, rôles F1/F2/F3/D1/D2, déclencheurs prédéfinis : PUCK_ENTER_ZONE, PUCK_SWITCH_SIDE, POSSESSION_GAINED, POSSESSION_LOST, OPPONENT_PASS, ROLE_UNAVAILABLE, PHASE_CHANGED.
Conditions : zone rondelle, côté, équipe possédant la rondelle, phase, distance relative, rôle actuel, zone couverte.
Actions : SET_ROLE_PRIORITY, SET_TARGET_ZONE, PRESS_PUCK_CARRIER, COVER_LANE, HOLD_CENTER, SUPPORT_PUCK, RETREAT_TO_ZONE, SET_PRESSURE_INTENSITY.
Règles structurées JSON uniquement; **aucun JavaScript fourni par les entraîneurs, aucune expression eval, aucun script exécuté côté serveur**. Limites sur le nombre de règles, la profondeur et la durée de calcul. Priorité explicite, repli sur comportement sûr, anti-oscillation et détection des conflits.
Le modèle 2-1-2 est le seul système pleinement simulable au lancement; les variantes personnalisées de ce modèle le sont aussi. Autres familles de systèmes : ajout ultérieur après validation pédagogique. L'éditeur doit indiquer clairement les capacités prises en charge et refuser une publication exécutable incompatible.

## 5. Contrat JSON indicatif
```json
{
  "schemaVersion": 1,
  "id": "system-uuid",
  "teamId": "team-uuid",
  "name": "Notre 2-1-2",
  "baseTemplate": "forecheck-212",
  "supportedPhases": ["defensive_possession", "loose_puck"],
  "roleSettings": {"F3": {"defaultObjective": "HOLD_CENTER"}},
  "rules": [{
    "id": "rule-switch",
    "priority": 100,
    "when": {"event": "PUCK_SWITCH_SIDE", "phase": "defensive_possession"},
    "then": [{"action": "SET_ROLE_PRIORITY", "role": "F2", "value": "PRESS_PUCK_CARRIER"}],
    "explanation": "F2 prend la pression si son angle le permet"
  }],
  "fallbackStrategy": "forecheck-212-default"
}
```
Les schémas Zod doivent valider les bornes, les références, les versions et les enums; les priorités sont résolues de façon déterministe.

## 6. Ordre d'exécution du moteur
À chaque tick fixe : événements -> détection phase -> règles du système versionné -> propositions d'objectifs -> arbitrage global des rôles et de la couverture -> anti-oscillation -> déplacement/possession -> traces et hash. Une règle coach exprime une préférence/contrainte tactique, mais ne contourne pas les invariants du moteur (limites patinoire, nombre de rôles, absence de duplication illégale). Traces : systemVersionId, ruleId, trigger, candidate actions, chosen action, reasonCodes.

## 7. Modèle de données additionnel
`play_systems(id, team_id, owner_id, name, category, draft_json, created_at, updated_at, archived_at)`;
`play_system_versions(id, system_id, version, schema_version, ruleset_version, content_json, checksum, published_by, published_at)`;
`scenario_system_refs(scenario_id, team_id, system_version_id, side)`;
`lesson_system_refs(lesson_version_id, system_version_id)`.
Contraintes d'unicité (system_id,version), références immuables, validation de même équipe pour toutes les associations. Audit des créations, modifications, publications et archivages.

## 8. API REST additionnelle
- `GET/POST /teams/:teamId/play-systems`
- `GET/PATCH /play-systems/:systemId` (brouillon coach uniquement, contrôle d'appartenance)
- `POST /play-systems/:systemId/validate`
- `POST /play-systems/:systemId/test` (validation et scénario de test, calcul local recommandé)
- `POST /play-systems/:systemId/publish` (création version immuable)
- `GET /play-systems/:systemId/versions/:version` (accès selon rôle, publication et équipe)
- `POST /play-systems/:systemId/archive`
- `GET /me/play-systems` (versions publiées visibles pour le joueur)
Toutes les routes : auth, rôle, team isolation, schémas, pagination, rate limiting et tests IDOR.

## 9. Intégration à l'enregistrement et au partage
Un enregistrement sauvegarde le `playSystemVersionId`, la version des règles et un snapshot de configuration; les keyframes garantissent la lecture indépendante des versions futures. Une leçon publiée référence la version immuable. L'entraîneur peut affecter une fiche système seule ou une leçon associée. Le joueur voit seulement les ressources publiées et assignées. Aucune URL publique non authentifiée.

## 10. UX et validation
Onglets coach : « Mes systèmes », « Éditeur », « Tester », « Leçons », « Équipe ». Panneau latéral avec règles en langage naturel, éditeur de zones et aperçu des déclenchements. Indicateurs explicites : brouillon, valide, publié, incompatible. Vue joueur : « Systèmes de mon équipe » et « Leçons à regarder ».
Tests : règle D-D change priorité de pression; F3 conserve couverture; deux règles contradictoires ont résolution stable; pas de boucle infinie; scénario identique + même version + seed => même hash; système publié immuable; brouillon inaccessible aux joueurs; isolation entre équipes; ancien replay reste identique après modification du système.

## 11. Plan Codex révisé
- **M0** : ajouter contrats PlaySystem, PlaySystemVersion, DSL de règles et ADR de versionnement.
- **M1** : UI « Mes systèmes », création depuis modèle et placement des zones/rôles.
- **M2** : moteur déterministe inchangé, plus interpréteur DSL pur et borné.
- **M3** : faire du 2-1-2 un modèle paramétrable; règles personnalisées, arbitrage, traces et validation.
- **M3.5 (nouveau jalon obligatoire)** : éditeur de règles SI/ALORS, test d'un système personnalisé, résolution de conflits, tests de référence coach.
- **M4** : intégrer snapshot/version système dans Recording et Lesson.
- **M5** : tables, API, isolation et publication des systèmes.
- **M6** : catalogue de systèmes publiés, fiches en lecture seule, affectation et lecteur joueur.
- **M7** : essais M11–M18, sécurité mineurs, tests de non-régression.
Ne pas coder une plateforme de programmation visuelle arbitraire ni toutes les familles tactiques au MVP.

## 12. Critères d'acceptation supplémentaires
AC11 Le coach crée une variante 2-1-2 sans coder et enregistre son brouillon.
AC12 Il définit une règle conditionnelle et observe son déclenchement expliqué pendant la simulation.
AC13 Une règle conflictuelle ou invalide est signalée avant publication.
AC14 La publication crée une version immuable; le brouillon ultérieur n'altère ni le système publié ni les leçons existantes.
AC15 Un joueur assigné voit la fiche et la démonstration, mais ne peut ni modifier ni accéder aux brouillons.
AC16 Un joueur d'une autre équipe ne peut accéder au système, à sa version ou à ses enregistrements.
AC17 Même système versionné + scénario + seed + événements produit le même résultat et les mêmes traces.
