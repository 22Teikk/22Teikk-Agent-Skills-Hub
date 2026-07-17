---
description: Implement tasks incrementally — build, test, verify, commit. Add "auto" to run the whole plan in one approved pass, or "ultra" to also run independent tasks in parallel worktrees.
---

Invoke the teikk-agents-skills:incremental-implementation skill alongside `skills/test-driven-development/SKILL.md` and `skills/observability-and-instrumentation/SKILL.md`.

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
- **`/teikk-build auto`** — generate the plan if needed, get a single approval, then implement every task, one at a time, in dependency order.
- **`/teikk-build ultra`** — same as `auto`, except tasks explicitly marked `Parallel-safe: yes` and grouped into a `### Wave N (parallel-safe)` batch (see `skills/planning-and-task-breakdown/SKILL.md` Step 5.5) run concurrently, each in its own git worktree, then get merged back sequentially. Tasks outside a wave still run one at a time, exactly like `auto`. If the plan has no waves, `ultra` behaves identically to `auto` — it never invents parallelism the plan didn't declare.

User arguments select the mode. Treat `auto` or `all` as autonomous sequential mode; treat `ultra` as autonomous mode with wave-parallel execution.

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
8. Commit with a descriptive message (follow the teikk-agents-skills:git-workflow-and-versioning skill)
9. Flip the task's `todo.md` checkbox to `[x]`, advance `**Current task:**` to the next `[ ]` task (or clear it if none remain), then mark the task complete and stop

## Autonomous: the whole plan (`/teikk-build auto`)

1. **Require a spec.** Look for `.teikk/spec/SPEC.md` (fall back to `.teikk/SPEC.md`, then a legacy `SPEC.md`/`docs/SPEC.md` at the repo root if present). If none exists, stop — tell the user to run `/teikk-spec` first.
2. **Establish a clean baseline.** Run `git status --porcelain`. Stop if uncommitted changes exist outside planning artifacts.
3. **Plan if needed.** If no `.teikk/tasks/plan.md`, follow the teikk-agents-skills:planning-and-task-breakdown skill.
4. **Single checkpoint.** Present the full plan and wait for approval.
5. **Execute every task in dependency order.** RED → GREEN (with inline logging) → regression → build → commit → mark complete. One commit per task.
6. **Stop and ask** when tests fail, spec is ambiguous, or task is high-risk — follow the teikk-agents-skills:debugging-and-error-recovery skill or `skills/doubt-driven-development/SKILL.md`.
7. **Summarize at the end.**

If any step fails, follow the teikk-agents-skills:debugging-and-error-recovery skill.

## Ultra: wave-parallel execution (`/teikk-build ultra`)

Same entry conditions as `auto` (steps 1-4 above: spec required, clean baseline, plan generated if needed, single checkpoint on the full plan — including the wave grouping from `planning-and-task-breakdown` Step 5.5). After approval, walk `plan.md` top to bottom:

- A task/section **not** under a `### Wave N (parallel-safe)` heading → run it exactly like `auto` step 5 (sequential, main session, one commit).
- A `### Wave N (parallel-safe)` heading → run **Wave Execution** below before continuing to whatever follows the wave.

### Wave Execution

1. **Sanity-check the wave before spawning anything.** Re-verify in `plan.md` that every task in the wave is `Parallel-safe: yes`, that no two tasks' `**Files likely touched:**` lists overlap, and that the wave has ≤4 tasks. If any check fails, stop and tell the user the plan's wave grouping is unsafe — do not silently fall back to sequential execution, the plan needs a fix.
2. **Create one git worktree per task**, branched from the current commit (the tip of the sequential work completed so far):
   ```bash
   git worktree add ../<repo-name>-task-<N> -b ultra/task-<N>
   ```
3. **Update `todo.md` for the wave** per `skills/planning-and-task-breakdown/SKILL.md`'s Wave exception: flip every wave task's checkbox to `[~]` and set `**Current wave:** Wave N — 0/K tasks in_progress` before spawning.
4. **Spawn one subagent per task, all in the same turn** (genuine concurrency, not sequential Task calls). Each subagent's prompt must pin it to its own worktree path and its own single task:
   - Read that task's acceptance criteria and route to the skill(s)/persona(s) from the routing table above.
   - Run the identical single-task cycle from "Default: one task" above (steps 3-8: RED → GREEN with inline logging → regression → build → commit), scoped entirely inside its worktree. Do **not** touch `.teikk/tasks/todo.md` itself — the main session owns that file; a subagent reporting a stray edit to it is a signal something leaked outside its worktree.
   - Report back: task number, commit SHA, test/build result, and the list of files it touched (cross-check against the `**Files likely touched:**` prediction — a mismatch is a signal the parallel-safe classification was wrong).
5. **Wait for all subagents in the wave to finish before merging any of them.** Do not start merging task N+1 while task N's subagent is still running.
6. **Merge sequentially, verifying after each merge** — this is where a wrongly-classified "independent" task gets caught:
   ```bash
   git merge ultra/task-<N> --no-ff
   ./gradlew test && ./gradlew assembleDebug   # or the project's equivalent
   ```
   - Merge succeeds + tests pass + build succeeds → flip that task's `todo.md` checkbox to `[x]`, update the `M/K tasks in_progress` counter, remove the worktree (`git worktree remove ../<repo-name>-task-<N>`), continue to the next task's merge.
   - **Merge conflict, or tests/build fail after a clean merge** → **STOP the entire wave.** Do not attempt automatic conflict resolution and do not merge the remaining tasks. Follow the teikk-agents-skills:debugging-and-error-recovery skill: preserve the unmerged worktree, report exactly which task collided and on which file, and ask the user how to proceed (resolve manually, re-scope one of the two tasks, or demote both to sequential and rerun as `auto` from this point).
7. **Close out the wave.** Once every task in the wave is merged and `[x]`, clear `**Current wave:**` and set `**Current task:**` to whatever plan item follows the wave (or clear it if the wave was the last item). This is the same pointer contract `auto` uses — a resumed session after a wave completes sees a normal single `**Current task:**` line, not wave state.

### Cleaning up a stopped wave before any rerun

A wave that hit the STOP branch in step 6 leaves live state behind: the already-merged tasks' worktrees are gone (removed on their success path), but every not-yet-merged task still has a `../<repo-name>-task-<N>` worktree and an `ultra/task-<N>` branch. **The next `ultra` run's step 2 (`git worktree add … -b ultra/task-<N>`) will fail on a name collision if these survive.** So whichever resolution the user picks — resolve manually, re-scope, or demote to `auto` — the abandoned worktrees and branches must be cleared before rerunning:

```bash
git worktree remove --force ../<repo-name>-task-<N>   # for each abandoned task
git branch -D ultra/task-<N>                          # for each abandoned branch
```

Keep the collided task's worktree only if the user explicitly wants it for manual conflict inspection; remove it too once inspection is done. Do not start a fresh `ultra` or `auto` run until `git worktree list` shows no leftover `ultra/task-*` entries and `git branch --list 'ultra/task-*'` is empty.

### Resuming an interrupted wave

If compaction, a crash, or a closed session lands **mid-wave** — after step 3 flipped the wave tasks to `[~]` and wrote `**Current wave:**`, but before step 6 finished merging them — a resumed session reads `todo.md`, sees `**Current wave:** Wave N — …` plus multiple `[~]` lines, but the spawned subagents are gone and any partial `ultra/task-*` worktrees are in an unknown state. **Do not try to salvage partial worktree progress.** Treat the whole wave as unstarted:

1. Discard every `ultra/task-*` worktree and branch for this wave (the cleanup commands above) — any committed work in them is still recoverable via `git branch` if genuinely needed, but by default it is thrown away.
2. Reset every `[~]` wave task back to `[ ]` in `todo.md`.
3. Re-run the wave from step 1 (Sanity-check → worktrees → spawn → merge). A wave is cheap to redo from scratch and impossible to reliably half-resume, so redo beats guess. This is the one place the "multiple `[~]`" state can appear on resume, and the resume rule is simply: collapse it back to a clean pre-wave state, never continue from it.

### When ultra is not worth it

If a plan has zero `### Wave N (parallel-safe)` groups, say so and run the rest of the plan exactly as `auto` would — do not manufacture waves the plan didn't declare, and do not ask the user to re-plan just to unlock `ultra` for a one-task plan.
