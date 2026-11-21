# Codex implementation prompt — Hockey Doo MVP v1.2

You are the lead engineer implementing Hockey Doo, a youth hockey tactical simulation and private team learning platform. Read `README_V1.2.md`, `ADDENDUM_ARCHITECTURE_FREEMIUM_SORTIES_ZONE_v1.2.md`, `PLAN_DEVELOPPEMENT_v1.2.md`, then the retained v1.1/v1.0 documents. Resolve conflicts using v1.2 > v1.1 > v1.0. The product was formerly called Hockey IQ Simulator.

Mandatory product decisions:
1. Hybrid 2D simulation with deterministic replay, contextual tactical roles and coach interventions.
2. First-class defensive-zone breakouts: boards, D-to-D reverse, low center, under pressure. Do not misuse forecheck F1/F2/F3 roles in breakout contexts.
3. Team is the tenancy, permission and subscription boundary. Users can belong to multiple teams; optional organization groups teams.
4. FREE allows exactly one active/draft tactical project per team, containing multiple coherent systems, scenarios, recordings and lessons. Global templates are unlimited and never consume quota. TEAM_PRO permits unlimited projects. Quotas must be enforced atomically server-side, with concurrency tests.
5. All private lessons require team-scoped authorization. Immutable published versions and safe downgrade/archival are required.
6. No real billing integration yet; 49 CAD per season is only a configurable proposed price.
7. Treat privacy and security for minors as core requirements, not optional polish.

First action: inspect repository state, identify reusable work, and produce a concise gap analysis against v1.2. If the repo is empty, scaffold M0. Propose a milestone-by-milestone execution plan and implement M0 only unless explicitly instructed otherwise. Use TypeScript, Vue 3/Pinia/PixiJS, Node API, PostgreSQL and Zod, with packages for simulation, tactics, replay, entitlements and authz. Make architecture decisions explicit where specifications leave options open.

Every milestone must include: implementation, migrations/seeds where relevant, unit and integration tests, negative authorization tests, instructions to run locally, an executable demonstration, and a short completion report. Never claim a feature is complete if tests do not pass. Do not replace the tactical engine with hard-coded animation paths. Do not use arbitrary user-authored JavaScript for tactical rules. Do not introduce public player profiles or public lesson links.

Important acceptance tests:
- Coach in two teams can switch contexts without cross-team data leakage.
- FREE can save a full project with multiple scenarios and sequences; a second project returns a stable quota error, including during concurrent requests.
- Generic catalogue simulation/assignment does not consume project quota.
- PRO downgrade preserves content and archives all but the selected project.
- D-to-D reversal and low-center support have valid, explainable transitions; same input/seed yields same replay.
- Published lesson stays unchanged after editing its source system; assigned player can view it on mobile.

Stop after M0 and request review before continuing.
