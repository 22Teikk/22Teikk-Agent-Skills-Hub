# Wave Execution — `/teikk-build ultra`

> Loaded on-demand by `/teikk-build ultra` only. The wave-execution algorithm
> (worktree create, subagent dispatch, sequential merge with verification,
> cleanup, resume-after-compact) is the largest single block in
> `commands/teikk-build.toml`. The prompt now references this file instead of
> inlining the ~50-line algorithm.

## Sanity-check the wave before spawning anything

Re-verify in `plan.md` that every task in the wave is `Parallel-safe: yes`,
that no two tasks' `**Files likely touched:**` lists overlap, and that the
wave has ≤4 tasks. If any check fails, stop and tell the user the plan's
wave grouping is unsafe — do not silently fall back to sequential execution,
the plan needs a fix.

## Wave execution algorithm

1. **Create one git worktree per task**, branched from the current commit
   (the tip of the sequential work completed so far):
   ```bash
   git worktree add ../<repo-name>-task-<N> -b ultra/task-<N>
   ```
2. **Update `todo.md` for the wave** per
   `skills/planning-and-task-breakdown/SKILL.md`'s Wave exception: flip every
   wave task's checkbox to `[~]` and set
   `**Current wave:** Wave N — 0/K tasks in_progress` before spawning.
3. **Spawn one subagent per task, all in the same turn** (genuine concurrency,
   not sequential Task calls). Each subagent's prompt must pin it to its own
   worktree path and its own single task:
   - Read that task's acceptance criteria and route to the skill(s)/persona(s)
     from the routing table in the main prompt.
   - Run the identical single-task cycle from `skills/incremental-implementation/SKILL.md`
     "The Increment Cycle" (RED → confirm-FAIL → GREEN with inline logging →
     REFACTOR → regression + build → commit), scoped entirely inside its
     worktree. Do **not** touch `.teikk/tasks/todo.md`
     itself — the main session owns that file; a subagent reporting a stray
     edit to it is a signal something leaked outside its worktree.
   - Report back: task number, commit SHA, test/build result, and the list of
     files it touched (cross-check against the `**Files likely touched:**`
     prediction — a mismatch is a signal the parallel-safe classification
     was wrong).
4. **Wait for all subagents in the wave to finish before merging any of them.**
   Do not start merging task N+1 while task N's subagent is still running.
5. **Merge sequentially, verifying after each merge** — this is where a
   wrongly-classified "independent" task gets caught:
   ```bash
   git merge ultra/task-<N> --no-ff
   ./gradlew test && ./gradlew assembleDebug   # or the project's equivalent
   ```
   - Merge succeeds + tests pass + build succeeds → run the **Review gate**
     from the `/teikk-build` prompt on that task's commit (skip threshold, else
     spawn `code-reviewer` on `git show <SHA>`). A **Critical stops the wave**
     exactly like a failed verification — leave the remaining tasks unmerged
     and report. Important/Suggestion go to `.teikk/tasks/review-notes.md` and
     the merge proceeds. Then flip that task's `todo.md` checkbox to `[x]`,
     update the `M/K tasks in_progress` counter, remove the worktree
     (`git worktree remove ../<repo-name>-task-<N>`), continue to the next
     task's merge.
   - **Merge conflict, or tests/build fail after a clean merge** → **STOP
     the entire wave.** Do not attempt automatic conflict resolution and do
     not merge the remaining tasks. Follow
     `skills/debugging-and-error-recovery/SKILL.md`: preserve the unmerged
     worktree, report exactly which task collided and on which file, and ask
     the user how to proceed (resolve manually, re-scope one of the two
     tasks, or demote both to sequential and rerun as `auto` from this
     point).
6. **Close out the wave.** Once every task in the wave is merged and `[x]`,
   clear `**Current wave:**` and set `**Current task:**` to whatever plan
   item follows the wave (or clear it if the wave was the last item). This is
   the same pointer contract `auto` uses — a resumed session after a wave
   completes sees a normal single `**Current task:**` line, not wave state.

## Cleaning up a stopped wave before any rerun

A wave that hit the STOP branch in step 5 leaves live state behind: the
already-merged tasks' worktrees are gone (removed on their success path), but
every not-yet-merged task still has a `../<repo-name>-task-<N>` worktree and
an `ultra/task-<N>` branch. **The next `ultra` run's step 1
(`git worktree add … -b ultra/task-<N>`) will fail on a name collision if
these survive.** So whichever resolution the user picks — resolve manually,
re-scope, or demote to `auto` — the abandoned worktrees and branches must be
cleared before rerunning:

```bash
git worktree remove --force ../<repo-name>-task-<N>   # for each abandoned task
git branch -D ultra/task-<N>                          # for each abandoned branch
```

Keep the collided task's worktree only if the user explicitly wants it for
manual conflict inspection; remove it too once inspection is done. Do not
start a fresh `ultra` or `auto` run until `git worktree list` shows no
leftover `ultra/task-*` entries and `git branch --list 'ultra/task-*'` is
empty.

## Resuming an interrupted wave

If compaction, a crash, or a closed session lands **mid-wave** — after step 2
flipped the wave tasks to `[~]` and wrote `**Current wave:**`, but before
step 5 finished merging them — a resumed session reads `todo.md`, sees
`**Current wave:** Wave N — …` plus multiple `[~]` lines, but the spawned
subagents are gone and any partial `ultra/task-*` worktrees are in an
unknown state. **Do not try to salvage partial worktree progress.** Treat the
whole wave as unstarted:

1. Discard every `ultra/task-*` worktree and branch for this wave (the
   cleanup commands above) — any committed work in them is still recoverable
   via `git branch` if genuinely needed, but by default it is thrown away.
2. Reset every `[~]` wave task back to `[ ]` in `todo.md`.
3. Re-run the wave from step 1 (Sanity-check → worktrees → spawn → merge).
   A wave is cheap to redo from scratch and impossible to reliably
   half-resume, so redo beats guess. This is the one place the "multiple
   `[~]`" state can appear on resume, and the resume rule is simply: collapse
   it back to a clean pre-wave state, never continue from it.

## When ultra is not worth it

If a plan has zero `### Wave N (parallel-safe)` groups, say so and run the
rest of the plan exactly as `auto` would — do not manufacture waves the plan
didn't declare, and do not ask the user to re-plan just to unlock `ultra`
for a one-task plan.
