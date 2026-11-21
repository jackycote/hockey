# ADR-004 — Vie privée par défaut

Statut : principes acceptés; procédures opérationnelles à définir avant pilote M7. Date : 2026-11-20.

L'application vise des équipes privées de hockey mineur. Collecter uniquement identifiant interne, pseudonyme/prénom choisi, appartenance et progression minimale. Aucune date de naissance complète, photo, adresse, profil public, messagerie ou classement n'est nécessaire au MVP. Les labels dans un scénario peuvent être des numéros; les fixtures de tests sont fictives.

Pas de collecte analytique ni traceur à M0. Ne pas journaliser cookies, jetons, codes d'invitation ou payloads de leçons. Les ressources stockées restent privées. Les invitations seront aléatoires, hachées, expirables et révocables. Les journaux d'audit futurs se limiteront aux opérations nécessaires, avec accès contrôlé.

Avant usage avec de vrais mineurs : faire valider les exigences applicables de consentement et d'autorisation; fixer par politique les durées de rétention, suppression, export, sauvegardes et réponse aux incidents. Ces points restent ouverts; M0 ne prétend pas fournir une conformité juridique ou un système prêt au déploiement. Le fournisseur OIDC et l'hébergement restent à choisir.

Les services Compose écoutent uniquement sur loopback, avec volumes persistants et identifiants locaux générés hors du dépôt. Ne pas utiliser cette configuration de développement pour héberger des données réelles. Les futures règles d'accès et d'isolation devront être vérifiées par des tests négatifs serveur, au-delà des contrôles visuels.
