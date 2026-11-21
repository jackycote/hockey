# HockeyDoo — Simulateur tactique

Plateforme tactique privée, française d'abord, pour le hockey mineur M11–M18. **v1.2 : espaces d'équipe, projets Free/Pro, systèmes personnalisés, quatre sorties de zone, forecheck 2-1-2, simulation déterministe, leçons privées et portail joueur.** L'éditeur local et son montage par étapes restent disponibles.

Démarrer la démonstration avec `pnpm demo`, puis ouvrir `http://127.0.0.1:5174/equipes`. Comptes et données fictifs uniquement. Voir le [guide v1.2](docs/V1.2-RUNBOOK.md), l'[état de validation](docs/V1.2-STATUS.md) et la [décision d'architecture](docs/adr/010-v12-platform.md). Les spécifications originales sont préservées sous [docs/source/v1.2](docs/source/v1.2/README.md).

## Backlog et approbation

L'utilisateur a autorisé tous les jalons v1.2 (BKL-027–036) sans validations intermédiaires. Pour les nouvelles demandes hors de ce périmètre, depuis le 2026-11-20, tout changement est enregistré comme proposition dans le [backlog](docs/BACKLOG.md) et attend l’approbation explicite de l’utilisateur avant implémentation. Les instructions du dépôt sont consignées dans [AGENTS.md](AGENTS.md). BKL-001 (timeline sous la patinoire, même largeur) et BKL-002 (retour au début) ont été approuvés par l’utilisateur et implémentés le 2026-11-20; leur validation figure dans le backlog.

## Démarrage local

Prérequis : Node.js 24 (version de développement dans `.nvmrc`) et pnpm 12.21.0. Avec Corepack disponible, exécuter `corepack enable pnpm` pour activer le binaire dans le PATH (les scripts imbriqués utilisent `pnpm`). Voir les [instructions officielles pnpm](https://pnpm.io/installation). Docker Compose v2 est nécessaire seulement pour PostgreSQL/MinIO, pas pour la simulation locale M2.

```sh
corepack enable pnpm
corepack pnpm install --frozen-lockfile
corepack pnpm setup:env
corepack pnpm dev
```

Ouvrir http://127.0.0.1:5174. L’éditeur fr-CA s’ouvre à la racine. La page technique de M0 reste accessible sous `/fondation` et interroge réellement `GET /api/health` via le proxy Vite. API : http://127.0.0.1:3000/api/health; OpenAPI : http://127.0.0.1:3000/api/openapi.json. L'API est liée à `127.0.0.1` par défaut; configurer `API_HOST`/`API_PORT` dans `.env` au besoin. Redémarrer Vite après modification. Aucun secret n'est transmis au client.

`setup:env` crée des identifiants locaux aléatoires et préserve un `.env` existant. OIDC est nécessaire à la connexion de production; la démonstration utilise les comptes fictifs explicitement activés par `pnpm demo`. Les packages partagés doivent être reconstruits après modification (`pnpm --filter @hockey-iq/simulation-core... -r build`), puis redémarrer les serveurs. Le script dev fait cette construction au démarrage.

Le logo HockeyDoo fourni est servi localement, sans modification, sur les pages Atelier et Fondations. L’interface reprend ses couleurs marine, bleu, blanc et rouge.

## Utiliser l’éditeur

1. Choisir l’équipe, puis un patineur dans le roster ou sur la glace. Les dix patineurs et la rondelle sont toujours présents.
2. Glisser pour déplacer, ou utiliser **Placer** puis toucher la glace. L’inspecteur permet de saisir position, vitesse initiale et orientation. Les déplacements restent dans les bandes; annuler/rétablir fonctionne aussi pour un glisser complet, l’import et la réinitialisation.
3. Donner/libérer la rondelle ou choisir son porteur dans la liste de possession. Déplacer un porteur déplace aussi sa rondelle; déplacer la rondelle la rend libre.
4. **Tracer une cible** affiche une flèche vers le point choisi. Les options **Rôles**, **Trajectoires** et **Grille** se trouvent dans l’onglet **Patinoire** à droite; ces options, ainsi que le pan, le zoom (molette/pincement) et l’inversion de vue, changent seulement l’affichage.
5. **Enregistrer** conserve un brouillon dans ce navigateur, restauré au rechargement. **Exporter JSON** crée un fichier v1; **Importer** charge un fichier validé de 256 Kio maximum. Un import erroné conserve le travail courant. Les paramètres avancés proposent aussi de recharger le dernier brouillon enregistré.

La barre verticale à gauche commence par **Réinitialiser le scénario**, puis les outils Déplacer, Placer, Tracer une cible et Déplacer la vue, Annuler/Rétablir et les commandes de vue (Zoom de la patinoire, cadrer et inverser). L’espacement est compact : centres espacés de 36 px sur souris, icônes inchangées et cibles de 40 px conservées sur tactile. Elle défile dans sa propre hauteur lorsque nécessaire. Le zoom et le pan sont conservés pendant la lecture et la simulation. Le bouton **Zoom de la patinoire** ouvre vers la droite une rangée compacte avec −, un curseur horizontal de 100 à 300 %, le pourcentage, + et **Réinitialiser le zoom à 100 %**. Ce dernier recentre la patinoire à 100 % en conservant son orientation, sans fermer le panneau. Échap ferme et restitue le focus; cliquer ou passer le focus ailleurs ferme sans détourner la nouvelle cible. Le zoom vertical de la timeline reste indépendant. Haut/Bas et Début/Fin parcourent les commandes disponibles; Entrée/Espace les activent.

Les commandes à icônes ont un nom français accessible et une infobulle au survol ou au focus clavier. Échap ferme l’aide. Les icônes décoratives ne sont pas annoncées une seconde fois.

Clavier sur la patinoire : flèches = 0,5 m; Maj + flèches = 2 m; `+`/`−` = zoom; `0` = cadrer; Échap = annuler un glisser. Hors champs de saisie : Ctrl/Cmd+Z et Ctrl/Cmd+Maj+Z (ou Ctrl+Y) annulent/rétablissent; Ctrl/Cmd+S enregistre. Les boutons du roster et les champs de l’inspecteur offrent une alternative au glisser. Les coordonnées restent en mètres dans le repère initial même si la vue est inversée.

La simulation suit les cibles et vitesses configurées. Les flèches représentent les intentions choisies ou les vecteurs de vitesse sur deux secondes; les rôles restent attribués manuellement. Les dimensions par défaut sont 60,96 × 25,9 m; une réduction qui invaliderait les positions est refusée. Le brouillon reste local à l’origine du navigateur (un autre port est une autre origine).

Voir [ADR-006](docs/adr/006-local-editor.md) pour l’historique, le rendu, les conventions géométriques et les limites des imports.

## Accueil de l'Atelier

La page d'accueil de l'Atelier (racine `/`) présente trois actions principales :

1. **Créer une séquence** — Initialise une situation vierge avec dix patineurs et une rondelle, prête pour l'édition. Ouvre l'éditeur local.
2. **Charger une séquence** — (À venir au jalon M3) Ouvre un catalogue ou un navigateur de séquences enregistrées.
3. **Charger une tactique** — (À venir au jalon M3) Ouvre un catalogue de tactiques et de systèmes de jeu.

Depuis l'éditeur local, le bouton **← Atelier** dans la barre de navigation ramène à cette page d'accueil. Si des modifications ne sont pas enregistrées, un avertissement vous demande de confirmer avant de quitter.

## Monter une séquence d’étapes

Avant création, **Créer une séquence** apparaît à gauche au-dessus de la patinoire. Après création, ce bouton est remplacé par l’en-tête **Séquence pédagogique / Montage**, qui surplombe tout l’atelier, de la patinoire au panneau à onglets. La bande d’information au-dessus de la glace est retirée; sa hauteur revient au viewport (+28 px sur desktop/tablette, +27 px sur mobile). Les pistes de la timeline restent directement sous le viewport et de même largeur. Cliquer **Créer une séquence** : la page cadre l’en-tête **Montage** complet à 8 px du haut du viewport, avec « Séquence pédagogique » et les compteurs visibles, dans la limite de défilement disponible. Le titre reçoit le focus sans masquer le haut de la carte. Utiliser ensuite le bouton **+ — Insérer une étape** dans la rangée de navigation sous la patinoire, puis **Ajouter une étape après**; placer les dix joueurs et la rondelle, et cliquer le **point rouge — Enregistrer l’étape** dans cette même rangée. Les deux actions sont des icônes avec infobulles. La barre tient sur une ligne, avec le temps et la vitesse à droite. Sur une petite largeur, faire défiler les commandes à gauche pour toutes les atteindre. Le bouton d’insertion est une icône; le bouton **Zoom de la timeline** ouvre un curseur vertical, refermable avec Échap ou un clic extérieur. Le panneau de droite, élargi à 368 px (+15 %) sur desktop, propose quatre onglets : **Équipes** pour le roster auparavant à gauche (choix d’équipe, patineurs et rondelle), **Joueur** pour le patineur courant (ou la rondelle sélectionnée) **Étape** pour le nom, le temps, le type, les paramètres d’Observation et la suppression de l’étape sélectionnée, et **Patinoire** pour les dimensions et les trois options d’affichage. Choisir un patineur ou la rondelle dans Équipes ouvre Joueur; le choix d’équipe reste dans Équipes. Les positions modifiées sont conservées. La barre d’outils occupe une bande compacte à gauche du viewport; la patinoire et la timeline remplissent le reste de leur colonne; à 1 000 px et moins, le panneau à onglets passe sous la patinoire. Les clips sont sélectionnables et déplaçables dans le temps; le champ de temps de l’onglet Étape permet la même modification sans glisser. En aperçu/lecture, les propriétés de l’étape sélectionnée sont en lecture seule et identifiées comme telles. Le départ reste à zéro. La légende reste en bas du panneau; les commandes de vue sont dans la barre verticale à gauche.

Le menu **+** distingue **Insérer une étape**, qui capture la pose interpolée au curseur sans modifier les voisins, et **Ajouter une étape après**, qui copie la pose de l’étape sélectionnée deux secondes plus tard et décale toutes les étapes suivantes de deux secondes. Cette seconde action exige une étape enregistrée sélectionnée, hors aperçu. Les poses modifiées doivent être enregistrées avant de poursuivre. Les deux actions sont annulables.

**Revenir au début** arrête la lecture et sélectionne la première étape à 00:00.00, sans modifier le montage; enregistrer ou rétablir les positions modifiées avant de quitter une étape. Lecture/Pause, vitesse et zoom accompagnent le curseur. Entre deux poses, les joueurs rejoignent les positions enregistrées; les chevrons indiquent leur déplacement. Mettre en pause ou déplacer le curseur, puis **Insérer une étape ici** pour capturer la pose intermédiaire sans modifier les voisins. Le type **Observation** ajoute un joueur, une cible du regard et une consigne; la lecture s’y arrête automatiquement.

**Enregistrer**, **Exporter JSON** et **Importer** portent sur toute la séquence, y compris la pose courante. Les anciens scénarios restent compatibles. La timeline est locale, limitée à 120 étapes/cinq minutes; elle n’est pas encore reliée aux leçons partagées. Voir le [guide et bilan Timeline](docs/TIMELINE-REVIEW.md) et l’[ADR-009](docs/adr/009-authored-timeline.md). Le simulateur physique ci-dessous reste disponible avant création d’un montage.

## Simuler la situation

Exemple prêt à importer : [m2-scenario.json](docs/demo/m2-scenario.json).

1. Préparer un déplacement avec l’outil cible ou une vitesse initiale, puis cliquer **Démarrer la simulation**. Sans cible ni vitesse, les patineurs restent sur place.
2. Utiliser **Mettre en pause**, **Avancer d’un pas** (1/30 s) et **Réinitialiser la simulation**. Le temps affiché est simulé; la session s’arrête après cinq minutes et se met en pause si l’onglet est masqué.
3. Pour une passe, choisir un coéquipier du porteur dans **Destinataire de la passe**, puis **Préparer la passe**. Elle sera lancée au prochain pas, vers sa position au moment de la demande. La récupération suit un modèle simple de proximité/orientation/délai.
4. Ouvrir **Détails de simulation** pour la version, la graine, le hash complet et les derniers événements. Les 120 derniers ticks sont conservés pour vérification, sans créer d’enregistrement de leçon.
5. **Modifier la situation initiale** revient au scénario préparé. Le brouillon et l’historique M1 restent intacts pendant la simulation; édition et import/export sont disponibles dans ce mode de préparation.

Le Worker avance le moteur à pas fixe de 30 Hz; PixiJS interpole le rendu et respecte la préférence de réduction des animations. Les mêmes scénario, version et inputs aux mêmes ticks doivent produire les mêmes hashes. Voir [ADR-007](docs/adr/007-m2-simulation.md) et l’[API headless](packages/simulation-core/README.md).

## Services de développement

```sh
corepack pnpm services:up
corepack pnpm services:down
```

PostgreSQL : `127.0.0.1:5432`; MinIO S3 : `127.0.0.1:9000`; console : http://127.0.0.1:9001. Utiliser les identifiants générés dans `.env`. Les volumes survivent à `services:down`. La base et le stockage ne sont pas encore raccordés à l'API; migrations, buckets privés et accès signés appartiennent à M5. Le bucket `S3_BUCKET` n'est donc pas créé à M0. MinIO est compilé localement depuis le tag officiel `RELEASE.2025-10-15T17-29-55Z` avec SHA-256 de l’archive vérifié; le premier démarrage peut prendre plusieurs minutes. Voir [ADR-005](docs/adr/005-local-object-storage.md). Le tag PostgreSQL suit les correctifs de la branche 17; figer les digests avant un déploiement reproductible en production.

## Validation

```sh
corepack pnpm check
corepack pnpm exec playwright install chromium webkit
corepack pnpm test:e2e
```

`check` lance formatage (vérification), lint, typage strict, tests Vitest et builds de tous les packages/apps. `test:e2e` construit le web puis Playwright lance et arrête le preview du bundle et l’API sur 3100/5193, indépendamment des serveurs de développement. Si 5174 est occupé, lancer le web séparément avec `pnpm --filter @hockey-iq/web dev --port 5184` et l’API avec `pnpm --filter @hockey-iq/api dev`. Les tests couvrent Chromium desktop et mobile, ainsi que WebKit avec viewport iPhone. Cela ne remplace pas un test sur un appareil iOS réel. En Linux, utiliser `playwright install --with-deps chromium webkit`. CI exécute ces commandes ainsi qu'un démarrage des services Compose. Son résultat distant nécessite de publier le dépôt sur GitHub; il n'est pas déduit des tests locaux.

`pnpm format` applique Prettier; `pnpm test:watch` lance Vitest en continu. Pour vérifier les artefacts API : `pnpm build`, puis `pnpm --filter @hockey-iq/api start`. Pour le web de production, servir `apps/web/dist` derrière une origine avec proxy `/api` vers l'API; le proxy de `vite preview` est destiné à la validation locale et ne remplace pas cette configuration d’hébergement.

## Organisation

| Chemin                                    | Responsabilité actuelle                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/web`                                | Éditeur local, espace équipe, règles/zones/cibles, simulation Worker et lecteur joueur |
| `apps/api`                                | Fastify REST privé, OIDC/sessions, équipes/projets/versions, catalogue et affectations |
| `packages/contracts`                      | Schémas v1/v1.1 conservés et contrats v1.2 bornés                                      |
| `packages/simulation-core`                | Physique déterministe headless, RNG, géométrie, événements et hashes                   |
| `packages/tactical-engine`                | Rôles contextuels, phases, décisions, opposition et journal tactique                   |
| `packages/play-systems`                   | Modèles, interpréteurs JSON bornés et validation sémantique                            |
| `packages/scenario-schema`                | Scénarios des cinq modèles exécutables                                                 |
| `packages/replay`                         | Intégrité, lecture figée et seek interpolé sans réexécution tactique                   |
| `packages/authz`, `packages/entitlements` | Permissions par équipe et calcul des capacités Free/Pro                                |
| `packages/tactics`, `packages/coaching`   | Frontières et contrats hérités                                                         |
| `docs/adr`                                | Décisions, dont [v1.2](docs/adr/010-v12-platform.md)                                   |

L'éditeur local garde les agrégats v1 et son montage. L'espace équipe utilise les systèmes/scénarios/séquences v1.2 et leurs versions immuables; il ne convertit pas automatiquement les documents locaux en projets privés. Les coordonnées physiques restent en mètres, m/s, radians et ticks à 30 Hz. Les zones/cibles v1.2 suivent l'axe d'attaque de l'équipe; les configurations v1.1 importées conservent leur espace de coordonnées d'origine. Voir l'ADR v1.2 pour les limites et le versionnement.

## État et suite

Les jalons techniques v1.2 couvrent le modèle 2-1-2 et quatre sorties de zone, l'édition de règles typées, les tests déterministes, les comptes/équipes, les quotas atomiques, les publications figées et les leçons privées sur mobile. Le [guide v1.2](docs/V1.2-RUNBOOK.md) décrit la démonstration et les opérations. Le [bilan](docs/V1.2-STATUS.md) distingue les vérifications exécutées des validations externes restantes.

Le lancement avec des données réelles exige encore la configuration du fournisseur OIDC/hébergement/TLS/stockage, les essais sur appareils physiques, la revue des entraîneurs et l'approbation des procédures de protection des mineurs. Aucun paiement réel, partage public, export MP4, IA générative ou réseau social n'est ajouté. Les anciens bilans [M0](docs/M0-REVIEW.md), [M1](docs/M1-REVIEW.md), [M2](docs/M2-REVIEW.md) et [v1.1](docs/V1.1-M0-REVIEW.md) sont conservés comme historique.
