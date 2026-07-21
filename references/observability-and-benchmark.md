# Observability & Benchmark (framework-level)

A minimal, opt-in way to measure the *framework's own* quality — not the user's app. Built to a hard constraint: **zero runtime AI, zero prompt injection, zero context overhead, offline benchmark, deterministic score, fully disable-able by config.**

The framework has no runtime daemon — it is markdown + scripts an agent reads. So telemetry cannot live in the prompt. It lives at the only two non-AI touchpoints: **hook scripts** (bash, run outside the model context) and **CLI/CI** (`scripts/`). That is what makes it zero-token and zero-context.

## Components

| Piece | File | Role |
|-------|------|------|
| Emitter | `lib/telemetry.sh` | One-line JSONL append. OFF unless `TEIKK_TELEMETRY=on`. |
| Storage | `.teikk/cache/telemetry/events.jsonl` | Append-only JSONL, never leaves the project, gitignored. |
| Benchmark | `scripts/benchmark.js` | Offline: reads events, computes metrics + Framework Score, renders dashboard. |

## Telemetry (opt-in, privacy-safe by construction)

```bash
source lib/telemetry.sh
teikk_emit <event> [status] [duration_ms] [meta_json]
```

- **OFF by default.** When `TEIKK_TELEMETRY != on`, `teikk_emit` returns immediately — true zero overhead. Enable per-run with `TEIKK_TELEMETRY=on`.
- **Cannot leak.** The function accepts only scalar `event/status/duration/meta`. It has no parameter for prompt, context, or reasoning — the privacy guarantee is the function signature, not a policy.
- **Fail-open.** A missing dir, missing `date`, or write error never blocks the agent — it silently no-ops.

High-signal events only: `session_started`, `context_reset`, `task_started`, `task_completed`, `verification_passed`, `verification_failed`, `duplicate_detected`, `decision_created`, `decision_reused`. Never log prompts, context, or chain-of-thought.

## Benchmark & dashboard (offline, deterministic)

```bash
node scripts/benchmark.js                                   # dashboard from .teikk/cache/telemetry/events.jsonl
node scripts/benchmark.js --events <file> --out REPORT.md   # write a Markdown dashboard
node scripts/benchmark.js --json --out score.json           # machine-readable score + metrics
node scripts/benchmark.js --baseline prev-score.json        # show delta vs a previous release
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
- **Runtime:** one `printf >>` per event only when explicitly enabled; nil when off.
- **Storage:** one JSONL line per event under gitignored `.teikk/cache/`.

Well under the "~1% runtime / no added prompt" bar, and fully disabled by default.
