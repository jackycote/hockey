# ADR-008 — Systèmes privés, DSL borné et versions publiées

Date : 2026-11-20. Statut : contrats implémentés pour le rattrapage M0 v1.1; interprétation, publication serveur et interfaces à réaliser aux jalons suivants.

## Source et portée

L’[addendum v1.1](../source/v1.1/ADDENDUM_SYSTEMES_PERSONNALISES_v1.1.md) prévaut sur les exigences v1.0 contradictoires. Les [instructions complémentaires](../source/v1.1/CODEX_V1.1_INSTRUCTIONS.md) demandent de commencer par M0, mettre à jour contrats/ADR puis arrêter pour revue. Les livraisons M1/M2 existantes restent disponibles. La v1.1 est un paquet de spécifications, sans application à remplacer ni migration fournie.

## Agrégats et compatibilité

`PlaySystem` représente un brouillon privé révisable ou archivé, avec équipe propriétaire, auteur, origine optionnelle, dates et révision. `PlaySystemVersion` représente le contenu publié autonome : identifiants, version, auteur/date de publication, `schemaVersion`, `rulesetVersion` et checksum. La copie de contenu est complète; la validation Zod la détache de l’objet brouillon fourni.

Une version publiée ne sera jamais mise à jour en place. M5 devra imposer des insertions de versions, l’unicité `(system_id, version)`, l’optimisme concurrent sur les brouillons, l’audit et les clés étrangères. La forme JSON seule ne garantit ni immutabilité en base, ni authenticité, ni permissions. Il n’existe encore aucun endpoint de publication.

Les formats v1 et leurs hashes restent inchangés. Les nouveaux agrégats sont explicites : `ScenarioV2`, `RecordingV2`, `LessonV2`, `AssignmentV2`. Les raffinements métier communs de Scenario/Recording sont partagés entre v1/v2 pour conserver les invariants de roster, patinoire, ticks, inputs et annotations. Aucun import automatique v1 → v2 n’est effectué. L’éditeur et le moteur actuels continuent de lire uniquement v1; un fichier v2 ne peut pas encore être exécuté depuis l’UI.

- Scenario v2 distingue l’équipe privée propriétaire (`teamId`) des deux côtés illustrés (`teams[].id`). Chaque référence associe un côté connu à une version publiée précise. Les deux côtés peuvent utiliser des systèmes de la même équipe propriétaire.
- Recording v2 embarque un snapshot complet par côté référencé. ID système/version, équipe, numéro, ruleset et checksum doivent correspondre exactement à la référence du scénario. La compatibilité de lecture repose sur les états capturés, sans exécuter les règles futures.
- Lesson v2 contient une liste ordonnée de références de recordings avec checksums, et des références de systèmes optionnelles. Une publication exige au moins une séquence. M5 devra résoudre les références de recordings côté serveur et vérifier leur équipe et leur existence; ces informations ne sont pas prouvables par le seul identifiant JSON.
- Assignment v2 désigne soit une version de leçon, soit une fiche système publiée. L’équipe de la ressource doit correspondre à celle de l’affectation. M5 vérifiera également l’appartenance réelle du sous-groupe et les droits du lecteur.

Les schémas de snapshots/protocole Worker M2 et le moteur `0.1.0` ne changent pas. Recording v2 est une fondation de contrat, pas encore un export du Worker. L’intégration des traces et de l’état tactique complet nécessitera une version de snapshot moteur dédiée à M3/M4; elle ne doit pas être ajoutée silencieusement au hash M2.

## Langage fermé et géométrie

Les déclencheurs, conditions et huit actions proviennent des enums de l’addendum. Les objets sont stricts : aucun champ script/expression, fonction utilisateur ou opérateur inconnu. Les explications sont du texte, jamais du code. Les combinaisons booléennes autorisées sont `all`, `any` et `not`; aucune boucle, variable mutable ou appel de fonction n’est exprimable.

Les zones et cibles utilisent le repère `rink-normalized` : x et y dans [0,1], origine et axes identiques au scénario en mètres. Les rectangles doivent rester dans le rectangle de référence; les polygones simples ont des sommets distincts, une aire non nulle et aucune auto-intersection. Les coins arrondis restent une contrainte de mouvement du moteur, pas une interdiction de dessiner une zone au coin du rectangle. Les distances sont explicitement en mètres. Le futur interpréteur convertira `x * rink.length`, `y * rink.width`; il utilisera `attackDirection` pour les objectifs relatifs au sens d’attaque. Les zones enregistrées ne sont pas automatiquement retournées par la caméra.

Les consignes par défaut portent leurs paramètres d’action et leur rôle; les cinq rôles F1/F2/F3/D1/D2 sont obligatoires. Toutes les références de zones/cibles et phases imbriquées sont vérifiées. Les rôles tactiques restent distincts des positions nominales.

Limites initiales de contrat, à éprouver avec des entraîneurs :

| Élément                                   | Maximum |
| ----------------------------------------- | ------: |
| Règles par système                        |      64 |
| Actions par règle                         |       8 |
| Niveaux de groupes booléens               |       3 |
| Enfants par groupe                        |       8 |
| Nœuds de condition par règle              |     128 |
| Zones / cibles                            | 32 / 64 |
| Sommets par polygone                      |      16 |
| Évaluations par tick (futur interpréteur) |   8 192 |

Un précontrôle itératif borne la profondeur, les groupes et le nombre de nœuds avant le parcours du schéma de condition; le schéma lui-même est déroulé sur trois niveaux, sans récursion ouverte. Priorité de règle : entier 0–1000; poids 0–100; intensité 0–1; maintien de rôle 0–300 ticks. Les limites de taille totale de requêtes/imports devront aussi être appliquées aux points d’entrée futurs.

Un brouillon peut décrire une autre famille, mais le contrat de version exécutable accepte seulement `baseTemplate: forecheck-212` et `category: forecheck`. « ExecutableSystemContent » signifie compatible avec cette famille de contrat; aucun interpréteur n’est encore livré. Les variantes 2-1-2 devront passer la validation comportementale avant publication, pas seulement la validation de forme.

## Exécution déterministe à réaliser

L’ordre retenu pour M2/M3 v1.1 est : événements → phase → règles versionnées → propositions → arbitrage collectif rôles/couverture → anti-oscillation → déplacement/possession → traces/hash.

L’interpréteur sera pur, sans DOM/réseau/horloge/hasard global. Les règles seront ordonnées par priorité décroissante, puis ID lexical ASCII; les actions conservent leur indice. Les événements auront un ordre stable tick/séquence. Une règle produit des propositions, jamais une modification directe du roster ou un événement déclenchant une réévaluation récursive dans le même tick. Les conflits et couvertures impossibles seront signalés; un départage stable ne suffit pas à déclarer un système pédagogiquement valide.

Les conditions `own/opponent` seront relatives au côté utilisant le système; `CURRENT_ROLE` sera évalué dans le contexte du candidat à l’arbitrage. Une référence de rôle sans joueur disponible donnera une condition fausse, puis un repli traçable. Le budget sera compté en opérations déterministes, pas en millisecondes; chaque évaluation de condition et proposition d’action coûtera une unité. L’épuisement du budget abandonnera les propositions partielles du tick au profit du repli 2-1-2 avec raison `BUDGET_EXCEEDED`. Une garde de temps extérieure pourra interrompre une tâche, sans valider un résultat partiel.

Les temporisations/choix précédents de l’anti-oscillation et la version de système feront partie du snapshot/hash tactique futur. `SystemDecisionTrace` ajoute version, règle, déclencheur, actions candidates, choix et codes de justification au contrat existant. Les fixtures de référence devront couvrir D-D, F3, conflits, repli et égalité Node/Worker. Ce comportement est une décision d’architecture à implémenter et tester; les tests M0 ne prouvent pas AC12/AC17.

Le serveur calculera le checksum SHA-256 du JSON canonique du contenu après validation, avec schemaVersion/rulesetVersion dans l’enveloppe couverte. Le client ne fera pas autorité sur le checksum. M0 valide uniquement la forme hexadécimale et la concordance des références; M4/M5 définiront et figeront les fixtures de publication.

## Accès et publication à réaliser

M5 ajoutera `play_systems`, `play_system_versions`, `scenario_system_refs` et `lesson_system_refs`, ainsi que les routes listées dans l’addendum. Chaque accès devra vérifier identité, rôle, équipe et affectation; une connaissance d’ID ne vaut pas autorisation. Les joueurs ne verront que les versions publiées qui leur sont assignées. Aucun endpoint privé factice n’est ajouté à l’API de santé actuelle.

## Relation avec les étapes pédagogiques

La demande utilisateur de préparer des étapes enregistrées reste distincte du calcul tactique : positionner les joueurs/rondelle à n+1, enregistrer, puis interpoler entre deux poses. Sont conservés dans le plan : chevron `>` indiquant le mouvement, direction du regard indépendante, repères de collecte d’information, étape Observation, pause/curseur et insertion d’une pose interpolée sans déplacer les étapes voisines. Cette UX n’est pas implémentée par les nouveaux contrats de systèmes; elle doit recevoir ses propres contrats/tests avant intégration, sans confondre une étape de coaching avec un tick de 1/30 s.
