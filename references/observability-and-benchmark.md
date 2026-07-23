# Observability & Benchmark (framework-level)

A minimal, on-by-default way to measure the *framework's own* quality — not the user's app. Built to a hard constraint: **zero runtime AI, zero prompt injection, zero context overhead, offline benchmark, deterministic score, fully disable-able by config.**

The framework has no runtime daemon — it is markdown + scripts an agent reads. So telemetry cannot live in the prompt. It lives at the only two non-AI touchpoints: **hook scripts** (bash, run outside the model context) and **CLI/CI** (`scripts/`). That is what makes it zero-token and zero-context.

## Components

| Piece | File | Role |
|-------|------|------|
| Emitter | `lib/telemetry.sh` | One-line JSONL append. ON unless `TEIKK_TELEMETRY=off`. Copied into your project alongside `hooks/`. |
| Storage | `.teikk/cache/telemetry/events.jsonl` | Append-only JSONL, never leaves the project, gitignored. |
| Benchmark | `scripts/benchmark.js` | Offline: reads events, computes metrics + Framework Score, renders dashboard. Copied into your project — run it in place, no clone needed. |

## Telemetry (on by default, privacy-safe by construction)

```bash
source lib/telemetry.sh
teikk_emit <event> [status] [duration_ms] [meta_json]
```

- **ON by default.** `teikk_emit` appends events unless `TEIKK_TELEMETRY=off`, in which case it returns immediately — true zero overhead.
- **Cannot leak.** The function accepts only scalar `event/status/duration/meta`. It has no parameter for prompt, context, or reasoning — the privacy guarantee is the function signature, not a policy.
- **Fail-open.** A missing dir, missing `date`, or write error never blocks the agent — it silently no-ops.
- **Already wired for you (Claude Code).** `npx teikk-agents-skills init claude` auto-merges the 7 lifecycle hooks that call `teikk_emit` into your project's `.claude/settings.json` — see `hooks/LIFECYCLE-TELEMETRY.md`. Nothing to configure to start collecting; set `TEIKK_TELEMETRY=off` to opt out.

High-signal events only: `session_started`, `context_reset`, `task_started`, `task_completed`, `verification_passed`, `verification_failed`, `duplicate_detected`, `decision_created`, `decision_reused`. Never log prompts, context, or chain-of-thought.

## Benchmark & dashboard (offline, deterministic)

Run directly from your project root — `scripts/benchmark.js` is copied in at install time, no clone required:

```bash
node scripts/benchmark.js                                   # dashboard from .teikk/cache/telemetry/events.jsonl
node scripts/benchmark.js --out REPORT.md                    # write a Markdown dashboard
node scripts/benchmark.js --json --out score.json            # machine-readable score + metrics
node scripts/benchmark.js --baseline prev-score.json          # show delta vs a previous release
```

Runs offline / per-release — never in a user's runtime. Every number is derived from recorded events; there is **no AI evaluation** anywhere in the path, so the same events always produce the same score.

## Framework Score (deterministic, version-comparable)

```
score = 0.35·Quality + 0.30·Verification + 0.20·Efficiency + 0.15·ContextIntegrity
```

| Component | From |
|-----------|------|
| Quality | task success rate (`task_completed / task_started`) |
| Verification | verification pass rate (`passed / (passed+failed)`) |
| Efficiency | 1 − duplicate-work penalty |
| ContextIntegrity | 1 − context-reset penalty |

Rounded to 3 decimals, reproducible, comparable across releases via `--baseline`.

## Runtime overhead

- **Token / context / prompt:** exactly zero — nothing touches the model context. The emitter is bash outside the prompt; the benchmark is offline.
- **Runtime:** one `printf >>` per event; nil once `TEIKK_TELEMETRY=off`.
- **Storage:** one JSONL line per event under gitignored `.teikk/cache/`.

Well under the "~1% runtime / no added prompt" bar, and fully disable-able with a single env var.
