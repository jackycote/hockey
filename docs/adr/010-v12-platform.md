# ADR 010 — v1.2 private team platform and executable tactics

Accepted for the user-authorized v1.2 implementation. The original package is preserved under `docs/source/v1.2`; its v1.2 addendum takes precedence. Existing v1.1/v1.0 editor data is retained.

## Boundaries

The team is the tenant, authorization and entitlement boundary. An optional organization groups teams without inheriting private access. Membership is checked on the server for every team-scoped operation. Platform administration grants catalogue publication only. Coaches can belong to several teams; players see their authorized assignments and their own progress. No guardian capability is exposed.

Fastify REST remains the API framework. `contracts` defines bounded Zod inputs; `authz` and `entitlements` are independent pure policies. Relational data uses PostgreSQL (`pg` in production). Local/test execution uses PGlite, the embedded PostgreSQL engine, so a demo does not depend on Docker. Both the embedded adapter and a separately initialized network PostgreSQL 16 instance were tested; the configured Docker PostgreSQL 17/MinIO combination still requires its service smoke check. PostgreSQL tenant foreign keys and indexes supplement API authorization. RLS remains recommended defense in depth before broader production use; it is not configured in this MVP.

All project-creation and activation checks lock the team row inside the transaction. DRAFT and ACTIVE consume the same quota; ARCHIVED is read only. Project scope is explicitly `breakout` or `forecheck`, and every dependency must belong to that project and team. This verifiable policy prevents unrelated tactical families being mixed to bypass quota. Pro expiry falls back to Free and blocks writes to multiple nonarchived projects until a coach selects the retained project. Demo plan changes cannot run in production. The proposed seasonal price is configuration only.

## Tactics and coordinates

The old physical engine and its reference fixtures remain unchanged. `tactical-engine` supplies contextual roles, objectives, opposition and pass decisions above the fixed 30 Hz physical step. Breakout roles are independent of nominal positions and forecheck F1/F2/F3/D1/D2. Roles have a hold interval; tie breaking uses stable IDs. Opposition and puck reception use actual bounded motion and swept physical pickup, including interceptions.

Physical coordinates are metres. v1.2 zones/targets are normalized to the controlled team's attack: x=0 defensive end, x=1 attacking end; y stays rink-relative. Drawing, condition checks and objective conversion mirror x consistently. Camera reversal affects only the view. Imported v1.1 `legacy` configurations retain their original absolute `rink-normalized` coordinate contract and execute only with the compatible forecheck-212 base. Both interpreters use typed JSON, explicit depth/node/rule limits, deterministic priorities and a safe template fallback; no coach-supplied code or expression evaluation.

A paused reposition or instruction change becomes a tick-indexed input. The complete input journal, initial system/scenario, engine/ruleset versions, per-frame physical hash and tactical hash are recorded. Reexecuting the journal is tested against every frame. All browser simulation runs in a Worker, using the same module tested in Node.

## Versions and playback

Every system/scenario/sequence save creates a new immutable resource version. Lessons assemble frozen copies of sequences when published; later edits do not affect existing assignments. PostgreSQL triggers reject UPDATE/DELETE of published version and catalogue content. Catalogue editions have a stable series and increasing version; assignment pins the selected edition. Catalogue reading, simulation and assignment never create private resources. An editable template copy creates a normal quota-counted project atomically.

The reader seeks/interpolates the frozen state track instead of rerunning tactical policy. Full snapshots simplify verification and engine-independent playback at the cost of larger files. Recordings are limited to five minutes, with gzip content-addressed immutable objects and a 64 MiB request/decompression bound. This is an MVP storage tradeoff; long recordings should eventually use chunked binary tracks without changing published content semantics.

## Authentication and operations

OIDC authorization-code flow uses server-held PKCE verifier, state, nonce, strict issuer/audience/expiry checks and ID-token signature verification through `openid-client`. Sessions are opaque random tokens stored hashed, expire after eight hours and require CSRF for mutations; production cookies use Secure, HttpOnly and SameSite=Lax. Synthetic login is an explicit development-only flag and is refused in production. Provider contract tests inject a signed provider response without disabling HTTPS or validation. A real vendor configuration still requires deployment verification.

Production refuses missing PostgreSQL/OIDC/HTTPS/S3 settings. Local disk and S3-compatible stores share content-addressed integrity checks. Encrypted AES-256-GCM backups cover all domain rows, rebuild content-addressed objects on restore and exclude sessions/OIDC states. Restore requires an empty database, revokes pending invitations, and rolls SQL back if object restoration fails. Backup key storage, disaster-recovery drills and retention remain operator responsibilities.

References: [PGlite](https://pglite.dev/docs/), [node-postgres transactions](https://node-postgres.com/features/transactions), [openid-client](https://github.com/panva/openid-client/blob/main/docs/README.md), [AWS SDK S3 examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html).
