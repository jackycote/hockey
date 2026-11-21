# ADR-009 — Montage de poses enregistrées

Date : 2026-11-20. Statut : implémenté pour l’éditeur local de séquences; validation consignée dans le bilan Timeline.

## Modèle et frontières

La demande utilisateur d’un montage semblable à un éditeur de film concrétise le parcours d’étapes proposé précédemment. Une séquence pédagogique est un nouvel agrégat `kind: coaching_sequence`, `schemaVersion: 1`, avec le contexte Scenario v1 et jusqu’à 120 poses complètes des dix joueurs et de la rondelle. Les IDs, équipes, positions nominales et dimensions restent constants. Les étapes ont un ID stable, un nom, un type Jeu/Observation et un instant entier en millisecondes. La première pose reste à zéro; deux poses sont espacées d’au moins 100 ms; durée maximale : cinq minutes.

Ces étapes ne sont pas des ticks du moteur physique. La fonction pure de lecture interpole linéairement les positions par ID et l’orientation par l’arc le plus court; le déplacement et la direction du regard sont indépendants. Les chevrons indiquent le déplacement vers la pose suivante (ou l’arrivée pour la dernière pose en édition), même en patinage arrière. Les objectifs et vitesses du simulateur M2 ne pilotent pas cette interpolation; les outils de cible et les vitesses initiales sont masqués en montage. La lecture ne calcule ni contacts ni tactique. Le moteur M2, ses hashes, snapshots et contrôles restent disponibles avant création d’une séquence.

La rondelle suit une interpolation entre ses positions enregistrées. Si le porteur est identique aux deux poses, elle suit ce joueur; si le porteur change, elle voyage libre entre les poses et la possession est attribuée à destination. Une étape insérée en cours de transfert conserve donc une rondelle libre. Le mouvement dessiné n’est pas soumis à une simulation de passe ou de récupération.

## Édition, capture et historique

Le scénario courant sert de pose de travail. Modifier un joueur ou la rondelle ne réécrit pas une pose enregistrée avant **Enregistrer l’étape**. Une indication de positions modifiées bloque sélection, lecture, insertion, retiming et suppression jusqu’à enregistrement ou rétablissement. Le menu **Insérer une étape** propose l’insertion au curseur et **Ajouter une étape après**. Cette seconde action copie la pose sélectionnée à +2 secondes, décale les étapes suivantes de deux secondes et sélectionne la nouvelle pose Jeu sans consigne Observation; le changement constitue une seule transaction réversible. Elle exige une étape enregistrée sélectionnée, hors aperçu, et respecte les limites du document.

Le curseur permet un aperçu en lecture seule. **Insérer une étape ici** copie sa pose interpolée et son instant, sans déplacer les étapes voisines ni prolonger la séquence. L’insertion à une borne ou à moins de 100 ms d’une pose est refusée. La capture peut ensuite être éditée normalement.

Un glisser de clip change son instant, avec aimantation à 100 ms et bornes entre les voisins; un champ numérique offre la même opération au clavier. Il ne réordonne pas les poses et ne produit aucun chevauchement. Supprimer conserve les instants des autres étapes; supprimer la dernière raccourcit naturellement la durée. Le départ ne peut pas être supprimé ni retimé.

L’historique unique de l’éditeur capture pose de travail, séquence et étape sélectionnée : déplacements, captures, insertions, temps, métadonnées, suppression, import et réinitialisation sont annulables/rétablissables. Un glisser du rink ou du clip produit une seule transaction. Le contexte de patinoire/équipes est verrouillé pendant le montage pour empêcher une incompatibilité entre poses; le titre reste éditable.

## Position du montage et retour au début (BKL-001/BKL-002)

Les deux propositions ont été approuvées le 2026-11-20. Montage devient le frère immédiatement suivant de RinkBoard à l’intérieur de `rink-surface`, avant les contrôles secondaires. Les deux utilisent la même boîte de contenu; le panneau ne prend plus la largeur du roster ou de l’inspecteur. Ses contrôles se replient et ses pistes restent dans leur propre défilement horizontal.

La commande **Revenir au début** réutilise la sélection de la première étape : garde des positions non enregistrées, pause du cadenceur, sélection de la pose initiale et sortie de l’aperçu en lecture seule. Elle remet le scroll des pistes à zéro seulement si la garde réussit. Aucun snapshot du document n’est modifié et aucune entrée d’historique n’est ajoutée. Le bouton reste actif pendant la lecture; Entrée/Espace suivent l’activation native du bouton plutôt que le raccourci de lecture du conteneur.

## En-tête de l’atelier et rangée de commandes (BKL-004)

Approuvé le 2026-11-20 par « approve 004 ». `TimelineHeader` est rendu juste avant la grille roster/patinoire/inspecteur et utilise la largeur de cette grille. Il lit le même store que le montage pour son compteur et sa durée; **Créer une séquence** émet une action vers l’éditeur avec sa gestion d’erreur existante. Le panneau des pistes apparaît sous le viewport après création d’une séquence; il ne duplique plus l’en-tête.

La rangée de commandes conserve les quatre boutons de transport et les deux actions ajouter/capturer, avec leurs actions, noms accessibles et gardes existants. Son conteneur défile horizontalement et reçoit le focus clavier; les boutons ne se replient pas sur une autre ligne. L’ordre Tab des six boutons est explicite; un gestionnaire de focus révèle le bouton ciblé en modifiant uniquement le défilement horizontal de son conteneur. L’horloge, la vitesse et les outils secondaires restent dans la barre et peuvent occuper une autre rangée. Aucune modification du store, du cadenceur ou du format persistant n’est nécessaire.

## État de création et état Montage (BKL-005)

Approuvé le 2026-11-20 par « approve 005 ». `TimelineHeader` conserve son emplacement avant la grille et distingue ses deux affichages à partir de `store.sequence`. Sans séquence, une rangée compacte sans carte affiche seulement **Créer une séquence**, aligné sur le bord gauche des patineurs. Avec une séquence, cette rangée est remplacée par l’en-tête complet et ses compteurs; ni le bouton ni le texte d’introduction initial ne sont dupliqués. Le rechargement, l’import, la réinitialisation et l’historique utilisent directement l’état existant du store, sans nouveau drapeau persistant.

La commande de création, sa garde pendant une simulation physique, la capture de la pose courante et les contrôles de montage ne changent pas.

## Barre compacte et zoom dépliant (BKL-007)

Approuvé le 2026-11-20 par « yes », en réponse à la proposition 007. La barre utilise une ligne flex sans repli : commandes défilantes à gauche, temps courant/total et vitesse fixes à droite. Les boutons conservent leurs gardes et leurs noms accessibles; l’insertion utilise désormais une icône. Sur les petites largeurs, les libellés de capture peuvent être tronqués visuellement sans changer leur texte accessible; le focus révèle le bouton entier dans le défilement borné.

`TimelineZoom` conserve la valeur locale existante (30–200, pas de 10) via v-model. Le bouton ouvre un panneau non modal contenant un input range vertical. Haut/Droite augmentent, Bas/Gauche réduisent et Début/Fin atteignent les bornes de façon cohérente entre les navigateurs. Échap/Tab ferment avec retour du focus au déclencheur; un clic extérieur ferme sans voler le focus à la nouvelle cible.

Le panneau est téléporté sous body et positionné en fixed pour échapper aux overflow de la timeline. Il suit le déclencheur après défilement/redimensionnement, se place au-dessus si nécessaire et reste dans le viewport visuel. Il se ferme si son ancre n’est plus visible. Les écouteurs sont retirés au démontage. Aucun zoom n’est persisté ni réinjecté dans les poses; l’avancement et la correction proposée BKL-006 restent hors de ce périmètre.

## Inspecteur à onglets et actions par icônes (BKL-008/BKL-009)

Approuvés le 2026-11-20 par « approve 008 and 009 ». Le panneau de droite conserve son titre et affiche deux onglets **Joueur** et **Étape**. `EditorView` conserve localement le choix d’onglet, initialisé à Joueur. Les deux panneaux sont montés avec `v-show` pour garder les contrôles et leur état local; un seul est visible et présent dans l’arbre d’accessibilité. Les relations tablist/tab/tabpanel, le seul onglet actif dans l’ordre Tab et les touches Gauche/Droite/Début/Fin assurent l’accès au clavier. Le choix d’onglet ne déclenche aucune action du store ni de transport et n’est pas persisté.

`StepInspector` reprend le formulaire auparavant sous les pistes, avec les mêmes actions du store, gestion d’erreur et gardes. Il reçoit la session `useTimeline` de l’éditeur : aucun second cadenceur ni nouvelle sélection. Les propriétés concernent toujours `store.currentStep`; pendant l’aperçu/lecture, une indication distingue son instant enregistré du temps de lecture et le fieldset est désactivé. Sans séquence, un message remplace le formulaire. Les coordonnées et la possession du joueur/de la rondelle restent dans Joueur et leurs gardes existantes sont conservées. Les grilles responsives des formulaires s’appliquent désormais au contenu de l’onglet.

Les boutons d’ajout et de capture de la timeline utilisent le même format d’icône compact que le transport : plus pour ajouter, point rouge pour capturer. Les libellés français restent dans `aria-label` et `title`, et toutes les conditions d’activation restent inchangées. Les pistes et les contrôles conservent leur position sous la patinoire. Aucun changement au store, aux contrats, à l’interpolation ou à BKL-006 n’est nécessaire.

## Roster à droite et largeur de l’atelier (BKL-010)

Approuvé le 2026-11-20 par « approce 010 », y compris la précision de largeur. L’atelier utilise deux colonnes au-delà de 1 000 px : `minmax(0, 1fr) 320px`. L’ancienne colonne du roster disparaît; le viewport et la timeline occupent la largeur de gauche. Les proportions et le calcul de coordonnées de RinkBoard restent inchangés; son ResizeObserver prend en compte la nouvelle taille. En dessous de ce seuil, le panneau à onglets occupe une rangée complète après la patinoire, avec les grilles de champs adaptées aux tablettes puis aux mobiles. Le bouton de création s’aligne désormais sur la patinoire et l’en-tête Montage reste à la largeur de l’atelier.

Le contenu existant du roster est déplacé, sans copie, dans le panneau **Équipes**. Il lit la même vue de l’éditeur (pose, interpolation ou simulation), les mêmes équipes et la même sélection. Les trois onglets **Équipes / Joueur / Étape** partagent la navigation clavier cyclique et un seul onglet dans l’ordre Tab. Joueur reste actif au chargement. Le choix d’équipe conserve le comportement de sélection existant et laisse Équipes visible. Sélectionner un patineur ou la rondelle depuis cette liste ouvre Joueur avec focus sur son onglet, sans défilement forcé. La sélection sur la glace n’impose aucun changement d’onglet.

Le déplacement de la liste et le changement d’onglet ne capturent pas de pose, ne naviguent pas dans les étapes et n’ajoutent pas d’entrée d’historique. Les modifications en attente, gardes d’enregistrement et champs en lecture seule restent ceux du store et de la session existants. Aucun contrat, format de sauvegarde, calcul de lecture ou correctif BKL-006 n’est ajouté.

## Barre verticale, options Patinoire et création cadrée (BKL-011/BKL-012/BKL-013)

Approuvés le 2026-11-20 par « I approve 11,12 and 13 ». `rink-workspace` est une grille à deux colonnes : bande d’outils de 52 px, puis `rink-surface` en `minmax(0, 1fr)`. Les boutons de 40 px sont empilés, avec séparateur horizontal avant Annuler/Rétablir. Le viewport et la timeline restent frères dans rink-surface, avec les mêmes bords; aucune commande ne recouvre la glace. Réinitialiser reste séparé en haut à droite. Le padding horizontal de la barre de transport mobile est réduit de 8 à 6 px pour que les icônes de 30 px restent entièrement révélables au focus à 320 px, après ajout de la bande de 52 px; les temps et la vitesse restent visibles à droite. Les touches Haut/Bas/Début/Fin ciblent uniquement les boutons disponibles. Après une action d’historique qui désactive son bouton focalisé, le focus rejoint une commande disponible de la barre, sans modifier les transactions du store.

L’inspecteur ajoute **Patinoire** après Équipes/Joueur/Étape. Les trois cases Rôles, Trajectoires et Grille y sont déplacées avec leurs v-model existants; il n’existe plus de rangée d’options sous le rink. Ces états restent locaux à `EditorView`, conservés pendant la navigation et remis à leurs valeurs initiales au rechargement. Les réglages ne sont pas inclus dans l’historique ou l’export. Les comportements du renderer, des trajectoires du simulateur et des mouvements du montage restent inchangés. Les marges des onglets sont réduites pour garder quatre libellés accessibles dans le panneau desktop de 320 px et sur mobile.

La création explicite utilise une action dédiée de l’éditeur : garde pendant une simulation et en présence d’une séquence, création via le store existant, puis `nextTick`. `TimelineHeader` expose une méthode qui donne le focus au h2 Montage avec `preventScroll`, puis aligne ce titre par `scrollIntoView` instantané. Le titre possède tabindex −1 pour permettre ce focus sans ajouter d’arrêt Tab permanent. Le défilement reste naturellement borné par la hauteur du document. Il n’est pas déclenché par un watcher de séquence : rechargement, import et annuler/rétablir conservent leur défilement habituel.

Ces changements ne modifient ni les contrats ni le store, les poses, le cadenceur ou les coordonnées. BKL-006 demeure une proposition séparée non approuvée.

## Espace de glace, commandes en bas et en-tête complet (BKL-014/BKL-015/BKL-016)

Approuvés le 2026-11-20 par « approve 014, 015, 016 ». La bande `rink-topline` et le padding supérieur de la surface sont retirés. Les mesures du bundle précédent donnent une hauteur de ligne de 11 px sur desktop/tablette, 10 px à 760 px et moins, plus 17 px de padding. Le viewport ajoute respectivement 28/27 px à sa hauteur précédente via deux propriétés CSS. La timeline reste au contact du viewport; le calcul de cadrage et le repère en mètres sont ceux de RinkBoard. Les dimensions courantes sont rendues dans Patinoire et suivent le modèle existant, sans nouveau champ ni changement de valeur par défaut.

La rangée de légende/zoom/cadrage/inversion quitte rink-surface et devient un enfant du panneau, après rink-workspace, à la place de tool-hint. Le calcul et les styles de cette consigne sont retirés; `rink-help` reste lié au viewport pour l’accessibilité. Les statuts de timeline et les indications des contrôles de simulation restent disponibles. La rangée utilise flex avec repli; la marge automatique des commandes les garde à droite, y compris lorsqu’elles occupent une seconde ligne. Les handlers de caméra et les options de vue restent identiques.

Le titre Montage garde son focus programmatique avec preventScroll. Le scroll cible désormais le conteneur de l’en-tête complet, doté de scroll-margin-top de 8 px. Il reste instantané, après la création explicite et le rendu; les limites de hauteur du document sont appliquées par le navigateur. Les vérifications de BKL-013 sont ajustées pour cadrer toute la carte et garder son libellé supérieur et ses compteurs visibles.

Un diagnostic pendant BKL-015 confirme un défaut existant de caméra pendant l’animation : le watcher de dimensions renvoie un nouveau tableau à chaque remplacement du scénario et peut appeler fit malgré des valeurs identiques. La correction est proposée en BKL-017, séparée et non approuvée. Le watcher, le renderer, le store et le calcul de lecture ne sont pas modifiés dans cette livraison; les effets des commandes de vue sont vérifiés en édition et en aperçu en pause, avec disponibilité pendant la lecture.

## Observation et lecture

Une étape Observation définit le joueur qui observe, une cible (rondelle, autre joueur ou point dans la patinoire), et une question/consigne. Un rayon pointillé et des cercles dorés indiquent le regard sans modifier l’orientation du patineur. La lecture s’arrête au premier marqueur Observation franchi et reprend au-delà de celui-ci sur une nouvelle commande Lecture. Une Observation au départ est déjà présentée avant de lancer la lecture. Le mode joueur avec indices masqués et réponses reste à réaliser avec les leçons privées.

Le cadenceur de rendu utilise requestAnimationFrame, des vitesses 0,25×/0,5×/1×/2× et une pause explicite lorsque le document est masqué. Un blocage de rendu ne saute pas les marqueurs; la progression de chaque rendu est plafonnée à 100 ms avant application de la vitesse. Les fonctions d’interpolation et d’avancement sont pures; la lecture ne modifie aucune pose enregistrée. La timeline possède son propre défilement horizontal et suit le curseur pendant la lecture; le zoom ne modifie pas le document.

## Persistance et compatibilité

Enregistrer/Exporter JSON inclut la pose de travail courante dans sa capture avant de sérialiser toute la séquence. Le fichier est `hockey-iq-sequence.json`. Le brouillon local conserve la même clé de stockage pour restaurer le document le plus récent, qu’il soit Scenario v1 ou CoachingSequence v1. La sélection restaurée commence au départ; le playhead, le zoom, la caméra et la lecture ne sont pas persistés.

L’import accepte toujours les anciens scénarios v1 (256 Kio maximum). Une séquence utilise un plafond de 4 Mio avant parsing, puis validation stricte et bornée du document et de toutes ses poses. Un import invalide préserve le document et l’historique. Les publications PlaySystemVersion, Recording v2, Lesson et Assignment du plan v1.1 ne sont pas remplacées par ce format; leur connexion, l’authentification et le stockage serveur restent aux jalons prévus. Aucun stockage distant ou partage public n’est ajouté.

## Caméra, insertion et identité HockeyDoo (BKL-017 à BKL-022)

Approuvés par « approve 017 to 022 » le 2026-11-20. Le watcher observe séparément les valeurs primitives de longueur/largeur : une nouvelle pose de lecture ou de simulation ne déclenche plus `fit`. Les commandes explicites et les changements réels de dimensions gardent leur recadrage.

Le menu d’insertion est téléporté dans le body, positionné dans le viewport et fermé au clavier/clic extérieur; les actions reprennent l’insertion interpolée ou une transaction dédiée d’ajout après sélection. Le format de document ne change pas. L’ancienne méthode d’ajout en fin reste compatible pour les appels internes; le menu utilise la nouvelle méthode.

La toolbar gauche commence par Réinitialiser, puis manipulation, historique et commandes de vue. Elle défile dans une hauteur maximale égale au viewport de glace : ses boutons supplémentaires ne créent pas d’espace sous la glace. L’ancienne rangée supérieure disparaît et seule la légende reste en bas. La grille desktop réserve maintenant **368 px** au panneau droit (+15 %); le seuil d’empilement reste 1 000 px. Les sections précédentes décrivent les décisions historiques remplacées par cette livraison.

Le composant partagé Brand affiche le PNG HockeyDoo fourni, copié à l’identique dans `public/assets`, avec ratio conservé et lien d’accueil. Des tokens CSS communs définissent marine, bleu, blanc/glace et rouge; les couleurs des équipes concordent entre renderer et interface. Le thème et la caméra restent des états de présentation, sans changement du moteur ni des données sauvegardées. BKL-006 reste distinct et attend son approbation.

## Pause exacte, aides et zoom compact (BKL-006/BKL-023/BKL-024)

Approuvés le 2026-11-20 par « approve 006, 023 and 024 ». `advanceSequence` prend le premier marqueur Observation tel que `current < marker <= next`, sans tolérance positive. Cela respecte les instants très proches du marqueur tout en permettant de reprendre depuis son instant exact. Des tests numériques aux bornes et à plusieurs marqueurs vérifient le défaut reproduit; le format et le moteur physique ne changent pas.

`IconHelp` affiche une aide commune hors des conteneurs défilants, au survol/focus des commandes à icônes. Le libellé vient de l’aide explicite, du nom accessible ou du texte de la commande sans les éléments décoratifs. Les boutons gardent leurs noms accessibles; les SVG décoratifs restent masqués. L’aide ajoute son ID à `aria-describedby` sans effacer les descriptions existantes et le retire à la fermeture. Elle suit l’ancre, les changements de libellé et les redimensionnements, accepte le survol de son propre texte, et se ferme avec Échap ou lors de l’activation sans bloquer l’action. Les aides auparavant natives des commandes concernées deviennent des aides partagées visibles au clavier, sans double infobulle.

`RinkZoom` remplace le groupe −/pourcentage/+ permanent par un bouton ouvrant à droite un panneau horizontal, téléporté hors de la barre. Les incréments existants utilisent `zoom`; le slider utilise un réglage direct en pourcentage pour éviter une division par une valeur d’affichage arrondie. Les limites de caméra 100–300 % et le point d’ancrage central restent ceux de la géométrie existante. Le panneau reflète la caméra sans document/historique supplémentaire. Il reste utilisable en lecture/simulation, suit le viewport et ferme lorsque l’ancre est masquée. Échap rend le focus au bouton; clic/focus extérieur ferme sans détourner la cible. Cadrer/Inverser restent distincts et le zoom de timeline ne change pas.

## Densité verticale de la toolbar (BKL-025)

Approuvé le 2026-11-20 par « approve 025 ». Les styles de la barre gauche utilisent des boutons de 34 px de haut sur souris (centres à 36 px), un gap de 2 px, un padding vertical de 4 px et des séparateurs avec marges de 3 px. La media query `pointer: coarse` conserve des cibles de 40 px de haut sur tactile, indépendamment de la largeur du viewport. Les icônes de 18 px, la largeur des boutons/barre, l’ordre et les actions restent identiques. La hauteur maximale et la révélation au focus restent celles du viewport; si la barre tient sans défiler, aucun défilement n’est imposé.

## Remise à 100 % dans le panneau de zoom (BKL-026)

Le message utilisateur « approve 025 and 206 » du 2026-11-20 est interprété comme approbation de BKL-026 dans le contexte de la proposition immédiatement précédente, sans proposition 206 existante. L’interprétation est annoncée et enregistrée avant modification.

`RinkZoom` émet `reset`, raccordé à `RinkBoard.fit` dans EditorView. Cette action existante revient à 100 %, recentre et conserve `camera.flipped`. Le nouveau bouton reste toujours disponible et le panneau ouvert; l’activation restitue explicitement le focus au bouton, y compris sur WebKit qui ne focalise pas systématiquement les boutons au toucher. La largeur maximale du panneau passe de 260 à 300 px, avec la même adaptation au viewport. Aucune mutation du document, d’historique ou de moteur. Les anciennes décisions décrivent les états historiques précédents.
