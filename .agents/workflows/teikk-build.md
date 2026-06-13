---
description: Implement tasks incrementally — build, test, verify, commit. Add "auto" to run the whole plan in one approved pass.
---

Read and follow `skills/incremental-implementation/SKILL.md` alongside `skills/test-driven-development/SKILL.md`.

## Modes

- **`/teikk-build`** — implement the *next* pending task, then stop (careful, one slice at a time).
- **`/teikk-build auto`** — generate the plan if needed, get a single approval, then implement *every* task without stopping between them.

User arguments select the mode. Treat `auto` (canonical) or `all` as autonomous mode; anything else (or empty) is the default single-task mode. Autonomous mode is not faster *per task* — it runs the same test-driven loop — it only removes the human stepping *between* tasks.

## Default: one task

Pick the next pending task from the plan. Then:

1. Read the task's acceptance criteria
2. Load relevant context (existing code, patterns, types)
3. Write a failing test for the expected behavior (RED)
4. Implement the minimum code to pass the test (GREEN)
5. Run the full test suite to check for regressions
6. Run the build to verify compilation
7. Commit with a descriptive message
8. Mark the task complete and stop

## Autonomous: the whole plan (`/teikk-build auto`)

Use this once a spec exists and you want to collapse plan + build into one run.

1. **Require a spec.** Look only for a spec at a known path: `SPEC.md` at the repo root, `docs/SPEC.md`, or a file under `spec/`. A README or arbitrary doc does **not** count. If none exists, stop and tell the user to run `/teikk-spec` first — do not invent requirements.
2. **Establish a clean baseline.** Run `git status --porcelain`. If there are uncommitted changes outside the expected planning artifacts (`SPEC.md`, `docs/SPEC.md`, `spec/*`, `tasks/plan.md`, `tasks/todo.md`), stop and ask the user to commit, stash, or confirm how to handle them.
3. **Plan if needed.** If there is no `tasks/plan.md`, follow `skills/planning-and-task-breakdown/SKILL.md` to generate one.
4. **Single checkpoint.** Present the full plan and wait for an unambiguous affirmative. This is the only human gate — after approval, run autonomously.
5. **Execute every task in dependency order.** For each task, run the full default loop above (RED → GREEN → regression → build → commit → mark complete). One commit per task.
6. **Stop and ask the user** when a test can't pass, the spec is ambiguous, or a task is high-risk or irreversible — follow `skills/debugging-and-error-recovery/SKILL.md` or `skills/doubt-driven-development/SKILL.md`.
7. **Summarize at the end:** tasks completed, tests added, commits made, and anything skipped or flagged.

If any step fails, follow `skills/debugging-and-error-recovery/SKILL.md`.
