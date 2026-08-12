# Code Review

Review the current working tree. **Do not modify files.**

Review for:
- **Correctness:** Logic errors, missing validation, edge cases.
- **Security:** Auth, Authorization, Tenant Isolation, Input validation.
- **Database:** N+1 queries, missing indexes, tenant filters.
- **Backend/Frontend:** Architecture violations, unhandled errors, state race conditions.

Return findings ordered by severity:
- **P0 — Critical**
- **P1 — High**
- **P2 — Medium**
- **P3 — Low**
