# ADR-005 — MinIO local compilé depuis les sources

Statut : accepté pour le développement M0; build Docker non exécuté sur la machine initiale. Date : 2026-11-20.

La spécification demande MinIO comme stockage S3 local. La vérification du manifeste `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` a reçu HTTP 401 même après acquisition d'un jeton anonyme. Le [README officiel](https://github.com/minio/minio#source-only-distribution) indique que Community Edition est distribuée uniquement en sources et que le dépôt n'est plus maintenu.

Composer le service avec notre Dockerfile multi-stage, plutôt qu'un miroir binaire tiers. Le code provient du tag officiel `RELEASE.2025-10-15T17-29-55Z`; son archive a été téléchargée et son SHA-256 calculé : `be6d0bd3696c3a13a35f02d3a0280b64319c67918b4501c5c3d87f96d000085c`. Docker vérifie cette empreinte avant compilation. Go 1.25 satisfait le minimum Go 1.24.8 du tag. Le runtime embarque la licence AGPL et un label vers les sources exactes.

Conséquences : premier démarrage plus lent, dépendance à GitHub, au proxy Go et aux images de base. Le tag source est figé mais les images de base suivent leurs correctifs; figer les digests et revoir le fournisseur S3 avant déploiement. La CI inclut construction et healthcheck; Docker absent en local, aucune réussite de build ou de démarrage du service n'est revendiquée dans le bilan M0.
