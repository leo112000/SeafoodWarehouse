# Feature Development

Implement a new feature. Follow this workflow:

## Phase 1 — Explore
Before modifying code:
- Read AGENTS.md
- Read relevant docs (`docs/abp.md`, `docs/architecture.md`)
- Search for similar functionality
- Inspect affected modules & existing tests
*Do not modify code during this phase.*

---

## Phase 2 — Plan
Create a concise plan containing:
- Requirements & Architecture changes
- Files to modify / New files
- Database changes (Migrations)
- API & Frontend changes
- Tests & Risks

---

## Phase 3 — Implement
- Ensure clean git working directory.
- Implement the approved approach following existing patterns.
- Do not modify unrelated code.

---

## Phase 4 — Verify
Run: `scripts/test.ps1`
If tests fail: Diagnose -> Fix -> Re-run (Max 3 automatic fix cycles).

---

## Phase 5 — Review
Review: Security, Authorization, Multi-tenancy, Database performance, Edge cases.

---

## Final
Report: Summary, Files changed, Tests executed, Results, Remaining risks.
