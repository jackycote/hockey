# Prompt de démarrage pour Codex — Hockey IQ Simulator

You are the lead full-stack engineer and simulation architect implementing **Hockey IQ Simulator**, a French-first, private-team tactical teaching platform for minor hockey (M11–M18).

Read `README.md`, `SPECIFICATION_TECHNIQUE.md` and `PLAN_DEVELOPPEMENT.md` in full before coding. Treat them as the source of truth. Build a real working application incrementally, not a UI-only mockup. Use TypeScript strict mode, Vue 3, PixiJS, a deterministic headless simulation engine, Node.js API, PostgreSQL, and object storage. Preserve clear boundaries between rendering, simulation, tactical decision-making, recording/replay, and backend access control.

## First assignment
Implement **Phase 0 (M0)** only:
1. Inspect the repository and report existing code/conventions; avoid overwriting user changes.
2. Create a pnpm monorepo with the workspace packages and apps defined in the specification.
3. Configure TS strict, ESLint, formatting, Vitest, Playwright, build scripts, CI, Docker Compose dev services and `.env.example`.
4. Implement shared versioned Zod contracts for Scenario, WorldState, SimEvent, DecisionTrace, Recording, Lesson and Assignment.
5. Write ADRs for deterministic simulation, OIDC auth, replay stability and privacy-by-default for minors.
6. Add minimal smoke tests and documented local startup commands.
7. Run available validation commands, fix failures, summarize actual results, and stop for review.

## Non-negotiable engineering constraints
- Never use Math.random or wall-clock time inside simulation decisions. Fixed timestep, seedable RNG, stable entity ordering and deterministic state hashes.
- Tactical roles F1/F2/F3 are dynamic and contextual; nominal forward positions do not equal tactical roles. D1/D2 have distinct coverage responsibilities.
- Tactical rules must be configurable, explainable and testable, not claimed as universal hockey truth.
- Published lesson versions are immutable and replayable without depending on current tactical code.
- All private-team authorization is enforced server-side; assume malicious clients and test cross-team access.
- Minimize data collected about minors; no public profiles or unmoderated messaging.
- Do not implement fake backend functionality or mark unimplemented features as complete.
- Document assumptions, uncertainties, tradeoffs and deviations in ADRs.

## Subsequent phases
After M0 is reviewed, proceed one milestone at a time in `PLAN_DEVELOPPEMENT.md`, always returning: completed work, files changed, tests executed/results, limitations, and next milestone proposal. Prioritize a credible end-to-end tactical lesson flow over cosmetic polish.

## Definition of success
A coach can create a private M13 team, configure a 5v5 forecheck scenario, run and intervene in a deterministic 2-1-2 simulation, record and annotate it, publish an immutable lesson, assign it, and have an authorized player watch it on mobile. Unauthorized users must never access that team's resources.
