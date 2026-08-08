# Teikk Agent Skills

Engineering workflows for AI coding agents — spec-first, test-driven, Android-focused.

Personal fork: [22Teikk/22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub)

```
DEFINE ──▶ PLAN ──▶ BUILD ──▶ VERIFY ──▶ REVIEW ──▶ SHIP
                                 └▶ QA (optional, slow): /teikk-qa
```

`VERIFY` is the fast TDD loop (`/teikk-test`). E2E and UI/UX testing are **optional** and slow — they live in `/teikk-qa`, run deliberately before a release, never inside the inner loop.

---

## Install

Skills and agents are copied directly into each tool's own directory (`.claude/skills/`, `.opencode/skills/`, …) — self-contained, no shared tree, no symlinks. Reference docs a skill uses are bundled into that skill. The only non-gitignored output dir is `.teikk/`, where every workflow writes. Install is additive — it copies beside your own files and never deletes your `.claude/` config.

```bash
# Latest source from GitHub over HTTPS (no SSH key required)
npm install 'git+https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git#main' --save-dev
npx teikk-agents-skills init claude
```

If the package is published to npm, prefer the registry's moving latest tag:

```bash
npm install teikk-agents-skills@latest --save-dev
npx teikk-agents-skills init claude
```

Auto-install on `npm install` — add to your project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "latest"
  },
  "teikk-agents-skills": { "target": "claude" }
}
```

Primary targets: `claude` | `antigravity` | `opencode`. Also supported: `cursor` | `gemini` | `all`

Full install/update/uninstall + `.gitignore` behavior: **[docs/npm-install.md](docs/npm-install.md)**.

---

## Documentation

Start here, then follow the topic you need. The README is a hub — the detail lives in `docs/`.

| Topic | Read |
|-------|------|
| **Getting started** — how skills work, loading them into any agent | [docs/getting-started.md](docs/getting-started.md) |
| **Prompting guide** — best prompts per phase (context, templates, anti-patterns) | [docs/prompting-guide.md](docs/prompting-guide.md) |
| **Workflow & commands** — which command when, all 23 commands, AC→test traceability, QA | [docs/workflow.md](docs/workflow.md) |
| **Generated files** — the `.teikk/` layout, `todo.md` resume, `ultra` worktrees | [docs/generated-files.md](docs/generated-files.md) |
| **Diagnostics** — `/teikk-doctor` (project) + `/teikk-machine-audit` (environment) | [docs/diagnostics.md](docs/diagnostics.md) |
| **Framework internals** — telemetry/benchmark, guardrails, failure recovery, CLIs | [docs/framework-internals.md](docs/framework-internals.md) |
| **npm install** — auto-install, update, uninstall, `.gitignore` | [docs/npm-install.md](docs/npm-install.md) |
| **Skill anatomy** — structure of a `SKILL.md`, contributing new skills | [docs/skill-anatomy.md](docs/skill-anatomy.md) |

**Per-IDE setup:** [Cursor](docs/cursor-setup.md) · [Antigravity](docs/antigravity-setup.md) · [Gemini CLI](docs/gemini-cli-setup.md) · [OpenCode](docs/opencode-setup.md) · [Claude Code](docs/getting-started.md)

---

## Commands at a glance (23)

Entry points into the lifecycle. Full descriptions and prompt templates in [docs/workflow.md](docs/workflow.md) and [docs/prompting-guide.md](docs/prompting-guide.md).

| Phase | Command |
|-------|---------|
| Define | `/teikk-interview`, `/teikk-idea`, `/teikk-spec`, `/teikk-map-code-base` |
| Plan | `/teikk-planning` |
| Build | `/teikk-build`, `/teikk-android-setup`, `/teikk-ios-setup`, `/teikk-flutter-setup`, `/teikk-observability` |
| Verify | `/teikk-test` |
| Review | `/teikk-review`, `/teikk-code-simplify` |
| Ship | `/teikk-ship`, `/teikk-ci`, `/teikk-docs` |
| QA _(optional, slow)_ | `/teikk-qa`, `/teikk-e2e`, `/teikk-ux-test` |
| Audit | `/teikk-androidperf` |
| Diagnostics | `/teikk-doctor`, `/teikk-machine-audit` |
| End-to-end | `/teikk-quick-implement` |

Key lifecycle: `/teikk-spec` → `/teikk-planning` → `/teikk-build` → `/teikk-review` → `/teikk-ship`.

---

## Uninstall

```bash
npx teikk-agents-skills uninstall   # removes only files it created; cleans the managed .gitignore block
npm uninstall teikk-agents-skills
```

Manual removal and details: [docs/npm-install.md](docs/npm-install.md).

---

## Framework internals — optional tooling

Everything in this section is **optional, off/opt-in by default, and not part of the core DEFINE→SHIP loop**. Skip it entirely if you just want the workflow commands above.

### Framework observability & benchmark

Measures the **framework's own quality** — not your app's. Zero runtime AI, zero prompt/context overhead, offline, deterministic, and fully disable-able.

- **Emitter:** `lib/telemetry.sh` — off by default, no-ops entirely unless the env var `TEIKK_TELEMETRY=on` is set. Privacy-safe by construction: the function only accepts scalar `event`/`status`/`duration`/`meta` values, with no parameter for prompt or context content.
- **Storage:** `.teikk/cache/telemetry/events.jsonl` — append-only JSONL, gitignored, never leaves the project.
- **Benchmark CLI** (offline, deterministic — the same events always produce the same score):

```bash
node scripts/benchmark.js                              # dashboard from the events file
node scripts/benchmark.js --json --out score.json      # machine-readable score
node scripts/benchmark.js --baseline prev-score.json   # delta vs a previous release
```

**Framework Score formula:**

```
score = 0.35·Quality + 0.30·Verification + 0.20·Efficiency + 0.15·ContextIntegrity
```

Quality = task success rate; Verification = verification pass rate; Efficiency = 1 − duplicate-work penalty; ContextIntegrity = 1 − context-reset penalty.

**Lifecycle collection (Claude Code only):** `hooks/lifecycle-telemetry.sh` wires 5 real Claude Code events into `hooks/hooks.json` — `TaskCreated`, `TaskCompleted`, `SubagentStart`, `SubagentStop`, `Stop`. Observational only — never blocks, always exits 0 — and off by default. This is the **collection** half; `scripts/benchmark.js` is the **analysis** half and runs anywhere against any `events.jsonl`. See `hooks/LIFECYCLE-TELEMETRY.md`.

### Enforced guardrails

Three guardrails enforced by executable scripts, not just prose — portable across all 5 agents because they're plain shell plus a git hook. See `hooks/GUARDRAILS.md`.

1. **Secret-push protection** — `hooks/pre-push.sh` calls `guardrail-check.sh scan-secrets` and blocks `git push` when the push range adds a sensitive file (`.env`, `*.pem`, `*.keystore`, `*.jks`, `id_rsa`, `secrets.*`, `google-services.json`, `GoogleService-Info.plist`). Template/example/doc variants are exempt (`.env.example`, `*.sample`, `*.md`). Fail-closed on a detected secret; fail-open only when the scanning tooling itself is absent.
2. **Destructive-command deny-list** — the agent runs `hooks/guardrail-check.sh deny-command "<cmd>"` before running a composed shell command; exit 1 means destructive (e.g. `git push --force`, `git reset --hard`, `rm -rf`, `DROP TABLE`, `kubectl delete`) — surface it to the user instead of auto-running.
3. **Sensitive-file "Allowed" confirmation gate.**

40 skills total (23 core + 9 Android + 4 iOS + 4 Flutter) + 11 personas across packs + core — commands are entry points; agents also auto-match skills by intent (see `AGENTS.md` for the hub-repo contributor guide).
40 skills total (23 core + 9 Android + 4 iOS + 4 Flutter) + 11 personas across packs + core — commands are entry points; agents also auto-match skills by intent (see `AGENTS.md` for the hub-repo contributor guide).

```bash
# In an installed project (claude target): hooks land in .claude/hooks/
git config core.hooksPath .claude/hooks
# OR
ln -sf ../../.claude/hooks/pre-push.sh .git/hooks/pre-push
```

### Failure recovery & rollback

A set of decision rules — no runtime daemon — plus a git-level rollback helper. The goal: never leave the tree broken, never retry blindly, never lose more than one increment. See `references/failure-recovery.md`.

**Bounded, cause-aware retry policy:**
- Sub-agent timeout → retry once, with narrower scope
- Transient tool error → 2 retries with backoff
- Deterministic tool error (bad args, missing file) → 0 retries — fix the cause instead
- Hook failure → 0 retries (fail-open by design)
- Verification REJECT → no auto-retry — fix, then re-run once

**Hard rule:** after 3 consecutive failures of the same operation, stop, revert to the last known-good state, and escalate.

`scripts/rollback.sh` is destructive but safe-by-default — it always shows what it would discard first, refuses to destroy uncommitted work without `--force`, and a human confirms while an agent only proposes:

```bash
scripts/rollback.sh --dry-run          # preview — non-destructive, always run first
scripts/rollback.sh --to-last-commit   # reset tree to HEAD (destructive)
scripts/rollback.sh --to <sha>         # reset to a known-good sha (destructive)
```

### `value-critic` — scope critic persona

`core/agents/value-critic.md` asks "is this worth building?" — a scope and over-engineering critic wired into the intent-map at two points: the Define phase (scope stress-test before committing to a plan) and the Review phase (flagging over-engineering or scope creep in a diff). It's a review perspective, not a command.

### Parking-lot for deferred scope

`planning-and-task-breakdown` writes deferred or out-of-scope items to `.teikk/PARKING-LOT.md` instead of losing them when a task list closes, then re-surfaces them at the start of the next `/teikk-planning` run.

### Decisions log CLI

`scripts/decisions.js` is a query CLI over the append-only `.teikk/DECISIONS.md` log (it also checks `.teikk/spec/DECISIONS.md` by default), making the log queryable instead of grep-only.

```bash
node scripts/decisions.js list
node scripts/decisions.js find <term>
node scripts/decisions.js count
node scripts/decisions.js list --json   # machine-readable output
```

---

## Project layout

```
core/skills/     23 platform-neutral workflow skills (SKILL.md each) — always installed
core/agents/     7 platform-neutral personas (code-reviewer, adversarial-reviewer, test-engineer,
                 security-auditor, mobile-app-developer, ui-ux-tester, value-critic)
packs/android/   9 Android skills (ui/data/di/test per Kotlin+Java + Compose animations) + 2 personas
packs/android/   9 Android skills (ui/data/di/test per Kotlin+Java + Compose animations) + 2 personas
                 (android-performance-auditor, kotlin-specialist)
packs/ios/       4 iOS skills (ui/data/di/test) + swift-expert persona
packs/flutter/   4 Flutter skills (ui/data/di/test) + flutter-expert persona
                 → install copies core + only the pack matching `.teikk/spec/PROJECT.yaml`
                   `platform:`, copied into each tool's own skills/ + agents/ dir
                 Total: 40 skills (23 core + 17 pack) + 11 personas across packs + core
.cursor/         rules (6) + slash commands (23)
.claude/         slash commands (23)
hooks/           session lifecycle hooks (sdd-cache, simplify-ignore)
.agents/         Antigravity rules (6) + workflows (23)
commands/        OpenCode-dialect TOML command sources (23)
references/      testing, security, performance, accessibility checklists
.teikk/          (generated at runtime) all workflow output — gitignored
```

The list above is the **repo** layout. Inside an **installed project**, each tool dir is self-contained — skills/agents are physically copied in, and each skill bundles the reference docs it uses (project root stays clean — only `scripts/` and Antigravity's `commands/` sit at root):

```
.claude/    commands/ (23 *.md) · skills/<skill>/{SKILL.md,references/} · agents/*.md · hooks/ · lib/telemetry.sh
.opencode/  commands/ (23 *.md) · skills/<skill>/{SKILL.md,references/} · agents/*.md
.cursor/ .gemini/ .agents/   commands|workflows · skills/ · agents/
scripts/    user-facing CLIs (benchmark, decisions, rollback) — kept at root
.teikk/     (generated at runtime) all workflow output — gitignored
```

---

## License

MIT
