# Changelog

All notable changes to **teikk-agents-skills** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); this project adheres to [Semantic Versioning](https://semver.org/).

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

[2.1.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.1.0
[2.0.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.0.0
[1.5.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.5.0
[1.4.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.4.0
[1.3.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.3.0
