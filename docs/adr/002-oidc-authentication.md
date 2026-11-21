# ADR-002 — OIDC et sessions côté serveur

Statut : architecture acceptée; fournisseur et implémentation différés à M5. Date : 2026-11-20.

Utiliser un fournisseur OIDC configurable et Authorization Code avec PKCE. Le backend vérifiera issuer, audience, signature, expiration, state et nonce avec une bibliothèque maintenue. L'identité interne sera liée au couple `(issuer, subject)`, jamais à un nom affiché. Le fournisseur concret, la rotation des clés et les durées de session seront décidés en M5.

Le navigateur utilisera une session opaque dans un cookie HttpOnly, Secure en production, SameSite et à portée minimale. Les jetons OIDC restent côté serveur. Servir web et API sous la même origine simplifie les cookies; le proxy Vite est la variante locale. Les mutations nécessiteront une protection CSRF et une validation d'origine appropriées. Aucun jeton en localStorage.

Chaque opération privée vérifiera côté API la session, l'adhésion active, le rôle, l'équipe réelle de l'objet et l'appartenance du groupe ciblé. Les teamId des payloads ne sont jamais une autorisation. Les téléchargements S3 nécessiteront un contrôle serveur avant émission d'une URL signée courte. Les tests IDOR coach/joueur entre équipes sont obligatoires à M5.

M0 expose seulement health et le schéma OpenAPI; aucun compte, endpoint d'équipe, session fictive ou bypass d'authentification n'existe. PostgreSQL et MinIO sont des services de développement provisionnés, pas encore utilisés par l'API. Le health est une sonde de disponibilité du processus, pas une sonde de readiness de ces services.
