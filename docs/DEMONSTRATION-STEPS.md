# BKL-037 — étapes des démonstrations

Disponible dans **Catalogue → Essayer le modèle** et dans les démonstrations des leçons publiées. Le montage local de poses reste un parcours distinct.

Les cartes du catalogue et les lecteurs affichent aussi le nom anglais d’origine sous le titre français : **Boards Breakout**, **D-to-D Reverse**, **Low Center Support** ou **Under Pressure Breakout** (BKL-038). Une séquence d’échec avant affiche **Forecheck 2-1-2**. Dans une leçon à plusieurs séquences, ce nom suit le modèle de la séquence sélectionnée; les titres personnalisés restent conservés. Il s’agit d’un libellé de présentation, sans modification des publications enregistrées.

- **Tout lire** (triangle simple) lance la lecture continue. Les repères d'étape sont franchis sans arrêt; les pauses pédagogiques explicitement enregistrées dans une leçon restent respectées.
- **Lire jusqu’à l’étape suivante** (triangle avec barre à droite) anime depuis la position courante jusqu'au prochain repère, puis s'arrête exactement. Réactiver la commande lance le segment suivant. Pendant la lecture, la même commande devient Pause; passer à l'autre mode conserve la position.
- Les cartes numérotées sous la patinoire affichent le titre et le temps de chaque étape. Cliquer une carte, ou l'activer avec Entrée/Espace, place la démonstration à cet instant en pause. La tête de lecture rouge suit la progression. La timeline défile horizontalement dans son panneau sur petit écran.
- Le curseur temporel permet aussi de choisir une position entre deux étapes. La vitesse s'applique aux deux modes. Le retour au début remet la démonstration en pause; à la dernière étape, la commande pas à pas est désactivée et Tout lire peut recommencer.
- La bulle à gauche décrit l'étape courante et les informations à observer. Elle passe au-dessus de la glace sur petit écran pour conserver la visibilité des joueurs. Les longues descriptions défilent dans leur propre zone accessible au clavier.

Les étapes proviennent des annotations horodatées et des faits présents dans la piste : rondelle libérée, passe, réception/récupération, interception, changement de possession et transition. Les événements simultanés sont regroupés, les étapes proches restent distinctes, et une séquence sans annotation possède au moins sa situation initiale et sa fin. Une intention tactique seule n'est pas présentée comme une passe réalisée. Les pauses explicites sont triées pour toujours s'arrêter à la première, y compris lors d'un grand incrément de lecture.

**Essayer le modèle** prépare une piste de 12 secondes dans un Worker, sans créer de projet. La préparation cède régulièrement la main et est annulée si l'essai est remplacé ou fermé; la borne du protocole est de 900 ticks. Une fois prête, la piste sert aux deux modes et à la navigation directe. Le lecteur d'une leçon utilise ses snapshots publiés, sa durée et ses annotations d'origine. Les nouveaux repères sont des données de présentation calculées; aucun snapshot, hash, événement ou document publié n'est réécrit.

Validation : tests de calcul des repères et limites temporelles dans `apps/web/test/demonstration.test.ts`; parcours catalogue/lecteur, contrôles de position, vitesse, clavier, disposition et axe dans `e2e/demonstration-steps.spec.ts`; parité de la préparation Worker/Node dans `e2e/tactical-worker.spec.ts`. Résultats et captures de livraison consignés dans le backlog après vérification.

Aperçus contrôlés : [desktop](demo/demonstration-steps-desktop.png) · [mobile WebKit](demo/demonstration-steps-mobile.png).
