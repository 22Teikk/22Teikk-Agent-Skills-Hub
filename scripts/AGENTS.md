# scripts/ — Validation Gates & Generators

Two kinds of scripts live here, and the split matters: **shipped-to-consumers** vs **maintainer/CI-only**. Parent: [../AGENTS.md](../AGENTS.md).

## Shipped vs Maintainer

| Shipped (in `SHARED_SCRIPTS`, copied to projects) | Maintainer/CI only (never shipped) |
|---|---|
| `benchmark.js` — framework score from telemetry JSONL | `validate-skills.js`, `validate-parity.js` |
| `decisions.js` — query `.teikk/DECISIONS.md` | `sync-targets.js`, `build-registry.js` |
| `rollback.sh` — safe git rollback (dry-run default) | `test-install.js`, `postinstall.js` |

Adding a shipped script means editing `lib/targets.js` `SHARED_SCRIPTS` too, else it won't install.

## The `npm test` Gate (run in order, first failure stops)

1. `validate-skills.js` — every SKILL.md: frontmatter (`name` matches dir, `description` ≤1024), required sections (`## Overview/When to Use/Common Rationalizations/Red Flags/Verification`), live cross-refs. Exempt: `using-agent-skills`, `idea-refine`.
2. `validate-parity.js` — same command set across all 5 targets; every persona registered in `.claude-plugin/plugin.json`.
3. `sync-targets.js` — regenerates target commands from `commands/*.toml`; **check mode exits 1 on drift**.
4. `build-registry.js` — regenerates `registry.json`; check mode exits 1 on drift.
5. `test-install.js` (539 LOC) — installer smoke test on temp dirs (`fs.mkdtempSync`): init/additive/legacy-migration/stale-cleanup/hook-wiring/shared-scripts.

There are **no unit tests / no Jest**; these structural validators ARE the test suite.

## Single-Source Generation (critical)

`commands/*.toml` is canonical. `sync-targets.js --write` generates `.claude/commands/*.md`, `.cursor/commands/*.md`, `.agents/workflows/*.md`, `.gemini/commands/*.toml`. **Never hand-edit generated files** — fix the TOML, run `npm run sync`. Per-target phrasing: `<!-- @override:claude,cursor -->text<!-- @end -->` replaces the preceding line for the named targets only.

## Gotchas

- After ANY command/skill/persona change: `npm run sync` then commit the regenerated `.claude/` `.cursor/` `.agents/` `.gemini/` + `registry.json`, or CI parity fails.
- `postinstall.js` auto-runs `init` only when `TEIKK_AGENTS_SKILLS_TARGET` env or `package.json.teikk-agents-skills.target` is set; CI sets `TEIKK_AGENTS_SKILLS_SKIP_POSTINSTALL=1`.
- `rollback.sh` is destructive but safe-by-default: refuses to discard uncommitted work without `--force`; always `--dry-run` first.
