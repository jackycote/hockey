# Plan intégré — Hockey IQ Simulator MVP v1.1

Date : 2026-11-20. Référence normative : [addendum v1.1](source/v1.1/ADDENDUM_SYSTEMES_PERSONNALISES_v1.1.md), puis spécification et plan v1.0 en l’absence de conflit. Les originaux sont conservés dans `docs/source`; ce document décrit l’intégration au dépôt déjà développé.

## État actuel

L’éditeur M1 et le moteur déterministe M2 v1.0 sont livrés localement. Le rattrapage **M0 v1.1** ajoute les contrats de systèmes personnalisés, leurs liens versionnés et l’[ADR-008](adr/008-custom-play-systems.md). Le rattrapage M0 a fait l’objet de sa revue. La demande utilisateur suivante ajoute maintenant le montage local de séquences, décrit dans le [bilan Timeline](TIMELINE-REVIEW.md). Les nouvelles capacités tactiques ne sont pas encore disponibles dans l’application.

## Jalons révisés

| Jalon                | Livrables et dépendances                                                                                                                    | État                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| M0 v1.1              | PlaySystem, PlaySystemVersion, DSL fermé/borné, liens Scenario/Recording/Lesson/Assignment, ADR de versionnement et tests de contrat        | Livré pour revue                                   |
| M1 v1.1              | « Mes systèmes », modèle 2-1-2, brouillons, zones/cibles, rôles, statut explicite compatible/incompatible                                   | À faire; éditeur de scénarios M1 existant conservé |
| M2 v1.1              | Interpréteur DSL pur, budget déterministe, repli, tests de limites; conserver le moteur physique déterministe                               | À faire; moteur physique M2 existant conservé      |
| M3 v1.1              | Phases, 2-1-2 configurable, propositions, arbitrage collectif, couverture, anti-oscillation, traces et validation tactique                  | À faire après interpréteur                         |
| **M3.5 obligatoire** | Éditeur SI/ALORS, déclenchements expliqués en test, détection/résolution des conflits, cas de référence revus par coach                     | À faire après M3, avant publication                |
| M4 v1.1              | Capture/seek de replay, snapshot complet du système et de l’état tactique, leçons à plusieurs séquences, compatibilité avec anciens replays | À faire après contrats et modèle tactique          |
| M5 v1.1              | Auth/rôles, migrations, API systèmes/versions, publication immuable, audit, stockage privé, isolation et tests IDOR                         | À faire; requis avant tout partage réel            |
| M6 v1.1              | Catalogue privé, fiches système mobiles en lecture seule, affectations système seul/leçon, lecteur joueur                                   | À faire après publication et accès serveur         |
| M7 v1.1              | Pilote M11–M18, revue pédagogique, accessibilité/performance, sécurité mineurs, non-régression                                              | À faire après parcours complets                    |

Chaque jalon produit code, tests, bilan et revue avant le suivant. Ne pas marquer un jalon terminé sur la seule présence de schémas ou d’écrans sans comportement vérifié.

## Priorité UX issue de la conversation

L’éditeur d’étapes pédagogiques est désormais implémenté comme montage local, à la demande explicite de l’utilisateur. Il traverse M1 (édition), M4 (lecture/capture) et M6 (collecte d’information) et peut être livré progressivement avant l’intelligence tactique complète :

1. Une séquence commence avec la pose initiale. « Étape suivante » crée une pose éditable; le coach place tous les joueurs et la rondelle, choisit une durée, puis enregistre l’étape.
2. La lecture interpole de n à n+1. Un chevron `>` indique la direction de déplacement; la direction du regard peut différer du déplacement, notamment lors d’un patinage arrière.
3. Une étape Observation définit le joueur concerné, où regarder et la question/consigne. Le mode coach peut montrer un halo ou un cône; le mode entraînement doit permettre de masquer l’indice avant la réponse.
4. Pause et curseur permettent de s’arrêter entre deux poses. « Insérer une étape ici » fige la pose interpolée, divise la transition et conserve sa durée totale ainsi que les poses voisines. Le coach peut ensuite modifier et enregistrer la nouvelle étape.
5. Historique annuler/rétablir, sauvegarde/import/export versionnés et tests de lecture/insertion rendent ce parcours fiable avant connexion aux leçons.

Les contrats et cas limites de pose, insertion, possession, orientation et temps sont décrits dans l’[ADR-009](adr/009-authored-timeline.md). La timeline locale concrétise les points 1, 2, 4 et 5; le point 3 possède un mode coach avec repères visibles, tandis que le mode joueur et les réponses restent à réaliser. Cette livraison ne clôt pas les jalons tactiques ou de partage v1.1. La maquette dans `work/proposals/coaching-sequence.html` reste un ancien artefact de proposition.

## Acceptation supplémentaire

| Critère | Preuve attendue                                                                                                            | Jalon / état                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| AC11    | Coach crée une variante 2-1-2 sans code, sauvegarde et recharge son brouillon                                              | M1/M3.5 — à réaliser                                                        |
| AC12    | Règle D-D conditionnelle déclenchée pendant la simulation, avec explication et trace                                       | M2/M3/M3.5 — à réaliser                                                     |
| AC13    | Références/paramètres invalides et règles contradictoires signalés avant publication                                       | Validation structurelle M0 livrée; conflits M3.5/M5 à réaliser              |
| AC14    | Nouvelle publication insérée sans mutation de l’ancienne; modification du brouillon ne change ni leçon ni replay existants | Copie et liens de contrat M0; service/DB et non-régression M4/M5 à réaliser |
| AC15    | Joueur assigné accède à fiche/démonstration en lecture seule; accès brouillon et écriture refusés                          | M5/M6 — à réaliser                                                          |
| AC16    | Accès par ID/URL d’une autre équipe refusé pour système, version, leçon et recording                                       | Concordance d’équipes au contrat M0; autorisation/IDOR M5/M6 à réaliser     |
| AC17    | Même version/scénario/seed/inputs donne résultats et traces identiques dans Node et Worker                                 | Déterminisme physique M2 existant; règles/traces M2/M3 v1.1 à réaliser      |

Les critères AC1–AC10 du package initial restent applicables. Les autres familles tactiques restent hors simulation exécutable du MVP; leurs brouillons ne constituent pas une promesse de prise en charge.
