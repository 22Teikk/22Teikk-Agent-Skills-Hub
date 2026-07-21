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

## Behavior

- **Observational only.** These hooks record telemetry; they never block a tool call, spawn, or turn, and never talk to the model. They always exit 0.
- **Off by default.** `lifecycle-telemetry.sh` sources `lib/telemetry.sh`, which no-ops unless `TEIKK_TELEMETRY=on`. With telemetry off, each hook is a single guarded return — no file, no cost.
- **Feeds the benchmark.** When enabled, the recorded events (`task_started`, `task_completed`, `subagent_spawned`, `turn_finished`, …) are exactly what `scripts/benchmark.js` reads to compute the Framework Score offline. The hooks are the *collection* half; the benchmark is the *analysis* half.

## Why Claude-only is acceptable here

These hooks use `${CLAUDE_PLUGIN_ROOT}` and Claude Code's event names, so they are Claude-Code-specific. That is fine for this layer: telemetry collection is best-effort and optional, and the *analysis* half (`scripts/benchmark.js`) is a plain Node CLI that runs anywhere against any `events.jsonl`. A different harness can emit the same JSONL via `lib/telemetry.sh` from its own hook system and get an identical benchmark — the storage format and analyzer are portable even though this particular wiring is not.
