# Teikk Agent Skills

Engineering workflows for AI coding agents — spec-first, test-driven, Android-focused.

Personal fork: [22Teikk/22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub)

```
DEFINE ──▶ PLAN ──▶ BUILD ──▶ VERIFY ──▶ REVIEW ──▶ SHIP
```

---

## Install

All skills, agents, and references are stored globally in `~/.teikk-agents-skills/` and symlinked to your project. Your repository remains clean — only project-specific files like `SPEC.md` and `tasks/` are stored physically.

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v1.5.0 --save-dev
npx teikk-agents-skills init cursor
```

Auto-install on `npm install` — add to your project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "github:22Teikk/22Teikk-Agent-Skills-Hub#v1.5.0"
  },
  "teikk-agents-skills": { "target": "cursor" }
}
```

Other targets: `claude` | `antigravity` | `gemini` | `opencode` | `all`

Setup guides: [docs/](docs/)

---

## Workflow — which command when

### Typical new feature

```
/teikk-interview     ← ask unclear? skip if you know what you want
/teikk-idea          ← exploring options? skip if direction is clear
/teikk-spec          ← lock WHAT + stack + arch + observability + E2E: none|Maestro
/teikk-planning      ← break into tasks (Phase 0: Hilt + Timber first)
/teikk-build         ← one task at a time
/teikk-build auto    ← approve plan once, agent runs all tasks
/teikk-test          ← TDD unit + Compose component (not E2E)
/teikk-e2e           ← opt-in Maestro journeys (when SPEC says so)
/teikk-review        ← before merge
/teikk-ship          ← go/no-go + optional Maestro if .maestro/ exists
```

### Setup & specialists

| Command | When |
|---------|------|
| `/teikk-android-setup` | New project — Hilt, Version Catalog, Gradle |
| `/teikk-observability` | Timber, Crashlytics, analytics, perf traces |
| `/teikk-ci` | GitHub Actions / quality gates |
| `/teikk-docs` | ADRs, README updates |
| `/teikk-code-simplify` | Code works but too complex |
| `/teikk-androidperf` | Startup / jank audit |

---

## E2E (Maestro) — opt-in

- Declare in SPEC: `E2E: none` (default) or `E2E: Maestro — flows: [...]`
- `/teikk-e2e` — agent reads UI source → writes `.maestro/flows/*.yaml` → runs `maestro test`
- `/teikk-ship` — runs Maestro only if `.maestro/flows/` exists and SPEC ≠ `E2E: none`
- Not part of `/teikk-build` or `/teikk-test` (too slow for TDD loop)

Skill: `skills/android-e2e-maestro/SKILL.md`

---

## All commands (15)

| Phase | Command |
|-------|---------|
| Define | `/teikk-interview`, `/teikk-idea`, `/teikk-spec` |
| Plan | `/teikk-planning` |
| Build | `/teikk-build`, `/teikk-android-setup`, `/teikk-observability` |
| Verify | `/teikk-test`, `/teikk-e2e` |
| Review | `/teikk-review`, `/teikk-code-simplify` |
| Ship | `/teikk-ship`, `/teikk-ci`, `/teikk-docs` |
| Audit | `/teikk-androidperf` |

29 skills total — commands are entry points; agents also auto-match skills by intent (see `AGENTS.md`).

---

## Project layout

```
skills/          29 workflow skills (SKILL.md each)
agents/          code-reviewer, test-engineer, security-auditor, android-performance-auditor
.cursor/         rules (4) + slash commands (15)
.claude/         slash commands + hooks
.agents/         Antigravity rules + workflows
references/      testing, security, performance, accessibility checklists
```

---

## License

MIT
