# Changelog

All notable changes to **teikk-agents-skills** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); this project adheres to [Semantic Versioning](https://semver.org/).

## Release automation

Releases are cut automatically by GitHub Actions from branch pushes — no manual tagging. The version source of truth is the latest repo-wide `v*` git tag (both branches share one monotonic counter); `package.json` is never bumped.

- **Push/merge to `main`** → **major** bump (e.g. `3.2.0` → `4.0.0`).
- **Push/merge to `uat`** → **minor** bump (e.g. `4.0.0` → `4.1.0`).

Each run computes the next tag, then publishes a git tag + GitHub Release (`--generate-notes`) targeting that commit. A commit already carrying an exact `v*` tag is skipped, so re-runs never duplicate a release. Install a specific release with `npm install github:22Teikk/22Teikk-Agent-Skills-Hub#vX.Y.Z`.

**Skipping a version bump.** A merge to `main`/`uat` normally publishes a new tag. To land a change WITHOUT a release:
- Put `[skip release]` (or `[skip-release]`, case-insensitive) in the merge commit message — skips even if code changed.
- Or make the merge **docs-only** — every changed file is `*.md` or under `docs/`. A mixed diff (any non-doc file) releases normally.

If the pushed range can't be determined (first push, force-push), the guard fails safe and releases anyway — a real release is never silently swallowed.

## [Unreleased]

Workflow-hub review pass: fixes a broken command reference, closes model-tiering and token-cost gaps, and adds compaction resilience. No breaking changes — all additions are opt-in or non-blocking.

### Added
- **`npm install` + `init claude`/`update claude` now auto-wires the 7 lifecycle hooks into the project's own `.claude/settings.json`** (new `lib/claude-hooks.js`) — `hooks/hooks.json` uses `${CLAUDE_PLUGIN_ROOT}`, which Claude Code only resolves for a plugin-marketplace install; the standard npm/CLI install path previously copied `hooks/hooks.json` as an inert file that Claude Code never read, so telemetry, the pre-compact checkpoint, and session-start injection silently never fired. The merge rewrites `${CLAUDE_PLUGIN_ROOT}` → `${CLAUDE_PROJECT_DIR}`, is additive (a user's own hooks/permissions in `settings.json` are preserved, re-running `update` doesn't duplicate entries), and `uninstall` removes only the hook entries it added (tracked via a new `claudeHooks` field in `.teikk-agents-skills.json`). Every wired command is also wrapped in a `[ -f "${CLAUDE_PROJECT_DIR}/hooks/<script>" ] && ... || true` existence guard, always exiting 0 — necessary because `.claude/settings.json` is deliberately **not** added to the managed `.gitignore` block (Claude Code settings are meant to be team-shared, unlike everything else this package installs), so a teammate who pulls a committed `settings.json` before running `init claude` themselves would otherwise hit the wired command failing to find the gitignored `hooks/`/`lib/telemetry.sh` files. Covered by two new cases in `scripts/test-install.js`: `runClaudeHooksWiring` fires the wired hook end-to-end and asserts valid JSONL output plus the presence of the existence guard, and a dedicated assertion simulates the teammate-without-init scenario (guarded command run with a `CLAUDE_PROJECT_DIR` pointing at a directory with no `hooks/`) and asserts it still exits 0.
- **`scripts/benchmark.js`, `scripts/decisions.js`, and `scripts/rollback.sh` now copied into every installed project** (all 5 targets) instead of only existing in the pack's own repo — a user could enable telemetry, run the workflow, and generate `.teikk/DECISIONS.md`, but had no in-project way to run the benchmark, query decisions, or roll back without cloning `22Teikk-Agent-Skills-Hub` separately and pointing `--events`/`--file` cross-repo. These three have no dependency beyond `fs`/`path`/`git`, so they run standalone once copied; the rest of `scripts/` (`build-registry.js`, `sync-targets.js`, `validate-parity.js`, `validate-skills.js`, `test-install.js`, `postinstall.js`) stays maintainer-only and is not copied. `.gitignore` ignores the three specific files, not the whole `scripts/` directory, since that name is common enough in user projects to make a blanket ignore unsafe. Docs (`references/observability-and-benchmark.md`, `docs/framework-internals.md`, `docs/npm-install.md`) updated to drop the now-unnecessary "clone the repo" instructions. New `runSharedScripts` case in `scripts/test-install.js` asserts a user's own `scripts/` files survive both install and uninstall.
- **`/teikk-map-code-base` command + `map-code-base` skill (23rd command)** — the reverse of `/teikk-spec`: for existing/legacy projects adopting the pack, it scans the codebase (build manifests, source layout, tests, CI) and reverse-engineers the same `.teikk/spec/` artifacts (`SPEC.md`, `PROJECT.yaml`, verbatim `QUICKSTART.md`/`WORKFLOW.md`) plus a new `PROJECT-MAP.md`, instead of making the user hand-write a spec. Detects platform/stack/architecture and inherits them (stating an `ASSUMPTIONS` block for veto rather than running the `/teikk-spec` architecture gate); the `## Open Questions` hard gate and the drop-in output contract are preserved so a mapped project can go straight to `/teikk-planning`. Added for Claude, Antigravity, OpenCode, Cursor, and Gemini; parity-verified via `validate-parity.js`.
- **`/teikk-machine-audit` command (22nd command)** — the `machine-audit` skill existed standalone since v2.2.0 but was never wired to a command in any of the 5 targets, despite README referencing `/teikk-machine-audit` 4 times including in the primary troubleshooting flow. Added for Claude, Antigravity, OpenCode, Cursor, and Gemini; parity-verified via `validate-parity.js`.
- **`model_tiers` field in `PROJECT.yaml`** (optional, blank by default) — personas and subagent calls self-classify their own task complexity as `low`/`medium`/`high`/`ultra` (see `agents/README.md`'s new "Model tiering" section) and look up a concrete model name per tier here if the harness supports per-call model selection. No model name is hardcoded into any skill, persona, or command — this repo targets 5 harnesses with different model catalogs, so the only place a model name should ever live is this project-local, user-filled field. All 10 personas in `agents/` gained a "Model tier" line in their Composition block stating their typical tier and when to escalate.
- **PreCompact hook (`hooks/pre-compact-checkpoint.sh`)** — writes a small deterministic checkpoint (`.teikk/cache/compact-checkpoint.md`: current task pointer from `todo.md`, git branch, working-tree change count, timestamp) right before Claude Code compacts conversation history. Reduces post-compaction hallucination of task state (e.g. "I think I was on Task 3") by giving a resumed session a disk-backed snapshot instead of relying solely on the auto-generated summary. Documented in `hooks/PRE-COMPACT-CHECKPOINT.md`.
- **`/teikk-ship` writes persona reports to disk incrementally** — each of the five fan-out personas' full report is appended to `.teikk/cache/ship-reports.md` as soon as it lands, instead of held in the live conversation until Phase D. Cuts context held during the merge phase to one-line summaries per persona, and survives a compaction event landing mid-fan-out (the longest-running phase in the workflow) without losing already-completed reports.
- **`/teikk-review` adversarial-pass threshold** — applies the same lightweight-change threshold `/teikk-ship` already used to skip its fan-out (≤2 files, <50 lines, no auth/payments/data/config touch): below it, `/teikk-review` skips its own adversarial pass and says so explicitly in the output. This is a review-time convenience only — `/teikk-ship`'s adversarial pass remains unconditional and always re-runs before any GO, so the end-to-end gate is unweakened.
- **`validate-parity.js` content-drift warning (non-blocking)** — hashes `.claude/commands/*.md` against `.agents/workflows/*.md` for every shared command name and warns (does not fail CI) when they differ, since Cursor/Gemini are already mechanically kept in sync by `sync-targets.js` but Claude/Antigravity have always been hand-maintained with no drift signal.
- **Release CI warns on `plugin.json` version drift (non-blocking)** — `.github/workflows/release.yml` now checks `.claude-plugin/plugin.json`'s `version` field against the newly published tag after each release and emits a GitHub Actions warning annotation (not a failure) if they've diverged, since that field is hand-maintained and had silently drifted two major versions behind (`2.2.0` while the repo was on `4.2.0`).

### Fixed
- **`lib/telemetry.sh` was never copied into an installed project** — `hooks/lifecycle-telemetry.sh` sources `../lib/telemetry.sh`, but `lib/` wasn't in any target's `copyPaths`, so the hook silently no-op'd (the `[ -f "$EMITTER" ]` guard failed) in every npm-installed project regardless of the `TEIKK_TELEMETRY` default. Added `lib/telemetry.sh` to the `claude` target's `copyPaths` (and a matching `.gitignore` entry) — the one file the hook actually needs, not the whole `lib/` implementation directory.
- **`lib/telemetry.sh` emitted malformed JSON on every call using the default `meta` argument** — the unescaped `"${4:-{}}"` parameter expansion made bash treat the parameter as terminated at the first unescaped `}`, appending a stray `}` after every emitted line when an explicit `meta` arg was passed (e.g. `..."meta":{}}` instead of `..."meta":{}`); the reverse fix attempt (escaping the closing brace) broke the *no-argument* case instead, emitting a literal backslash. Fixed by wrapping the default in nested double quotes (`"${4:-"{}"}"`), which parses correctly in both cases. `scripts/benchmark.js`'s JSON parser silently dropped every malformed line, so `Total events` always read as if telemetry had recorded nothing. Pre-existing bug, surfaced by turning telemetry on by default (below) — previously only reachable by users who had opted in.

### Changed
- **Telemetry now ON by default** (`TEIKK_TELEMETRY` default flipped from `off` to `on`; disable with `TEIKK_TELEMETRY=off`) — framework-quality observability now works out of the box instead of requiring an env var most users would never discover. Still zero-leak (scalar `event`/`status`/`duration`/`meta` only) and still writes to a gitignored, project-local `.teikk/cache/telemetry/events.jsonl`.
- **`AGENTS.md` no longer copied by install**, for any target — the shipped file is this repo's own dev-facing routing doc (references "this repository", includes skill-authoring instructions) and was wrong content to drop into an installed project. `claude`/`cursor`/`antigravity` don't need it (they read `CLAUDE.md`/rules/workflows instead); `opencode` — the only target that relied on it for skill routing — now expects the user to supply their own project-specific `AGENTS.md` (see `docs/opencode-setup.md`). `docs/cursor-setup.md` and `docs/antigravity-setup.md`'s manual-copy instructions updated the same way. `commands/teikk-code-simplify.toml`'s "Read AGENTS.md" step (propagated to all 5 targets, including a now-stale `INTENTIONAL_DRIFT` hash in `validate-parity.js`) was the one command still assuming the file was always present — reworded to not assume any specific file exists.
- **`.claude-plugin/plugin.json` version synced** from stale `2.2.0` to `4.2.0` — Claude Code plugin installs read this field directly, so the stale value meant plugin-mode installs were reporting a version 2 major releases behind what `npm install`-based installs got.
- **Session-start injection trimmed from ~199 lines to ~29** (`hooks/session-start.sh` now injects the new `hooks/session-start-index.md` instead of the full skill — the `.sh` itself stays ~28 lines) — every new session previously had the full `using-agent-skills/SKILL.md` (Core Operating Behaviors, Failure Modes, Quick Reference table) injected as a fixed cost regardless of whether that session needed skill discovery. The trimmed index keeps only the discovery flowchart; the full skill is now read on-demand once a matching skill is identified, the same loading model every other skill in this repo already uses.
- **Three `alwaysApply: true` Cursor rules scoped down** (`code-review-and-quality.mdc`, `test-driven-development.mdc`, `incremental-implementation.mdc`) — these injected ~943 combined lines into every Cursor chat turn regardless of relevance. Now `alwaysApply: false` with `globs` matching source/test file patterns, consistent with how `android-stack.mdc`/`ios-stack.mdc`/`flutter-stack.mdc` were already scoped.
- **README.md, CLAUDE.md command counts** updated from 19/21 to 22 across all target descriptions.

### Docs
- **README restructured into a slim navigation hub** (409 → 117 lines) — the deep-dive sections were moved verbatim into dedicated `docs/` files and the README now links out to each: `docs/workflow.md` (which command when + all-commands table + AC→test traceability + QA), `docs/generated-files.md` (`.teikk/` layout + `todo.md` resume + `ultra` worktrees), `docs/diagnostics.md` (`/teikk-doctor` + `/teikk-machine-audit`), and `docs/framework-internals.md` (telemetry/benchmark, guardrails, failure recovery, CLIs).
- **New `docs/prompting-guide.md`** — best prompts per lifecycle phase (DEFINE→PLAN→BUILD→VERIFY→REVIEW→SHIP + QA). Each phase gives the context to provide, a copy-paste prompt template, and the anti-patterns to avoid.
- **Stale counts/versions corrected** across `docs/` — install pins bumped `v2.1.0`/`v2.2.0` → `v5.0.0`, Gemini "7 slash commands" → 23, and `getting-started.md`'s command/persona tables refreshed to the current 23-command / 7-persona set with links to the full lists.

## [5.0.0] — core/pack split

**BREAKING:** the flat top-level `skills/` and `agents/` directories are gone. Content is now tiered — `core/skills/` (22 platform-neutral skills, always installed) and `core/agents/` (7 platform-neutral personas), plus per-platform packs: `packs/android/` (8 skills + 2 personas: `android-performance-auditor`, `kotlin-specialist`), `packs/ios/` (1 persona: `swift-expert`), `packs/flutter/` (1 persona: `flutter-expert`). Install now copies `core/` plus only the pack matching `.teikk/spec/PROJECT.yaml`'s `platform:` field, merged flat into the project's `skills/` + `agents/` — a generic/no-platform project receives just the 22 core skills + 7 core personas, an Android project receives 30 skills + 9 personas. Major bump because a project that previously received every skill in the repo now receives only its own platform's subset. `git mv` preserved file history across all 46 renames.

### Added
- **`value-critic` persona (11th persona)** — a scope/over-engineering critic that asks "is this worth building?"; wired into `AGENTS.md`'s intent-map (Define + Review) and registered in `.claude-plugin/plugin.json`.
- **`lib/telemetry.sh` + `scripts/benchmark.js`** — an opt-in observability spine (env `TEIKK_TELEMETRY=on`, off by default so it's zero-overhead and privacy-safe by signature) plus a deterministic Framework Score benchmark (0.35·Quality + 0.30·Verification + 0.20·Efficiency + 0.15·ContextIntegrity). Documented in `references/observability-and-benchmark.md`.
- **`hooks/lifecycle-telemetry.sh`** — wires 5 real Claude Code lifecycle events (`TaskCreated`, `TaskCompleted`, `SubagentStart`, `SubagentStop`, `Stop`) into `hooks/hooks.json` to emit telemetry; off by default.
- **`scripts/decisions.js`** — a parser/query CLI over `.teikk/DECISIONS.md` (`list`/`find`/`count`/`--json`), so the decisions log is queryable instead of grep-only.
- **`scripts/build-registry.js` + `registry.json`** — a generated manifest of every skill/persona with version, platform, and depends-on frontmatter, giving the new core/pack inventory a machine-checkable source of truth.
- **Enforced guardrails (`hooks/guardrail-check.sh`, `hooks/pre-push.sh`, `hooks/GUARDRAILS.md`)** — governance checks now run pre-push instead of relying on review-time diligence alone.
- **Failure-recovery playbook (`references/failure-recovery.md`, `scripts/rollback.sh`)** — a documented rollback procedure backed by a safety-tested script, for when a workflow step needs to be undone cleanly.
- **ADR on subagent context budget (`references/adr-subagent-context-budget.md`)** — records the per-task context budget policy (no hard token cap), so the decision doesn't have to be re-litigated per task.
- **Parking-lot convention** — `planning-and-task-breakdown` gained a `.teikk/PARKING-LOT.md` step to capture and re-surface deferred scope instead of losing it once a task list closes.

### Changed
- **`validate-skills.js` dead cross-reference check promoted from warn to error** — a reference to a non-existent skill or persona now fails CI instead of only logging a warning.
- **`validate-parity.js` gained an `INTENTIONAL_DRIFT` allowlist** — silences known, deliberate target-content differences (13 warnings → 0), so genuine drift isn't buried in expected noise.
- **Conditional intent-map in `AGENTS.md`** — platform-specific routing now keys off `PROJECT.yaml`'s `platform:` field instead of assuming Android, matching the new core/pack split.

## [4.x] — automated releases

Cut automatically by the release automation above; no content changes beyond the commits each release targets.

- **[4.2.0]** — `uat`: pin install docs (README/CHANGELOG) to the current release line.
- **[4.1.0]** — `uat`: document branch-based release automation in the CHANGELOG.
- **[4.0.0]** — `main`: first automated release — branch-based CI grants `contents: write` to the release trigger workflows (fixes the `startup_failure` where a reusable workflow could not escalate past its read-only caller).

## [3.2.0] — 2026-07-17

Adds a lightweight task index (`.teikk/tasks/todo.md`) so `/teikk-build`, `/teikk-test`, `/teikk-review`, and `/teikk-ship` can resume work after context is cleared without re-reading the full `plan.md`.

### Added
- **`.teikk/tasks/todo.md` format defined** — `planning-and-task-breakdown`'s Step 6 specifies an exact, small format: one `[ ]`/`[~]`/`[x]` checkbox line per task (title matching the `## Task N:` heading in `plan.md`) plus a `**Current task:**` pointer at the top. This is the O(1) lookup a resuming session reads instead of scanning the full plan.
- **`/teikk-build` reads and writes the index** — at the start of every invocation it reads `**Current task:**` to resume the in-progress task (or picks the next `[ ]` one), flips the checkbox to `[~]` before coding, and to `[x]` + advances the pointer after the task's RED→GREEN→regression→build→commit cycle completes. Falls back to scanning `plan.md` directly if `todo.md` doesn't exist yet (older plans).
- **`/teikk-test`, `/teikk-review` read the index (read-only)** — both check `**Current task:**` to scope their work to the right `plan.md` section without re-scanning the whole file. Neither writes to `todo.md`.
- **`/teikk-ship` reads the index as a fast sanity check** — flags any remaining `[ ]`/`[~]` line before running the full checklist, so an unfinished plan doesn't silently produce a GO. This does not replace the SPEC↔Test traceability gate, which remains the authoritative pass/fail source.
- **`/teikk-planning` writes `todo.md` immediately after `plan.md`** — fully unchecked, one line per task.

### Changed
- **`incremental-implementation`, `test-driven-development`, `code-review-and-quality`, `shipping-and-launch` skills** gain sections/checklist items describing their role (read-write for build, read-only for test/review, sanity-check for ship) in the task-index workflow.
- **All 5 command targets in sync** — verified via `sync-targets.js` and `validate-parity.js`.

## [3.1.0] — 2026-07-17

Consolidates the Specify phase's output into one folder, adds a persistent decisions log, hard-gates unresolved spec questions, and folds routine logging into the build loop instead of a separate call.

### Added
- **`.teikk/spec/` folder** — `/teikk-spec` now writes `SPEC.md`, `PROJECT.yaml`, `QUICKSTART.md`, and `WORKFLOW.md` into one dedicated folder instead of loose at the `.teikk/` root. **Backward compatible:** every command that reads the spec checks `.teikk/spec/SPEC.md` first and falls back to the pre-3.1 `.teikk/SPEC.md` root path for older projects — no manual migration required.
- **`.teikk/DECISIONS.md`** — append-only log of significant, already-implemented decisions (architecture choices, hard-to-reverse trade-offs). Written only by `/teikk-docs` and the `/teikk-spec` architecture gate — never for routine implementation choices. Format defined in `documentation-and-adrs`'s new "Decisions Log" section.
- **Open Questions hard gate** — `/teikk-spec` will not save a spec while its `## Open Questions` section has any unresolved (`- [ ]`) line; unresolved items must be asked directly in-session (same pattern as `interview-me`) and marked resolved (`- [x] ... → resolution`) or explicitly deferred (`- [~] ... → deferred: reason`). `/teikk-planning` re-checks this gate before breaking the spec into tasks. `/teikk-doctor` reports any spec with unresolved items.
- **`logging.library` in `PROJECT.yaml`** — `/teikk-spec` records the project's logging library (Android: `timber`/`logcat`; iOS: `oslog`/`cocoalumberjack`; Flutter: `logger`/`logging`/`print`), platform-defaulted unless the spec says otherwise. `/teikk-android-setup`, `/teikk-ios-setup`, and `/teikk-flutter-setup` plant that library in Phase 0. `/teikk-doctor` checks it's set.
- **`/teikk-build` instruments logging inline** — every task now logs entry/error paths and captures exceptions with custom keys as part of GREEN, using `logging.library`, without a separate `/teikk-observability` call.

### Changed
- **`/teikk-observability` re-scoped to a retrofit/audit tool** — use it only to retrofit logging onto pre-existing code with none, add analytics/perf traces spanning more than one task, or set up telemetry outside a fresh Phase 0 pass. Routine per-task logging is now inline in `/teikk-build`.
- **`/teikk-doctor` grows to 10 checks** (from 8) — adds Open Questions resolution and Decisions log presence; PROJECT.yaml check now also verifies `logging.library`.
- **All 5 targets in sync** — Claude, Antigravity, OpenCode, Cursor, Gemini all updated and verified via `sync-targets.js` and `validate-parity.js`.

## [2.3.0] — 2026-07-06

New features for project guidance and test traceability — helps users navigate the workflow and ensures every acceptance criterion has a behavioral test.

### Added
- **`.teikk/WORKFLOW.md`** — Decision tree generated by `/teikk-spec`. Guides users: "Where are you now?" (have spec/plan/code) → "What command next?". One task at a time vs all tasks vs end-to-end modes, troubleshooting flow, pro tips.
- **`.teikk/PROJECT.yaml`** — Structured metadata (platform, domain, CI, E2E, budgets) generated by `/teikk-spec`, read by downstream commands (`/teikk-review`, `/teikk-ship`, `/teikk-androidperf`). Enables per-project customization without re-parsing SPEC prose.
- **`.teikk/QUICKSTART.md`** — First-run guide (write-once, explains workflow, what to commit, MCP setup).
- **`/teikk-doctor`** — Diagnostic command auditing project setup (8-point checklist: gitignore, manifest, spec, PROJECT.yaml, mobile-mcp, E2E tooling, tasks, git tree). Writes `.teikk/DOCTOR.md`.
- **`.teikk/SHIP-REPORT.md`** — Persistent ship record with traceability matrix, blockers, specialist reports, two-tier verdict. Useful as release artifact.
- **`/teikk-quick-implement`** — Chains build → test → review → ship in one session with automatic context compaction (33–56k tokens). For scoped tasks when context allows.
- **Test traceability enforcement in `/teikk-planning`** — Each AC must map to a behavioral test (not mock, not boilerplate, not label-only). Traceability checklist ensures tests exist before coding. `/teikk-ship` validates AC coverage; unproven AC = production blocker.

### Changed
- **CI checks now conditional** — `/teikk-ship` skips CI validation if `ci: none` in PROJECT.yaml. Supports multi-platform: github-actions, gitlab-ci, bitrise, circle-ci, fastlane, none.
- **All 5 targets in sync** — Commands updated for Claude, Antigravity, OpenCode, Cursor, Gemini (21 commands total).
- **README expanded** — New sections: End-to-end implementation (`/teikk-quick-implement`), Diagnostics troubleshooting group (doctor + machine-audit), Test Traceability (valid/invalid AC-to-test mappings), `.teikk/` file listing with descriptions.

## [2.2.0] — 2026-07-06

Installs are no longer symlinked through a shared global cache — every project now gets fully self-contained physical copies.

### Added
- **`machine-audit` skill (30th skill)** — a standalone, optional skill that diagnoses machine-level Claude Code configuration (`~/.claude/settings.json`, user-scope MCP servers, global hooks) when a session feels slow or expensive, so that cost/latency isn't misattributed to this package's own workflow. It ships with the package like every other skill but is intentionally **not** wired to any `/teikk-*` command, not part of the Define→Ship lifecycle, and not listed in `CLAUDE.md`'s Skills by Phase breakdown — it self-triggers only via its `description` when the user asks about cost/slowness.

### Changed
- **Global install cache removed.** Pre-3.0 versions synced package content into a single shared home-directory cache (`~/.teikk-agents-skills/`) and symlinked each project's files into it. Because that cache was shared machine-wide, running `install`/`update` in one project (possibly on a different package version) could silently change what every *other* project's symlinks resolved to. 3.0 eliminates this entirely: `init`/`update` copy files directly into the project, with no shared state and no cross-project conflict.
- **On-disk install shape changes from symlinks to real files.** `.cursor/`, `.claude/commands/`, `skills/`, `agents/`, `references/`, `.agents/`, `commands/`, `.gemini/`, and `AGENTS.md` are now physical copies. The two remaining symlinks (`.opencode/skills` → `../skills`, `.gemini/skills` → `../skills`) are project-local aliases only — they never point outside the project.
- **Install manifest (`.teikk-agents-skills.json`) gains a `files` array** — every relative path the CLI has copied into the project. This is how `update` knows which files it's safe to refresh and `uninstall` knows exactly what to remove, without touching anything the manifest doesn't list.
- **Stale file cleanup on `update`.** If a future package version stops shipping a file this tool previously copied in, the next `update` now deletes that orphaned copy (and prunes any directory left empty) instead of leaving it behind forever.
- **Automatic one-time migration.** Running `update` on an existing 1.x or 2.x install detects the old symlinks (pointing into the legacy global cache) and transparently replaces them with real files — no manual cleanup required.
- **Gemini target simplified** — `.gemini/skills` now uses the same `copyPaths`/`symlinks` pattern as OpenCode instead of a hand-rolled special case.

## [2.1.0] — 2026-07-06

### Added
- **`/teikk-qa` command** — an optional, opt-in deep-QA pass that runs E2E journeys **then** exhaustive UI/UX testing and merges one QA verdict. Args: `e2e` | `ux` | a flow name. Synced across all 5 targets (19 commands total).
- **Architecture gate in `spec-driven-development`** — for a new project (or any feature with no architecture to inherit), the DEFINE phase now stops and presents the human 2–3 viable architectures with trade-offs and a marked recommendation, and refuses to write the spec's Architecture section (or any code) until the human confirms. Rejected alternatives are recorded so the decision is traceable into the plan's `## Architecture Decisions` and ADRs. Prevents the agent from silently defaulting to an architecture.
- **`adversarial-reviewer` persona (10th persona)** — a disconfirming red-team reviewer whose only job is to falsify each acceptance criterion and find ≥1 Critical; it is banned from approving (verdict is only REFUTED / UNREFUTED-with-attack-log). Wired as a **mandatory** pass in `/teikk-review` and as the 5th fan-out persona in `/teikk-ship`. Gate verdicts are now the **AND** of the constructive personas and the adversarial pass — builder consensus no longer ships a plausible-but-wrong change.
- **`references/domain-guardrails.md`** — a generic, method-based framework that makes review domain-aware: detect the SPEC `Domain:`, derive that domain's non-negotiable invariants (banned types, required boundary tests, regulatory constraints), fetching authoritative sources via `source-driven-development` when unsure. Ships a fully worked **finance** example (money must be `Long` minor-units/`BigDecimal`, never `Double`; rounding + timezone tests required). Loaded by `code-review-and-quality`, `security-and-hardening`, and the reviewer personas.
- **SPEC→Test traceability as a hard gate** — the SPEC gains a Traceability Matrix (every acceptance criterion → ≥1 *behavioral* test), and `/teikk-ship` enforces it: an AC with no behavioral test (mock-only, boilerplate, or label-only don't count) is a blocker. "PARTIAL counts as pass" is removed.
- **Two-tier ship verdict** — `/teikk-ship` now distinguishes **GO (production)** vs **GO (demo/portfolio)** vs **NO-GO**, and enumerates explicit **production blockers** (money-as-Double, `exportSchema=false` + no `Migration`, unproven ACs) even when granting a demo GO.

### Changed
- **`test-engineer` judges tests by bug-catching, not counting** — the persona now disqualifies boilerplate template tests (`ExampleUnitTest`), mock-verification tests (mocking the unit under test), and assertion-less/label-only tests from coverage, and requires ≥1 real-infrastructure (Room in-memory) DAO test for the data layer.
- **E2E (`android-e2e-maestro`) must assert values, not just labels** — flows now assert the dynamic value the user entered and any derived total, and persistence ACs require a `clearState: false` relaunch flow. Label-only flows are a red flag.
- **`spec-driven-development` adds a `Domain:` field**; `test-driven-development` defines what counts as a "behavioral test"; `planning-and-task-breakdown` maps each AC to a named behavioral test; `android-data-and-concurrency-kotlin` and `shipping-and-launch` add Room data-layer guardrails (`exportSchema`/migration, money type) and a boilerplate-deletion reminder.
- **E2E and UI/UX testing pulled out of the `VERIFY` phase** into a separate optional **QA** phase, because both can run for minutes on a device/emulator. `VERIFY` is now the fast TDD loop only (`/teikk-test`). `/teikk-e2e` and `/teikk-ux-test` still exist and are unchanged in behavior — they now carry an explicit "optional, slow, not the core loop" note and are grouped under `/teikk-qa`. Docs (README, CLAUDE.md, AGENTS.md) updated to reflect the new taxonomy.
- **Remaining `docs/` workflow output moved under `.teikk/`** — `idea-refine` now writes `.teikk/ideas/` (was `docs/ideas/`), `documentation-and-adrs` writes ADRs to `.teikk/adr/` (was `docs/decisions/`), and `interview-me` writes `.teikk/intent/` (was `docs/intent/`). Workflows no longer create a `docs/` directory in your project; everything a workflow generates now lives under the single gitignored `.teikk/`.

## [2.0.0] — 2026-07-05

Major release: multi-target parity, a single `.teikk/` output directory, and a non-destructive install model.

### Added
- **`.teikk/` output directory** — every workflow now writes under one project-local `.teikk/` folder (`SPEC.md`, `spec/`, `tasks/`, `maestro/flows/`, `cache/`). One gitignored line covers all of it; nothing is scattered across the repo.
- **Non-destructive, additive install** — symlinks land *beside* your own files. `init claude` links only `.claude/commands/`, so an existing `.claude/settings.local.json` or your own slash commands are never deleted. When a real directory collides with ours, we merge (link children individually); a conflicting real file is skipped and reported, never overwritten.
- **Legacy 1.x upgrade guard** — an in-place `update` from 1.x automatically drops the old whole-`.claude/` symlink before re-linking `.claude/commands/`, so no writes leak through into the global store.
- **mobile-mcp for UI/UX testing** — `/teikk-ux-test` and the `ui-ux-tester` persona now drive real iOS/Android apps via [mobile-mcp](https://github.com/mobile-next/mobile-mcp) (simulator, emulator, or physical device). A browser-automation MCP remains the web fallback.
- **CI parity guards** — `scripts/validate-parity.js` (every target ships the same commands; every persona is registered) and `scripts/sync-targets.js` (Cursor + Gemini content regenerated from the canonical `commands/*.toml`).
- **Install regression tests** — additive (user config survives install *and* uninstall) and legacy-upgrade migration coverage in `scripts/test-install.js`.
- **This CHANGELOG.**

### Changed
- **Install footprint for the `claude` target**: `.claude/` (whole directory) → **`.claude/commands/`** only. Hooks continue to live in top-level `hooks/`.
- **Hook caches** moved out of `.claude/` into `.teikk/cache/` (`sdd`, `simplify-ignore`) — they no longer travel through the global symlink, so caches stay per-project instead of leaking across every project.
- **All 9 personas** are now registered in `.claude-plugin/plugin.json` (previously 4).
- **Command parity** — all 18 commands ship across all 5 targets (Claude, Antigravity, OpenCode, Cursor, Gemini); Cursor and Gemini were previously missing 3 commands and had stale content.
- **`uninstall`** now removes only the symlinks it created and prunes empty directories — it never deletes user-owned files.
- **Managed `.gitignore` block** simplified: a single `.teikk/` entry replaces the old per-artifact list.
- **Documentation** rewritten to match the new model (`.teikk/`, `.claude/commands/`, additive install) and corrected: install table, gitignore example, generated-files guide, and the `.agents/` rules count (3 → 6).

### Migration from 1.x
- Run `npx teikk-agents-skills update <target>` — the legacy `.claude/` symlink is migrated automatically.
- New workflow output goes to `.teikk/`. Existing root-level `SPEC.md` / `tasks/` still work: `/teikk-build` reads them as a legacy fallback.
- mobile-mcp is optional — install it only when running mobile UI/UX tests:
  `claude mcp add mobile-mcp -- npx -y @mobilenext/mobile-mcp@latest`

## [1.5.0] — 2026-07-04
- Global directory storage: skills/agents/references stored in `~/.teikk-agents-skills/` and symlinked into projects.

## [1.4.0]
- Added the Maestro E2E skill and the `/teikk-e2e` command.

## [1.3.0]
- Wired the Android stack into the spec → plan → build → ship workflow.

[5.0.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v5.0.0
[2.3.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.3.0
[2.2.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.2.0
[2.1.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.1.0
[2.0.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.0.0
[1.5.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.5.0
[1.4.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.4.0
[1.3.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.3.0
