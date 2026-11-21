# ADR-001 — Simulation déterministe et frontières de packages

Statut : accepté pour M0; moteur à implémenter en M2. Date : 2026-11-20.

Le cœur de simulation est headless, sans DOM, rendu, réseau ni horloge réelle. Un tick dure exactement 1/30 seconde. Toute décision dépend uniquement de l'état, du RNG seedé et des inputs ordonnés par `(tick, sequence)`. Entités triées par identifiant avec un comparateur lexical explicite, jamais par locale. L'intégration ne dépend pas des frames de PixiJS.

Le WorldState stocke seed ET état courant du RNG pour permettre la reprise depuis un snapshot. L'algorithme de RNG sera figé et versionné en M2. Les hashes utiliseront SHA-256 d'un JSON canonique (ordre de clés et entités explicite, normalisation des nombres); cet algorithme est à implémenter et tester en M2. Les chaînes de hash du contrat M0 sont des emplacements, pas une preuve d'intégrité calculée.

Coordonnées en mètres depuis le coin `(0,0)`, x dans `[0,length]`, y dans `[0,width]`; vitesse en m/s et orientation en radians dans `[-π,π]`. Dix patineurs, deux équipes, cinq positions nominales par équipe. Les rôles tactiques sont indépendants des positions nominales; ils peuvent être nuls avant attribution. Les paramètres de 2-1-2 sont des hypothèses configurables, à revoir avec des entraîneurs en M3.

Les packages ne dépendent que des contrats à M0. En M2–M4, simulation-core et tactics pourront être composés par un orchestrateur Worker; le rendu consomme des états. Le lint interdit les usages directs de Math.random, Date et performance dans ces deux packages, mais ne constitue pas une preuve complète de déterminisme. Des tests de traces et de hashes multi-exécutions seront nécessaires. La reproductibilité entre architectures numériques reste à mesurer; toute quantification future doit être versionnée.

Alternatives écartées : timestep variable lié au rendu; RNG global; attribution F1/F2/F3 fixe par poste nominal. Aucun comportement tactique n'est livré à M0.
