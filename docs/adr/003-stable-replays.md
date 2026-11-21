# ADR-003 — Replays publiés indépendants des tactiques courantes

Statut : contrat v1 accepté; enregistrement/lecture à implémenter en M4. Date : 2026-11-20.

Un replay publié doit pouvoir être lu après modification du moteur ou des règles. Relancer la simulation à partir de seed + inputs ne suffit pas. Le format v1 conserve scenarioSnapshot, engineVersion, rulesetVersion, seed, journal d'interventions, annotations et états complets pour chaque tick, avec hash par état. Le rendu interpolera ces états sans exécuter le moteur tactique.

Choix explicite par rapport aux keyframes périodiques suggérées dans la spécification : M0 impose des snapshots contigus de tick 0 à durationTicks pour éviter une lecture dépendante du moteur entre deux images clés. À 30 Hz et cinq minutes maximum : 9 001 états. La compression, la limite d'octets décompressés et la mesure de taille réelle seront traitées en M4. Un format delta futur doit avoir sa propre version et conserver tous les états nécessaires au décodage.

Annotations et événements utilisent des ticks entiers pour éviter les erreurs d'arrondi des timestamps. Conversion UI : `ms = tick * 1000 / 30`; les pauses pédagogiques sont des durées d'affichage en ms, hors temps simulé. Les événements portent une séquence globale strictement croissante pour résoudre les interventions au même tick. Les événements émis et les inputs utilisateur sont distincts.

Le contrat refuse versions inconnues, ticks incohérents, snapshots manquants, seeds/identités divergentes, inputs hors durée et annotations hors durée. Il ne calcule pas les hashes et ne peut prouver l'authenticité ni l'autorisation : ces garanties appartiennent au code de replay et au backend.

Une leçon publiée référence une version positive, un recordingId et un checksum; une affectation cible cette version précise. L'immuabilité réelle sera imposée en base et dans le stockage objet à M5/M6 (insert-only, clés versionnées, contrôle d'accès); un schéma Zod seul ne l'impose pas. Les formats publiés restent décodables; aucun upgrade silencieux d'un fichier publié.
