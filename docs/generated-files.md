# Generated files — everything lands in `.teikk/`

Every workflow writes its output under a single project-local `.teikk/` directory, so nothing is scattered across your repo and one `.gitignore` line covers it all (added automatically on install):

```
.teikk/
├─ spec/                /teikk-spec — everything from the Specify phase, one folder:
│  ├─ SPEC.md           what to build
│  ├─ PROJECT.yaml      metadata: platform, domain, CI, E2E, budgets, logging.library
│  ├─ QUICKSTART.md     first-run guide
│  └─ WORKFLOW.md       decision tree: what command to run next
├─ DECISIONS.md         /teikk-docs (+ architecture gate) → append-only log of significant, already-implemented decisions
├─ DOCTOR.md            /teikk-doctor (project setup health audit)
├─ SHIP-REPORT.md       /teikk-ship (go/no-go verdict + traceability + blockers)
├─ tasks/               /teikk-planning → plan.md (full detail), todo.md (task index — O(1) resume)
├─ ideas/               /teikk-idea → refined idea one-pagers
├─ intent/              /teikk-interview → captured project intent
├─ adr/                 /teikk-docs → Architecture Decision Records
├─ maestro/flows/       /teikk-e2e (Android)
└─ cache/               hook caches (sdd, simplify-ignore) — never leaves the project
```

> Everything a workflow generates lives here — no more `docs/ideas/`, `docs/decisions/`, or scattered files in your repo. ADRs are gitignored by default; if you want them version-controlled, un-ignore the folder (`!.teikk/adr/`).
>
> **Pre-3.1 projects:** `/teikk-spec` used to write `SPEC.md`, `PROJECT.yaml`, `QUICKSTART.md`, and `WORKFLOW.md` directly at the `.teikk/` root instead of under `.teikk/spec/`. Every command that reads the spec checks `.teikk/spec/SPEC.md` first and falls back to `.teikk/SPEC.md` automatically — no manual migration needed. New specs always write to `.teikk/spec/`.

## Resuming after context is cleared — `todo.md` as an O(1) task index

`plan.md` holds full task detail (description, ACs, verification steps) — expensive to read, written once. `todo.md` holds only status — one checkbox line per task plus a **`Current task:`** pointer at the top — cheap to read, checked every time a session resumes. `/teikk-build`, `/teikk-test`, `/teikk-review`, and `/teikk-ship` all read `todo.md`'s pointer first instead of re-scanning the whole plan; only `/teikk-build` flips checkboxes and advances the pointer.

```markdown
**Current task:** Task 3 — in_progress

- [x] Task 1: User registration
- [x] Task 2: User login
- [~] Task 3: Task creation
- [ ] Task 4: Task list view
```

## `/teikk-build ultra` — parallel worktrees for independent tasks

`auto` runs every task one at a time, even ones with no dependency on each other. `ultra` runs the same plan, but any tasks `/teikk-planning` marked `Parallel-safe: yes` and grouped into a `### Wave N (parallel-safe)` batch (≤4 tasks, non-overlapping files) get their own git worktree and run concurrently, then merge back sequentially with a full test+build check after each merge:

```markdown
### Wave 1 (parallel-safe)
- [ ] Task 3: User profile screen — Parallel-safe: yes
- [ ] Task 4: Settings screen — Parallel-safe: yes
- [ ] Task 5: Notifications screen — Parallel-safe: yes
```

If a plan has no waves, `ultra` behaves exactly like `auto` — it never invents parallelism a plan didn't declare, and a merge conflict or post-merge test/build failure stops the whole wave rather than resolving itself silently. See `core/skills/planning-and-task-breakdown/SKILL.md` (Step 5.5) for how waves are declared, and the `/teikk-build` command file for the full Wave Execution algorithm.

**Install is additive.** Files land *next to* your own — `init claude` copies only into `.claude/commands/`, so an existing `.claude/settings.local.json` or your own slash commands are never deleted (a file it can't safely place is reported and left untouched). `uninstall` removes only the files it created.

---

← Back to [README](../README.md) · Related: [workflow.md](workflow.md) · [npm-install.md](npm-install.md)
