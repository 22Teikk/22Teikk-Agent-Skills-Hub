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

All skills, agents, and references are copied directly into your project — self-contained, no shared global state. Your repository remains clean — the one physical directory that isn't gitignored-away is `.teikk/`, where every workflow writes its output (SPEC, tasks, E2E flows, caches). Install is additive: it copies beside your own files and never deletes your `.claude/` config.

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v2.2.0 --save-dev
npx teikk-agents-skills init claude
```

Auto-install on `npm install` — add to your project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "github:22Teikk/22Teikk-Agent-Skills-Hub#v2.2.0"
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

Removes only the files it created (`.cursor/`, `.claude/commands/`, `.agents/`, `.gemini/`, etc.) — your own files (e.g. `.claude/settings.local.json`) are left untouched — cleans the managed `.gitignore` block, and removes the manifest.

### Then remove the npm package

```bash
npm uninstall teikk-agents-skills
```

### Manual removal

If you installed without npm, delete the copied directories and remove the `# >>> teikk-agents-skills` block from `.gitignore`:

```bash
# In your project (only the files this tool copied — your own .claude/settings*.json is left alone):
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
/teikk-test          ← VERIFY: TDD unit + Compose/XCTest/widget tests (fast, core loop)
/teikk-review        ← before merge
/teikk-ship          ← go/no-go + store readiness

── optional, slow — run before a release, not in the TDD loop ──
/teikk-qa            ← deep-QA pass: E2E journeys + exhaustive UI/UX testing
/teikk-e2e           ← E2E only: Maestro (Android) | XCUITest (iOS) | integration_test (Flutter)
/teikk-ux-test       ← UI/UX only: exhaustive flow testing + defect report
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

## QA — optional, slow, opt-in

E2E and UI/UX testing are pulled **out of the core verify loop** because they can run for minutes on a device/emulator. Run them deliberately before a release via `/teikk-qa` (or the two commands individually):

- `/teikk-qa` — umbrella pass: runs E2E (if SPEC declares it) **then** exhaustive UI/UX testing, and merges one QA verdict. Args: `e2e` | `ux` | a flow name.
- `/teikk-e2e` — E2E only. Platform-aware: Maestro YAML (Android), XCUITest Swift (iOS), `integration_test` Dart (Flutter).
- `/teikk-ux-test` — UI/UX only, via the `ui-ux-tester` persona (mobile-mcp for mobile; browser-automation MCP for web).

E2E opt-in is declared in SPEC: `E2E: none` (default) | `E2E: Maestro` | `E2E: XCUITest` | `E2E: integration_test`. None of these run inside `/teikk-build` or `/teikk-test`.

Android Maestro skill: `skills/android-e2e-maestro/SKILL.md`

---

## Generated files — everything lands in `.teikk/`

Every workflow writes its output under a single project-local `.teikk/` directory, so nothing is scattered across your repo and one `.gitignore` line covers it all (added automatically on install):

```
.teikk/
├─ SPEC.md              /teikk-spec
├─ spec/                multi-file spec (optional)
├─ tasks/               /teikk-planning → plan.md, todo.md
├─ ideas/               /teikk-idea → refined idea one-pagers
├─ intent/              /teikk-interview → captured project intent
├─ adr/                 /teikk-docs → Architecture Decision Records
├─ maestro/flows/       /teikk-e2e (Android)
└─ cache/               hook caches (sdd, simplify-ignore) — never leaves the project
```

> Everything a workflow generates lives here — no more `docs/ideas/`, `docs/decisions/`, or scattered files in your repo. ADRs are gitignored by default; if you want them version-controlled, un-ignore the folder (`!.teikk/adr/`).

**Install is additive.** Files land *next to* your own — `init claude` copies only into `.claude/commands/`, so an existing `.claude/settings.local.json` or your own slash commands are never deleted (a file it can't safely place is reported and left untouched). `uninstall` removes only the files it created.

---

## All commands (19)

| Phase | Command |
|-------|---------|
| Define | `/teikk-interview`, `/teikk-idea`, `/teikk-spec` |
| Plan | `/teikk-planning` |
| Build | `/teikk-build`, `/teikk-android-setup`, `/teikk-ios-setup`, `/teikk-flutter-setup`, `/teikk-observability` |
| Verify | `/teikk-test` |
| Review | `/teikk-review`, `/teikk-code-simplify` |
| Ship | `/teikk-ship`, `/teikk-ci`, `/teikk-docs` |
| QA _(optional, slow)_ | `/teikk-qa`, `/teikk-e2e`, `/teikk-ux-test` |
| Audit | `/teikk-androidperf` |

30 skills total — commands are entry points; agents also auto-match skills by intent (see `AGENTS.md`).

---

## Project layout

```
skills/          30 workflow skills (SKILL.md each) — one (machine-audit) is standalone, opt-in only
agents/          10 personas (code-reviewer, adversarial-reviewer, test-engineer, security-auditor,
                 android-performance-auditor, kotlin-specialist, swift-expert, flutter-expert,
                 mobile-app-developer, ui-ux-tester)
.cursor/         rules (6: android-stack, ios-stack, flutter-stack, + 3 skill rules) + slash commands (19)
.claude/         slash commands (19)
hooks/           session lifecycle hooks (sdd-cache, simplify-ignore)
.agents/         Antigravity rules (6) + workflows (19)
commands/        OpenCode TOML commands (19)
references/      testing, security, performance, accessibility checklists
.teikk/          (generated at runtime) all workflow output — gitignored
```

---

## License

MIT
