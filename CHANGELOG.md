# Changelog

All notable changes to **teikk-agents-skills** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); this project adheres to [Semantic Versioning](https://semver.org/).

## Release automation

Releases are cut automatically by GitHub Actions from branch pushes — no manual tagging. The version source of truth is the latest repo-wide `v*` git tag (both branches share one monotonic counter); `package.json` is never bumped.

- **Push/merge to `main`** → **major** bump (e.g. `3.2.0` → `4.0.0`).
- **Push/merge to `uat`** → **minor** bump (e.g. `4.0.0` → `4.1.0`).

Each run computes the next tag, then publishes a git tag + GitHub Release (`--generate-notes`) targeting that commit. A commit already carrying an exact `v*` tag is skipped, so re-runs never duplicate a release. Install a specific release with `npm install github:22Teikk/22Teikk-Agent-Skills-Hub#vX.Y.Z`.

## [Unreleased]

Workflow-hub review pass: fixes a broken command reference, closes model-tiering and token-cost gaps, and adds compaction resilience. No breaking changes — all additions are opt-in or non-blocking.

### Changed
- **`model_tiers` defaults shipped in `PROJECT.yaml`** — the YAML template in `commands/teikk-spec.toml` now writes a populated `model_tiers` block (previously blank — every call silently fell back to session default and erased the tiering signal). Persona + subagent self-classification into `low`/`medium`/`high`/`ultra` now maps to a concrete model per tier. Users can override any value by editing `.teikk/spec/PROJECT.yaml` directly. The `ultra` tier maps to the highest-capability Claude model in the current catalog (`fable`) — used by `adversarial-reviewer` when self-classifying `ultra` for diffs with multiple competing failure hypotheses, and by `security-auditor` for auth/payment/data-boundary code.
- **Strict no-hardcode rule for model names** — model names live ONLY in `.teikk/spec/PROJECT.yaml` (the user's file). Framework files (skills, commands, agents, README) reference the concept ("defaults ship in PROJECT.yaml") but do NOT list concrete model names. `commands/teikk-spec.toml`'s explanatory paragraph, all 4 generated target command files, and `core/agents/README.md` were updated to use abstract language; the YAML template that produces `PROJECT.yaml` is the single source of model names in the framework.

### Added
- **Auto-triggered research inline in `spec-driven-development` and `planning-and-task-breakdown`** — both skills gained a "Research — auto-triggered inline" section that fires the Claude Code built-in `Explore` subagent (Haiku, read-only — Pattern 5 in `references/orchestration-patterns.md`) when the spec writer or planner encounters an unfamiliar tech stack, a high-stakes domain (`finance`/`health`/`auth`), or an architecture menu with >1 viable option whose trade-offs aren't obvious from context. Triggers only when actually needed (skipped for inherited codebases, local-scope changes, small bug fixes, and the same-question-twice anti-pattern); never spins up a separate "research phase". Citations land in the spec/plan body next to the decisions they support — not in a side appendix that nobody reads.
- **`hooks/emit.sh` bash wrapper for command-side telemetry** — commands (or any bash caller) can now emit framework-level events that the Claude Code hook surface cannot: `verification_passed`/`verification_failed` (after test runs), `duplicate_detected` (when `/teikk-ship` flags repeated findings), `decision_created`/`decision_reused` (when `.teikk/DECISIONS.md` is appended to or referenced). The wrapper resolves the project root, sources `lib/telemetry.sh`, and fails open — never blocks the agent. Closes the gap where the docs listed 5 high-signal events but no caller could actually emit them.
- **`PreCompact` → `context_reset` rename in `hooks/lifecycle-telemetry.sh`** — the hook now emits the documented `context_reset` event (instead of `pre_compact`) because that is the only observable signal that the context window is about to be reset (Claude Code has no `PostCompact` event). `context_reset` count is now the offline proxy for "how often does this session approach its context limit," matching the metric described in `references/observability-and-benchmark.md`.
- **`/teikk-test` optional `test-engineer` sub-agent audit** — added an "Audit" section to `commands/teikk-test.toml` (and all 4 generated targets) that recommends spawning the `test-engineer` persona as a sub-agent (Pattern 1 — direct invocation, single perspective) at the end of the test phase, when the change touches auth/payments/data/config or test count is high. Uses the same `test-engineer` persona `/teikk-ship` runs in its fan-out, so the audit criteria do not drift between the test and ship phases. The audit returns a one-line verdict (`PASS` / `has-gaps: <file list>`) so the main agent's context stays uncluttered. Optional `hooks/emit.sh` telemetry call at the end feeds `verification_passed`/`verification_failed` into the offline Framework Score.
- **`/teikk-build` + `/teikk-ship` telemetry wiring** — both commands now document the optional `hooks/emit.sh` pattern at the natural emit points (per-task verification in `/teikk-build`, verdict + duplicate-detection in `/teikk-ship`). Triggered only when `TEIKK_TELEMETRY=on`; wrapper fails open so it never blocks the agent. Closes the loop between the docs (which listed 5 high-signal events) and the actual emit points in the workflow.
- **`/teikk-machine-audit` command (22nd command)** — the `machine-audit` skill existed standalone since v2.2.0 but was never wired to a command in any of the 5 targets, despite README referencing `/teikk-machine-audit` 4 times including in the primary troubleshooting flow. Added for Claude, Antigravity, OpenCode, Cursor, and Gemini; parity-verified via `validate-parity.js`.
- **`model_tiers` field in `PROJECT.yaml`** (optional, blank by default) — personas and subagent calls self-classify their own task complexity as `low`/`medium`/`high`/`ultra` (see `agents/README.md`'s new "Model tiering" section) and look up a concrete model name per tier here if the harness supports per-call model selection. No model name is hardcoded into any skill, persona, or command — this repo targets 5 harnesses with different model catalogs, so the only place a model name should ever live is this project-local, user-filled field. All 10 personas in `agents/` gained a "Model tier" line in their Composition block stating their typical tier and when to escalate.
- **PreCompact hook (`hooks/pre-compact-checkpoint.sh`)** — writes a small deterministic checkpoint (`.teikk/cache/compact-checkpoint.md`: current task pointer from `todo.md`, git branch, working-tree change count, timestamp) right before Claude Code compacts conversation history. Reduces post-compaction hallucination of task state (e.g. "I think I was on Task 3") by giving a resumed session a disk-backed snapshot instead of relying solely on the auto-generated summary. Documented in `hooks/PRE-COMPACT-CHECKPOINT.md`.
- **`/teikk-ship` writes persona reports to disk incrementally** — each of the five fan-out personas' full report is appended to `.teikk/cache/ship-reports.md` as soon as it lands, instead of held in the live conversation until Phase D. Cuts context held during the merge phase to one-line summaries per persona, and survives a compaction event landing mid-fan-out (the longest-running phase in the workflow) without losing already-completed reports.
- **`/teikk-review` adversarial-pass threshold** — applies the same lightweight-change threshold `/teikk-ship` already used to skip its fan-out (≤2 files, <50 lines, no auth/payments/data/config touch): below it, `/teikk-review` skips its own adversarial pass and says so explicitly in the output. This is a review-time convenience only — `/teikk-ship`'s adversarial pass remains unconditional and always re-runs before any GO, so the end-to-end gate is unweakened.
- **`validate-parity.js` content-drift warning (non-blocking)** — hashes `.claude/commands/*.md` against `.agents/workflows/*.md` for every shared command name and warns (does not fail CI) when they differ, since Cursor/Gemini are already mechanically kept in sync by `sync-targets.js` but Claude/Antigravity have always been hand-maintained with no drift signal.
- **Release CI warns on `plugin.json` version drift (non-blocking)** — `.github/workflows/release.yml` now checks `.claude-plugin/plugin.json`'s `version` field against the newly published tag after each release and emits a GitHub Actions warning annotation (not a failure) if they've diverged, since that field is hand-maintained and had silently drifted two major versions behind (`2.2.0` while the repo was on `4.2.0`).

### Changed
- **`.claude-plugin/plugin.json` version synced** from stale `2.2.0` to `4.2.0` — Claude Code plugin installs read this field directly, so the stale value meant plugin-mode installs were reporting a version 2 major releases behind what `npm install`-based installs got.
- **Session-start injection trimmed from ~199 lines to ~29** (`hooks/session-start.sh` now injects the new `hooks/session-start-index.md` instead of the full skill — the `.sh` itself stays ~28 lines) — every new session previously had the full `using-agent-skills/SKILL.md` (Core Operating Behaviors, Failure Modes, Quick Reference table) injected as a fixed cost regardless of whether that session needed skill discovery. The trimmed index keeps only the discovery flowchart; the full skill is now read on-demand once a matching skill is identified, the same loading model every other skill in this repo already uses.
- **Three `alwaysApply: true` Cursor rules scoped down** (`code-review-and-quality.mdc`, `test-driven-development.mdc`, `incremental-implementation.mdc`) — these injected ~943 combined lines into every Cursor chat turn regardless of relevance. Now `alwaysApply: false` with `globs` matching source/test file patterns, consistent with how `android-stack.mdc`/`ios-stack.mdc`/`flutter-stack.mdc` were already scoped.
- **README.md, CLAUDE.md command counts** updated from 19/21 to 22 across all target descriptions.

### Changed (skill audit)
- **`ci-cd-and-automation` skill token split (362 → 208 lines, –43%)** — six copy-paste-ready GitHub Actions YAML blocks (basic CI, integration tests, E2E, preview deploy, rollback, dependabot) plus the caching+parallelism example and the Kotlin Remote Config flag pattern lifted to a new `references/ci-templates.md` appendix. The skill now owns the *decisions* (which gates, in what order, why each matters); the appendix owns the *YAML*. Read the appendix on-demand when actually wiring up a workflow — don't load ~150 lines of YAML into context just to skim them. The skill is loaded transitively by every `/teikk-build` and `/teikk-ship`; this is one of the highest-frequency skills in the pack, so the per-load saving compounds across sessions.
- **`doubt-driven-development` cross-model CLI section lifted to `references/cross-model-cli.md`** (~54 → ~29 lines in skill, –24 net) — the platform-version-specific CLI invocation syntax (Codex `--sandbox read-only`, Gemini `--approval-mode plan`, stdin-vs-shell-quoting pattern, pre-flight checks) moved out of the always-loaded skill into an appendix read on-demand when actually invoking a cross-model CLI. The skill now owns only the *decision rules* (always offer in interactive, always announce skip in non-interactive, never silently fall back); the appendix owns the *invocation mechanics*.
- **Five longest skill descriptions trimmed to ≤290 chars** (`machine-audit` 507 → 238, `interview-me` 485 → 286, `doubt-driven-development` 339 → 284, `idea-refine` 335 → 247, `flutter-di-and-build` 301 → 216) — descriptions are loaded once per session for skill discovery; trimming the worst offenders cuts ~175 tokens per discovery pass across all 38 skills. Trigger contexts preserved; only verbose prose removed.

## [Unreleased] — context-window optimization

Two follow-on commits to the workflow-hub review pass above. Both reduce per-invocation context cost in target projects (where the savings compound across every session) with no behavior change. Additive — users on prior versions keep working unchanged.

### Changed
- **Stop shipping `AGENTS.md` to target projects** — `lib/targets.js` no longer copies `AGENTS.md` to any of the 5 targets (was previously in `copyPaths` for `cursor`, `claude`, `antigravity`, `opencode`). The file cost ~5K tokens of always-on context loaded into every session regardless of whether the project needed skill routing. Skill routing in target projects now happens via: explicit slash commands (`/teikk-spec`, `/teikk-build`, …), skill frontmatter descriptions (LLM-driven fallback), or the opt-in `using-agent-skills` meta-skill. `AGENTS.md` remains in the hub repo for contributors with a new scope disclaimer at the top, and OpenCode users who want the implicit intent-routing pattern can still copy it manually (it is the only target where slash commands are not natively supported). Removed `scripts/test-install.js`'s v2→v3 symlink migration assertion for `AGENTS.md` since there is nothing to migrate from anymore. Net: -1021 lines across 61 files; -5K tokens/session always-on cost removed.

- **Trim duplicated content in 7 slash commands** — canonical TOML commands shrunk by replacing duplicated boilerplate with pointers to the canonical skill. `/teikk-build` 99→23 lines (-77%), `/teikk-ship` 94→51 (-46%), `/teikk-spec` 88→56 (-36%), `/teikk-e2e` 49→27 (-45%), `/teikk-test` 44→31 (-30%), `/teikk-planning` 43→28 (-35%), `/teikk-qa` 36→29 (-19%). The trimmed copy no longer has its own RED→GREEN list, skill-routing table, or Phase B checklist — those live once in the corresponding skill (`incremental-implementation`, `code-review-and-quality`, `spec-driven-development`, `android-e2e-maestro`, etc.) and load only when the slash command invokes them. 4 platform variants per command stay mechanically in sync via `sync-targets.js`. Net: ~1.4K lines removed from the canonical command set; compounds across every session that runs any of the seven.

- **`@references/` convention: asymmetric use across slash-command vs skill/persona bodies** — empirically established after two rounds of runtime verification. The `@` prefix is **NOT** a Claude Code native lazy-load syntax; it's a *hint marker* that signals to the model "this path is a logical reference, not a literal Read target." Path resolution context differs by where the prose lives:

  - **Slash-command bodies** (`.claude/commands/*.md`, `.agents/workflows/*.md`, `.cursor/commands/*.md`, `.gemini/commands/*.toml`, generated from canonical `commands/*.toml`) execute at the user's CWD (= project root). A bare `Read references/domain-guardrails.md` resolves correctly because the model Read-tool calls from project root. **No `@` prefix needed** — leaving it as prose keeps the body cleaner.

  - **Skill bodies** (`core/skills/*/SKILL.md`, `packs/*/skills/*/SKILL.md`) and **persona bodies** (`core/agents/*.md`) execute via the Skill/Task tool, which resolves paths relative to the invoking file's own directory. A bare `Read references/X.md` here resolves to `skills/<name>/references/X.md`, which doesn't exist. The model then has to broaden the search to find the file at project root — but if the path *looks valid*, models (especially smaller ones like Haiku) often give up after one retry.

    The `@` prefix breaks that "looks valid" failure mode: when the model passes literal `@references/X.md` to Read, the obvious `File does not exist` error prompts a broader find/ls that locates the file at `<project_root>/references/X.md`. Verified empirically: prose-path skill bodies fail, `@`-prefixed ones recover after one bash.

    So the convention is now: **skill/persona bodies use `Read @references/X.md`** (35 instances across 16 SKILL.md files + 3 persona files); **slash-command bodies use `Read references/X.md`** (prose, since CWD resolution already works). 3 sibling-file uses of `@<file>.md` in `idea-refine` (`@frameworks.md`, `@refinement-criteria.md`, `@examples.md` — annotated "(in this skill directory)") remain as proper relative paths because they resolve relative to the skill file's own directory without ambiguity.

  **Lesson logged in memory**: future path-syntax experiments need a runtime test before claiming a token-saving or reliability effect.

- **Net**: -1017 lines across 61 files (trim only). The trim alone removes ~1.4K lines and reduces per-invocation context cost by removing duplicated RED→GREEN lists, routing tables, and Phase B checklists from slash commands; the @-syntax part contributed zero measured token savings and was reverted.

### Verification
- `sync-targets.js`: 0 drift.
- `validate-parity.js`: 0 errors.
- `test-install.js`: 5/5 passed.
- Runtime tests in fresh target projects (3 controlled tests + `/teikk-review` end-to-end):
  - `/teikk-review` PASS — slash command body prose `Read references/domain-guardrails.md` resolves from CWD; skill body `@references/domain-guardrails.md` recovers after one bash; persona `code-reviewer` loads via Skill tool by name.
  - v2 (skill body, prose, no `@`) FAIL — model gives up after one retry.
  - v3 (skill body, with `@`) PASS — recovers after one bash.
  - Slash-command body (prose, no `@`) PASS — first try.
- Working tree: clean (0 uncommitted files).

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

[2.3.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.3.0
[2.2.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.2.0
[2.1.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.1.0
[2.0.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.0.0
[1.5.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.5.0
[1.4.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.4.0
[1.3.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.3.0
