# Teikk Agent Skills

Engineering workflows for AI coding agents — spec-first, test-driven, Android-focused.

Personal fork: [22Teikk/22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub)

```
DEFINE ──▶ PLAN ──▶ BUILD ──▶ VERIFY ──▶ REVIEW ──▶ SHIP
```

---

## Install (Cursor)

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v1.3.0 --save-dev
npx teikk-agents-skills init cursor
```

Auto-install on `npm install` — add to your Android project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "github:22Teikk/22Teikk-Agent-Skills-Hub#v1.3.0"
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
/teikk-spec          ← lock WHAT + stack + arch + observability
/teikk-planning      ← break into tasks (Phase 0: Hilt + Timber first)
/teikk-build         ← one task at a time
/teikk-build auto    ← approve plan once, agent runs all tasks
/teikk-test          ← extra test focus
/teikk-review        ← before merge
/teikk-ship          ← go/no-go + rollback plan
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

## What gets enforced automatically

**Spec (`/teikk-spec`)** now requires nine areas including **Architecture** (Hilt, MVVM, modules) and **Observability** (Timber, Crashlytics) — not just features.

**Plan (`/teikk-planning`)** adds **Phase 0 Foundation** before feature slices: DI + logging setup.

**Build (`/teikk-build`)** routes tasks to the right Android skill (UI, data, DI, observability).

**Ship (`/teikk-ship`)** checks observability, docs, CI, git hygiene — not just code review personas.

**Cursor rule** `.cursor/rules/android-stack.mdc` loads on `*.kt` / `build.gradle.kts` — Hilt + Timber defaults without repeating every session.

---

## All commands (14)

| Phase | Command |
|-------|---------|
| Define | `/teikk-interview`, `/teikk-idea`, `/teikk-spec` |
| Plan | `/teikk-planning` |
| Build | `/teikk-build`, `/teikk-android-setup`, `/teikk-observability` |
| Verify | `/teikk-test` |
| Review | `/teikk-review`, `/teikk-code-simplify` |
| Ship | `/teikk-ship`, `/teikk-ci`, `/teikk-docs` |
| Audit | `/teikk-androidperf` |

28 skills total — commands are entry points; agents also auto-match skills by intent (see `AGENTS.md`).

---

## Project layout

```
skills/          28 workflow skills (SKILL.md each)
agents/          code-reviewer, test-engineer, security-auditor, android-performance-auditor
.cursor/         rules (4) + slash commands (14)
.claude/         slash commands + hooks
.agents/         Antigravity rules + workflows
references/      testing, security, performance, accessibility checklists
```

---

## License

MIT
