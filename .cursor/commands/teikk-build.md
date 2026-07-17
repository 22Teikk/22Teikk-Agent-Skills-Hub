# Implement tasks incrementally — build, test, verify, commit. Add "auto" to run the whole plan in one approved pass.

Read and follow `skills/incremental-implementation/SKILL.md` alongside `skills/test-driven-development/SKILL.md` and `skills/observability-and-instrumentation/SKILL.md`.

## Skill routing (before each task)

Read the spec (`.teikk/spec/SPEC.md`, falling back to `.teikk/SPEC.md` for older projects) to determine the project platform, then match the task to the right skill and persona:

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
| Official doc verification | Any | `skills/source-driven-development/SKILL.md` |

**Gate (Android):** Do not start Phase 1+ feature tasks until Phase 0 Foundation (Hilt + observability) checkpoint passes.
**Gate (iOS):** Do not start features until Phase 0 (SPM + SwiftLint + logging) passes.
**Gate (Flutter):** Do not start features until Phase 0 (flavor config + state management + logging) passes.

## Logging while you build (no separate call needed)

Read `logging.library` from `.teikk/spec/PROJECT.yaml` (fall back to `.teikk/PROJECT.yaml`, then the platform default — `timber` for Android, `oslog` for iOS, `logger` for Flutter — if the field is missing). Phase 0 Foundation (`/teikk-android-setup`, `/teikk-ios-setup`, `/teikk-flutter-setup`) already planted that library; every task you implement here instruments its own logging inline as part of GREEN, using the configured library — do not defer logging to a follow-up `/teikk-observability` call for new code. Per `skills/observability-and-instrumentation/SKILL.md`:

- Log entry/exit of non-trivial operations and error paths using `logging.library`, not raw `Log.d`/`print`/`System.out`.
- Attach custom keys/context on captured exceptions (Crashlytics `recordException` + custom keys, or the iOS/Flutter equivalent) — never a bare exception log.
- Never log secrets, tokens, or PII.

**When to still use `/teikk-observability` directly:** retrofitting logging onto pre-existing code that has none, or adding analytics events / performance traces that span more than the current task's scope. Routine per-task logging always happens inline here.

## Modes

- **`/teikk-build`** — implement the *next* pending task, then stop.
- **`/teikk-build auto`** — generate the plan if needed, get a single approval, then implement every task.

User arguments select the mode. Treat `auto` or `all` as autonomous mode.

## Finding the task — O(1) resume, never re-read the whole plan

Read `.teikk/tasks/todo.md` first (format defined in `skills/planning-and-task-breakdown/SKILL.md` Step 6). Its `**Current task:**` line is the single source of truth for what to work on:

- If it names a task marked `[~]` (in progress), that's a resumed task from a cleared context — jump straight to that task's `## Task N:` section in `.teikk/tasks/plan.md`. Do not re-read the rest of the plan.
- If nothing is `[~]`, the next `[ ]` (pending) task in file order is the one to pick.
- If `todo.md` doesn't exist yet (older plan, or plan generated before this format), fall back to scanning `plan.md` directly, then create `todo.md` per the format in `planning-and-task-breakdown` so future resumes are fast.

## Default: one task

Using the task found above:

1. Read that task's acceptance criteria and route to the skill(s)/persona(s) above
2. Load relevant context (existing code, patterns, types)
3. Flip the task's `todo.md` checkbox to `[~]` and update `**Current task:**` to it, before writing any code
4. Write a failing test for the expected behavior (RED)
5. Implement the minimum code to pass the test, instrumenting logging inline per the section above (GREEN)
6. Run the full test suite to check for regressions
7. Run the build to verify compilation
8. Commit with a descriptive message (follow `skills/git-workflow-and-versioning/SKILL.md`)
9. Flip the task's `todo.md` checkbox to `[x]`, advance `**Current task:**` to the next `[ ]` task (or clear it if none remain), then mark the task complete and stop

## Autonomous: the whole plan (`/teikk-build auto`)

1. **Require a spec.** Look for `.teikk/spec/SPEC.md` (fall back to `.teikk/SPEC.md`, then a legacy `SPEC.md`/`docs/SPEC.md` at the repo root if present). If none exists, stop — tell the user to run `/teikk-spec` first.
2. **Establish a clean baseline.** Run `git status --porcelain`. Stop if uncommitted changes exist outside planning artifacts.
3. **Plan if needed.** If no `.teikk/tasks/plan.md`, follow `skills/planning-and-task-breakdown/SKILL.md`.
4. **Single checkpoint.** Present the full plan and wait for approval.
5. **Execute every task in dependency order.** RED → GREEN (with inline logging) → regression → build → commit → mark complete. One commit per task.
6. **Stop and ask** when tests fail, spec is ambiguous, or task is high-risk — follow `skills/debugging-and-error-recovery/SKILL.md` or `skills/doubt-driven-development/SKILL.md`.
7. **Summarize at the end.**

If any step fails, follow `skills/debugging-and-error-recovery/SKILL.md`.
