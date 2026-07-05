# Changelog

All notable changes to **teikk-agents-skills** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); this project adheres to [Semantic Versioning](https://semver.org/).

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

[2.0.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v2.0.0
[1.5.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.5.0
[1.4.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.4.0
[1.3.0]: https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/releases/tag/v1.3.0
