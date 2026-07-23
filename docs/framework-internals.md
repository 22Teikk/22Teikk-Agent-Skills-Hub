# Framework internals — optional tooling

Everything here is **optional, off/opt-in by default, and not part of the core DEFINE→SHIP loop**. Skip it entirely if you just want the workflow commands.

## Framework observability & benchmark

Measures the **framework's own quality** — not your app's. Zero runtime AI, zero prompt/context overhead, offline, deterministic, and fully disable-able.

- **Emitter:** `lib/telemetry.sh` — on by default, no-ops entirely once the env var `TEIKK_TELEMETRY=off` is set. Privacy-safe by construction: the function only accepts scalar `event`/`status`/`duration`/`meta` values, with no parameter for prompt or context content. Copied into a `claude`-target install alongside `hooks/`.
- **Storage:** `.teikk/cache/telemetry/events.jsonl` — append-only JSONL, gitignored, never leaves the project.
- **Benchmark CLI** — `scripts/benchmark.js` is copied into every install target; run it in place, no clone needed:

```bash
node scripts/benchmark.js                                   # dashboard from .teikk/cache/telemetry/events.jsonl
node scripts/benchmark.js --json --out score.json           # machine-readable score
node scripts/benchmark.js --baseline prev-score.json         # delta vs a previous release
```

**Framework Score formula:**

```
score = 0.35·Quality + 0.30·Verification + 0.20·Efficiency + 0.15·ContextIntegrity
```

Quality = task success rate; Verification = verification pass rate; Efficiency = 1 − duplicate-work penalty; ContextIntegrity = 1 − context-reset penalty.

**Lifecycle collection (Claude Code only):** `hooks/lifecycle-telemetry.sh` wires 5 real Claude Code events — `TaskCreated`, `TaskCompleted`, `SubagentStart`, `SubagentStop`, `Stop` — alongside `SessionStart` and `PreCompact`. Observational only — never blocks, always exits 0 — and on by default. `npx teikk-agents-skills init claude` (or `update`) auto-wires all 7 into your project's `.claude/settings.json`; no manual step needed. This is the **collection** half; `scripts/benchmark.js` is the **analysis** half and runs anywhere against any `events.jsonl`. See `hooks/LIFECYCLE-TELEMETRY.md`.

## Enforced guardrails

Three guardrails enforced by executable scripts, not just prose — portable across all 5 agents because they're plain shell plus a git hook. See `hooks/GUARDRAILS.md`.

1. **Secret-push protection** — `hooks/pre-push.sh` calls `guardrail-check.sh scan-secrets` and blocks `git push` when the push range adds a sensitive file (`.env`, `*.pem`, `*.keystore`, `*.jks`, `id_rsa`, `secrets.*`, `google-services.json`, `GoogleService-Info.plist`). Template/example/doc variants are exempt (`.env.example`, `*.sample`, `*.md`). Fail-closed on a detected secret; fail-open only when the scanning tooling itself is absent.
2. **Destructive-command deny-list** — the agent runs `hooks/guardrail-check.sh deny-command "<cmd>"` before running a composed shell command; exit 1 means destructive (e.g. `git push --force`, `git reset --hard`, `rm -rf`, `DROP TABLE`, `kubectl delete`) — surface it to the user instead of auto-running.
3. **Sensitive-file "Allowed" confirmation gate.**

Install the git hook (choose one):

```bash
git config core.hooksPath hooks
# OR
ln -sf ../../hooks/pre-push.sh .git/hooks/pre-push
```

## Failure recovery & rollback

A set of decision rules — no runtime daemon — plus a git-level rollback helper. The goal: never leave the tree broken, never retry blindly, never lose more than one increment. See `references/failure-recovery.md`.

**Bounded, cause-aware retry policy:**
- Sub-agent timeout → retry once, with narrower scope
- Transient tool error → 2 retries with backoff
- Deterministic tool error (bad args, missing file) → 0 retries — fix the cause instead
- Hook failure → 0 retries (fail-open by design)
- Verification REJECT → no auto-retry — fix, then re-run once

**Hard rule:** after 3 consecutive failures of the same operation, stop, revert to the last known-good state, and escalate.

`scripts/rollback.sh` (copied into every install target) is destructive but safe-by-default — it always shows what it would discard first, refuses to destroy uncommitted work without `--force`, and a human confirms while an agent only proposes:

```bash
scripts/rollback.sh --dry-run          # preview — non-destructive, always run first
scripts/rollback.sh --to-last-commit   # reset tree to HEAD (destructive)
scripts/rollback.sh --to <sha>         # reset to a known-good sha (destructive)
```

## `value-critic` — scope critic persona

`core/agents/value-critic.md` asks "is this worth building?" — a scope and over-engineering critic wired into the intent-map at two points: the Define phase (scope stress-test before committing to a plan) and the Review phase (flagging over-engineering or scope creep in a diff). It's a review perspective, not a command.

## Parking-lot for deferred scope

`planning-and-task-breakdown` writes deferred or out-of-scope items to `.teikk/PARKING-LOT.md` instead of losing them when a task list closes, then re-surfaces them at the start of the next `/teikk-planning` run.

## Decisions log CLI

`scripts/decisions.js` (copied into every install target) is a query CLI over the append-only `.teikk/DECISIONS.md` log (it also checks `.teikk/spec/DECISIONS.md` by default), making the log queryable instead of grep-only.

```bash
node scripts/decisions.js list
node scripts/decisions.js find <term>
node scripts/decisions.js count
node scripts/decisions.js list --json   # machine-readable output
```

---

← Back to [README](../README.md) · Related: [diagnostics.md](diagnostics.md)
