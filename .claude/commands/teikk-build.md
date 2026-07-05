---
description: Implement tasks incrementally — build, test, verify, commit. Add "auto" to run the whole plan in one approved pass.
---

Invoke the teikk-agents-skills:incremental-implementation skill alongside `skills/test-driven-development/SKILL.md`.

## Skill routing (before each task)

Read the SPEC.md to determine the project platform, then match the task to the right skill and persona:

| Task touches | Platform | Also read / invoke |
|--------------|----------|--------------------|
| Compose UI, ViewModels | Android | `skills/android-ui-kotlin/SKILL.md` + `agents/kotlin-specialist.md` |
| XML/Java UI | Android | `skills/android-ui-java/SKILL.md` |
| Repositories, Room, Retrofit, Coroutines | Android | `skills/android-data-and-concurrency-kotlin/SKILL.md` |
| Hilt, Gradle, Version Catalog | Android | `skills/android-di-and-build/SKILL.md` |
| SwiftUI views, async/await, Core Data | iOS | `agents/swift-expert.md` |
| Widget trees, Riverpod/BLoC, GoRouter | Flutter | `agents/flutter-expert.md` |
| Push, deep links, offline sync (both platforms) | Shared | `agents/mobile-app-developer.md` |
| API/module contracts | Any | `skills/api-and-interface-design/SKILL.md` |
| Logging, Crashlytics, analytics | Any | `skills/observability-and-instrumentation/SKILL.md` |
| Official doc verification | Any | `skills/source-driven-development/SKILL.md` |

**Gate (Android):** Do not start Phase 1+ feature tasks until Phase 0 Foundation (Hilt + observability) checkpoint passes.
**Gate (iOS):** Do not start features until Phase 0 (SPM + SwiftLint + logging) passes.
**Gate (Flutter):** Do not start features until Phase 0 (flavor config + state management + logging) passes.

## Modes

- **`/teikk-build`** — implement the *next* pending task, then stop.
- **`/teikk-build auto`** — generate the plan if needed, get a single approval, then implement every task.

User arguments select the mode. Treat `auto` or `all` as autonomous mode.

## Default: one task

Pick the next pending task from the plan. Then:

1. Read the task's acceptance criteria and route to the skill(s)/persona(s) above
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
