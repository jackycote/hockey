# Project change approval workflow

The user established a proposal-first backlog on 2026-11-20. The canonical register is [docs/BACKLOG.md](docs/BACKLOG.md).

- Register every proposed product or technical change in the backlog before implementation. Include a stable ID, proposed behavior, scope, acceptance criteria and planned validation.
- New requests become proposals awaiting approval. Do not treat a request describing desired changes as approval to implement them under this workflow.
- Do not change application code, tests, dependencies, configuration or behavior for a proposal until the user explicitly approves its ID or unambiguously approves its stated scope. Record the user's approval wording and date in the backlog before coding. Never approve a proposal yourself.
- Read-only investigation and proposal preparation are allowed. Creating/maintaining the backlog, recording decisions, and documenting this workflow are authorized administration of the user's request; they do not authorize product implementation.
- Implement only approved scope. Necessary fixes and tests within that scope are included; new requirements or expanded scope need a proposal and approval.
- Keep proposal status current: proposed, approved, in progress, implemented, deferred or rejected. On completion, record actual validation and material limitations.
- Future explicit user instructions take precedence. Do not infer approval from silence or elapsed time.

## Authorized v1.2 execution

On 2026-11-20 the user explicitly requested implementation of **all milestones in Hockey_Doo_MVP_v1.2.zip without further intervention overnight**. BKL-027–036 record this approval before code changes. Continue through this authorized scope autonomously; the package's default M0 review stop and per-milestone confirmation do not apply to this run. Maintain `docs/V1.2-STATUS.md` as a durable handoff with actual checks, unfinished work and external launch dependencies. Do not claim human coaching/legal reviews or production deployment as completed. New scope outside v1.2 still follows the proposal workflow.
