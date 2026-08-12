# Bug Fix

Fix the reported bug. Do not immediately modify code.

First:
1. Reproduce the problem.
2. Inspect logs/errors.
3. Find the root cause and related tests.
4. Identify the smallest safe fix.

Then:
1. Implement the fix.
2. Add or update a regression test.
3. Run `scripts/test.ps1`.

Do not: Hide errors, disable failing tests, or change unrelated behavior.
The bug is considered fixed only when the regression test passes.
