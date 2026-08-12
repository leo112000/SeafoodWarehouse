# AI Agent Development Rules

This repository is developed with AI coding agents.

Supported agents may include:
- Claude Code
- Codex
- Antigravity
- Other compatible coding agents

AGENTS.md is the shared source of truth for agent behavior.

---

# 1. Core Principles

## Understand before changing
Never modify code before understanding:
1. The relevant architecture
2. Existing implementation patterns
3. Related tests
4. Business rules
5. Dependencies between affected modules

Search the repository before creating new abstractions.
Prefer existing patterns over introducing new patterns.

---

# 2. Scope Control
Only modify files required for the task.
Do not:
- Refactor unrelated code
- Rename unrelated files
- Upgrade dependencies without approval
- Change architecture without approval
- Remove existing functionality
- Modify production configuration unnecessarily

If a broader change is required, explain why before proceeding.

---

# 3. Workflow
Every non-trivial task follows:
REQUIREMENT -> EXPLORE -> PLAN -> IMPLEMENT -> TEST -> REVIEW -> FIX -> TEST AGAIN -> FINAL REVIEW

Do not skip verification.

---

# 4. Planning
For non-trivial tasks:
1. Inspect the repository.
2. Find similar implementations.
3. Identify affected files.
4. Identify risks.
5. Create an implementation plan.

Do not start implementation until the plan is clear.

---

# 5. Implementation
During implementation:
- Follow existing architecture.
- Reuse existing utilities.
- Prefer simple solutions.
- Avoid unnecessary abstractions.
- Keep changes focused.
- Preserve backward compatibility unless explicitly requested.

---

# 6. Testing
Never claim a task is complete because the code "looks correct".
Verification must use actual commands.

At minimum, run the relevant:
- Build
- Unit tests
- Integration tests
- Type checking
- Lint
- E2E tests

Use `scripts/test.ps1` as the full verification entry point.

---

# 7. Failure Loop
If tests fail:
1. Read the actual error.
2. Identify the root cause.
3. Fix the root cause.
4. Run the failed test again.
5. Run the complete relevant test suite.
6. Repeat if necessary.

Do not hide, suppress, or weaken tests to make them pass.
Maximum automatic fix attempts: 3.
After 3 unsuccessful attempts, stop and report:
- Failure
- Root cause hypothesis
- What was changed
- What remains broken
- Recommended next step

---

# 8. Review
After implementation and passing tests, perform a review.
Check:
- Correctness
- Architecture
- Security
- Authorization
- Multi-tenancy
- Database consistency
- Performance
- Error handling
- Edge cases
- Tests
- Unnecessary changes

For major features, use an independent review agent such as Codex.

---

# 9. Git Safety & Checkpoints
Before major changes:
- Check `git status` and ensure clean workspace.
- Create a Git checkpoint/branch.
- If implementation fails, use `git checkout .` to clean up before trying a new approach.
- Never rewrite history or force push unless explicitly requested.
- Do not commit secrets.

---

# 10. Documentation
Project knowledge belongs in `docs/`.
Do not put large architectural explanations into this file.
Keep AGENTS.md focused on behavior and workflow.

---

# 11. Completion Criteria
A task is complete only when:
- Implementation is complete
- Relevant tests pass
- Build passes
- No unrelated changes remain
- Review has been completed
- Remaining risks are reported

The final response must summarize:
1. What changed
2. Files changed
3. Tests executed
4. Test results
5. Remaining risks
