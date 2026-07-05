# Teikk Agent Skills

Engineering workflows for AI coding agents — spec-first, test-driven, Android-focused.

Personal fork: [22Teikk/22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub)

```
DEFINE ──▶ PLAN ──▶ BUILD ──▶ VERIFY ──▶ REVIEW ──▶ SHIP
```

---

## Install

All skills, agents, and references are stored globally in `~/.teikk-agents-skills/` and symlinked to your project. Your repository remains clean — the one physical directory is `.teikk/`, where every workflow writes its output (SPEC, tasks, E2E flows, caches). Install is additive: it links beside your own files and never deletes your `.claude/` config.

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v2.0.0 --save-dev
npx teikk-agents-skills init claude
```

Auto-install on `npm install` — add to your project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "github:22Teikk/22Teikk-Agent-Skills-Hub#v2.0.0"
  },
  "teikk-agents-skills": { "target": "claude" }
}
```

Primary targets: `claude` | `antigravity` | `opencode`. Also supported: `cursor` | `gemini` | `all`

Setup guides: [docs/](docs/)

---

## Uninstall

### CLI (recommended)

```bash
npx teikk-agents-skills uninstall
```

Removes only the symlinks it created (`.cursor/`, `.claude/commands/`, `.agents/`, `.gemini/`, etc.) — your own files (e.g. `.claude/settings.local.json`) are left untouched — cleans the managed `.gitignore` block, and removes the manifest.

### Then remove the npm package

```bash
npm uninstall teikk-agents-skills
```

### Manual removal

If you installed without npm, delete the symlinked/copied directories and remove the `# >>> teikk-agents-skills` block from `.gitignore`:

```bash
rm -rf ~/.teikk-agents-skills/
# In your project (only the symlinked dirs — your own .claude/settings*.json is left alone):
rm -rf .cursor/rules/ .cursor/commands/ .claude/commands/ .agents/ .gemini/ .opencode/ .serena/
# Optionally remove workflow output:
rm -rf .teikk/
# Edit .gitignore — remove the managed block between:
#   # >>> teikk-agents-skills ...
#   # <<< teikk-agents-skills
```

---

## Workflow — which command when

### Typical new feature

```
/teikk-interview     ← ask unclear? skip if you know what you want
/teikk-idea          ← exploring options? skip if direction is clear
/teikk-spec          ← lock WHAT + platform (Android/iOS/Flutter) + stack + arch + observability + E2E opt-in
/teikk-planning      ← break into tasks (Phase 0: platform foundation first)
/teikk-build         ← one task at a time
/teikk-build auto    ← approve plan once, agent runs all tasks
/teikk-test          ← TDD unit + Compose/XCTest/widget tests (not E2E)
/teikk-e2e           ← opt-in E2E: Maestro (Android) | XCUITest (iOS) | integration_test (Flutter)
/teikk-ux-test       ← exhaustive UI/UX flow testing and defect report
/teikk-review        ← before merge
/teikk-ship          ← go/no-go + store readiness + optional E2E
```

### Setup & specialists

| Command | When |
|---------|------|
| `/teikk-android-setup` | New Android project — Hilt, Version Catalog, Gradle |
| `/teikk-ios-setup` | New iOS project — SPM, SwiftLint, logging, Crashlytics |
| `/teikk-flutter-setup` | New Flutter project — flavors, Riverpod/BLoC, GoRouter, logging |
| `/teikk-observability` | Timber/Crashlytics/analytics/perf traces (any platform) |
| `/teikk-ci` | GitHub Actions / quality gates |
| `/teikk-docs` | ADRs, README updates |
| `/teikk-code-simplify` | Code works but too complex |
| `/teikk-androidperf` | Startup / jank audit (Android) |

---

## E2E — opt-in, platform-aware

- Declare in SPEC: `E2E: none` (default) | `E2E: Maestro` (Android) | `E2E: XCUITest` (iOS) | `E2E: integration_test` (Flutter)
- `/teikk-e2e` — platform-aware: Maestro YAML (Android), XCUITest Swift (iOS), `integration_test` Dart (Flutter)
- `/teikk-ship` — runs the correct E2E suite if SPEC declares it and test artifacts exist
- Not part of `/teikk-build` or `/teikk-test` (too slow for TDD loop)

Android Maestro skill: `skills/android-e2e-maestro/SKILL.md`

---

## Generated files — everything lands in `.teikk/`

Every workflow writes its output under a single project-local `.teikk/` directory, so nothing is scattered across your repo and one `.gitignore` line covers it all (added automatically on install):

```
.teikk/
├─ SPEC.md              /teikk-spec
├─ spec/                multi-file spec (optional)
├─ tasks/               /teikk-planning → plan.md, todo.md
├─ maestro/flows/       /teikk-e2e (Android)
└─ cache/               hook caches (sdd, simplify-ignore) — never leaves the project
```

**Install is additive.** Symlinks land *next to* your own files — `init claude` links only `.claude/commands/`, so an existing `.claude/settings.local.json` or your own slash commands are never deleted (a file it can't safely place is reported and left untouched). `uninstall` removes only the symlinks it created.

---

## All commands (18)

| Phase | Command |
|-------|---------|
| Define | `/teikk-interview`, `/teikk-idea`, `/teikk-spec` |
| Plan | `/teikk-planning` |
| Build | `/teikk-build`, `/teikk-android-setup`, `/teikk-ios-setup`, `/teikk-flutter-setup`, `/teikk-observability` |
| Verify | `/teikk-test`, `/teikk-e2e`, `/teikk-ux-test` |
| Review | `/teikk-review`, `/teikk-code-simplify` |
| Ship | `/teikk-ship`, `/teikk-ci`, `/teikk-docs` |
| Audit | `/teikk-androidperf` |

29 skills total — commands are entry points; agents also auto-match skills by intent (see `AGENTS.md`).

---

## Project layout

```
skills/          29 workflow skills (SKILL.md each)
agents/          9 personas (code-reviewer, test-engineer, security-auditor, android-performance-auditor,
                 kotlin-specialist, swift-expert, flutter-expert, mobile-app-developer, ui-ux-tester)
.cursor/         rules (6: android-stack, ios-stack, flutter-stack, + 3 skill rules) + slash commands (18)
.claude/         slash commands (18)
hooks/           session lifecycle hooks (sdd-cache, simplify-ignore)
.agents/         Antigravity rules (6) + workflows (18)
commands/        OpenCode TOML commands (18)
references/      testing, security, performance, accessibility checklists
.teikk/          (generated at runtime) all workflow output — gitignored
```

---

## License

MIT
