# Lifecycle Telemetry Hooks

Fills the audit's hook-lifecycle gap (before-task / before-spawn / after-spawn / before-finish / summary) by wiring the framework to the lifecycle events Claude Code **actually fires**, instead of inventing event names that never trigger.

## Mapping (abstract stage → real Claude Code event)

| Audit stage | Claude Code event | Telemetry emitted |
|-------------|-------------------|-------------------|
| before-task | `TaskCreated` | `task_started` |
| (task done) | `TaskCompleted` | `task_completed` |
| before-spawn | `SubagentStart` | `subagent_spawned` |
| after-spawn | `SubagentStop` | `subagent_stopped` |
| before-finish / summary | `Stop` | `turn_finished` |

All five are wired in `hooks/hooks.json` to `hooks/lifecycle-telemetry.sh <EventName>`, alongside the pre-existing `SessionStart` and `PreCompact` hooks.

## Setup

`hooks/hooks.json` uses `${CLAUDE_PLUGIN_ROOT}`, which Claude Code only resolves for a plugin-marketplace install (`/plugin install`). For the standard `npm install` + `npx teikk-agents-skills init claude` path, `init`/`update` **automatically** merge all 7 of these hooks into the project's own `.claude/settings.json`, rewritten to use `${CLAUDE_PROJECT_DIR}` instead — no manual step needed. The merge is additive: your own hooks and settings are left as-is, and `uninstall` removes only the entries it added (tracked in `.teikk-agents-skills.json`'s `claudeHooks` list). See `lib/claude-hooks.js`.

If you installed by cloning the repo manually (not via `npx teikk-agents-skills init`), copy `hooks/hooks.json`'s `hooks` object into your own `.claude/settings.json` by hand, replacing `${CLAUDE_PLUGIN_ROOT}` with `${CLAUDE_PROJECT_DIR}`.

**`.claude/settings.json` is NOT gitignored** — unlike `hooks/`, `lib/telemetry.sh`, and everything else this package installs, Claude Code settings are meant to be team-shared config, so `init`/`update` never adds it to the managed `.gitignore` block. If you commit it (recommended, so the whole team gets the same hooks), be aware every wired command is wrapped in an existence guard (`[ -f "${CLAUDE_PROJECT_DIR}/hooks/<script>" ] && ... || true`) specifically so a teammate who pulls the committed `settings.json` before running `npx teikk-agents-skills init claude` themselves doesn't hit a "file not found" error — the hook just silently no-ops until they run `init`/`update` and get `hooks/`, `lib/telemetry.sh`, and `scripts/` on disk too.

## Behavior

- **Observational only.** These hooks record telemetry; they never block a tool call, spawn, or turn, and never talk to the model. They always exit 0.
- **On by default.** `lifecycle-telemetry.sh` sources `lib/telemetry.sh`, which appends events unless `TEIKK_TELEMETRY=off`. With telemetry disabled, each hook is a single guarded return — no file, no cost.
- **Feeds the benchmark.** The recorded events (`task_started`, `task_completed`, `subagent_spawned`, `turn_finished`, …) are exactly what `scripts/benchmark.js` reads to compute the Framework Score offline. The hooks are the *collection* half; the benchmark is the *analysis* half.

## Why Claude-only is acceptable here

These hooks use `${CLAUDE_PLUGIN_ROOT}` and Claude Code's event names, so they are Claude-Code-specific. That is fine for this layer: telemetry collection is best-effort and optional, and the *analysis* half (`scripts/benchmark.js`) is a plain Node CLI that runs anywhere against any `events.jsonl`. A different harness can emit the same JSONL via `lib/telemetry.sh` from its own hook system and get an identical benchmark — the storage format and analyzer are portable even though this particular wiring is not.
