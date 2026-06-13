---
description: Implement tasks incrementally — build, test, verify, commit. Add "auto" to run the whole plan in one approved pass.
---

Invoke the teikk-agents-skills:incremental-implementation skill. alongside `skills/test-driven-development/SKILL.md`.

## Skill routing (before each task)

Match the task to the right skill and read it before coding:

| Task touches | Also read |
|--------------|-----------|
| Compose UI, ViewModels | `skills/android-ui-kotlin/SKILL.md` |
| XML/Java UI | `skills/android-ui-java/SKILL.md` |
| Repositories, Room, Retrofit, Coroutines | `skills/android-data-and-concurrency-kotlin/SKILL.md` |
| Hilt, Gradle, Version Catalog | `skills/android-di-and-build/SKILL.md` |
| API/module contracts | `skills/api-and-interface-design/SKILL.md` |
| Logging, Crashlytics, analytics | `skills/observability-and-instrumentation/SKILL.md` |
| Official doc verification | `skills/source-driven-development/SKILL.md` |

**Gate:** Do not start Phase 1+ feature tasks until Phase 0 Foundation (Hilt + observability) checkpoint passes.

## Modes

- **`/teikk-build`** — implement the *next* pending task, then stop.
- **`/teikk-build auto`** — generate the plan if needed, get a single approval, then implement every task.

User arguments select the mode. Treat `auto` or `all` as autonomous mode.

## Default: one task

Pick the next pending task from the plan. Then:

1. Read the task's acceptance criteria and route to the skill(s) above
2. Load relevant context (existing code, patterns, types)
3. Write a failing test for the expected behavior (RED)
4. Implement the minimum code to pass the test (GREEN)
5. Run the full test suite to check for regressions
6. Run the build to verify compilation
7. Commit with a descriptive message (follow the teikk-agents-skills:git-workflow-and-versioning skill)
8. Mark the task complete and stop

## Autonomous: the whole plan (`/teikk-build auto`)

1. **Require a spec.** Look for `SPEC.md`, `docs/SPEC.md`, or `spec/*`. If none exists, stop — tell the user to run `/teikk-spec` first.
2. **Establish a clean baseline.** Run `git status --porcelain`. Stop if uncommitted changes exist outside planning artifacts.
3. **Plan if needed.** If no `tasks/plan.md`, follow the teikk-agents-skills:planning-and-task-breakdown skill.
4. **Single checkpoint.** Present the full plan and wait for approval.
5. **Execute every task in dependency order.** RED → GREEN → regression → build → commit → mark complete. One commit per task.
6. **Stop and ask** when tests fail, spec is ambiguous, or task is high-risk — follow the teikk-agents-skills:debugging-and-error-recovery skill or `skills/doubt-driven-development/SKILL.md`.
7. **Summarize at the end.**

If any step fails, follow the teikk-agents-skills:debugging-and-error-recovery skill.
