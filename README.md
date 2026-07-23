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

All skills, agents, and references are copied directly into your project — self-contained, no shared global state. Your repository stays clean: the one physical directory that isn't gitignored-away is `.teikk/`, where every workflow writes its output. Install is additive — it copies beside your own files and never deletes your `.claude/` config.

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v5.0.0 --save-dev
npx teikk-agents-skills init claude
```

Auto-install on `npm install` — add to your project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "github:22Teikk/22Teikk-Agent-Skills-Hub#v5.0.0"
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

## Project layout

```
core/skills/     23 platform-neutral workflow skills (SKILL.md each) — always installed
core/agents/     7 platform-neutral personas (code-reviewer, adversarial-reviewer, test-engineer,
                 security-auditor, mobile-app-developer, ui-ux-tester, value-critic)
packs/android/   8 Android skills + 2 personas (android-performance-auditor, kotlin-specialist)
packs/ios/       swift-expert persona
packs/flutter/   flutter-expert persona
                 → install copies core + only the pack matching PROJECT.yaml `platform:`,
                   merged into a flat skills/ + agents/ in your project
.cursor/         rules (6: android-stack, ios-stack, flutter-stack, + 3 skill rules) + slash commands (23)
.claude/         slash commands (23)
hooks/           session lifecycle hooks (sdd-cache, simplify-ignore)
.agents/         Antigravity rules (6) + workflows (23)
commands/        OpenCode TOML commands (23)
references/      testing, security, performance, accessibility checklists
.teikk/          (generated at runtime) all workflow output — gitignored
```

---

## License

MIT
