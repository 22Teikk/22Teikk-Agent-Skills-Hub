# teikk-agents-skills — Workflow Paths

> Centralized reference for "where does X live" used across `/teikk-spec`,
> `/teikk-planning`, `/teikk-build`, `/teikk-test`, `/teikk-review`,
> `/teikk-ship`. Each command prompt can reference this file once instead
> of repeating every path convention inline.

## Spec files

Read order (newest to oldest):

1. `.teikk/spec/SPEC.md` — current install location (post-3.1)
2. `.teikk/SPEC.md` — older root-path location
3. `SPEC.md` / `docs/SPEC.md` — legacy root locations

When writing, **always** write to `.teikk/spec/SPEC.md` for new projects;
the reader-side fallback handles older projects transparently.

## PROJECT.yaml

Same fallback chain as SPEC.md:

1. `.teikk/spec/PROJECT.yaml` (current)
2. `.teikk/PROJECT.yaml` (older)

Fields consumed by `/teikk-build`, `/teikk-ship`:

- `name`, `platforms`, `domain`, `ci`, `e2e`
- `budgets.startup_cold_ms`, `budgets.memory_mb`, `budgets.jank_frames`
- `logging.library` — `timber` (Android), `oslog` (iOS), `logger` (Flutter)
- `model_tiers.{low,medium,high,ultra}` — optional per-tier model selection

## Tasks

- `.teikk/tasks/plan.md` — full plan with `## Task N:` sections
- `.teikk/tasks/todo.md` — index read on every `/teikk-build`, `/teikk-test`,
  `/teikk-review`, `/teikk-ship` resume. Format defined in
  `skills/planning-and-task-breakdown/SKILL.md` Step 6.

## Decisions log

- `.teikk/DECISIONS.md` — append-only, written via `/teikk-docs` or the
  `/teikk-spec` architecture gate. Header format in
  `skills/documentation-and-adrs/SKILL.md`.

## Hook caches

- `.teikk/cache/telemetry/events.jsonl` — lifecycle telemetry events (off by
  default; opt in with `TEIKK_TELEMETRY=on`)
- `.teikk/cache/ship-reports.md` — `/teikk-ship` Phase A scratch state, only
  used during the current ship run; durable copy lives in
  `.teikk/SHIP-REPORT.md`
- `.teikk/cache/sdd-cache.json` — SDD section cache (see
  `hooks/sdd-cache-post.sh`)

## Ship report

- `.teikk/SHIP-REPORT.md` — durable output of `/teikk-ship` Phase D; the
  authoritative verdict and traceability matrix. Overwritten on each
  `/teikk-ship` run.

## E2E flows

- `.teikk/maestro/flows/` — Android (Maestro) E2E YAML
- iOS uses XCUITest targets inside the Xcode project (no `.teikk/` path)
- Flutter uses `integration_test/` directory inside the project

## Install manifest

- `.teikk-agents-skills.json` — install manifest (version, targets, owned
  files list). **Commit this**; do NOT commit anything else under `.teikk/`
  (gitignored automatically by the installer).
