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
npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v2.3.0 --save-dev
npx teikk-agents-skills init claude
```

Auto-install on `npm install` — add to your project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "github:22Teikk/22Teikk-Agent-Skills-Hub#v2.3.0"
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

── faster when context allows — build + test + review + ship in one session ──
/teikk-quick-implement  ← implement one task end-to-end with auto context compaction
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

## Test Traceability — AC → Test Mapping

Every acceptance criterion must map to a **behavioral test** (not a mock, not boilerplate). `/teikk-planning` includes a **traceability checklist** that validates this before you write code:

**Valid mappings:**
- ✓ `AC: Users can save → SaveViewModelTest.save_updatesDatabase (unit)`
- ✓ `AC: Total is calculated → TransactionDaoTest.insertAndSum (integration, Room in-memory)`
- ✓ `AC: Payment processes → E2E maestro flow (e2e)`

**Invalid mappings (caught as blockers at ship time):**
- ✗ `AC: UI shows data → ExampleInstrumentedTest` (boilerplate template, not behavioral)
- ✗ `AC: Button appears → mock repository returns true` (mock-only, not real implementation)
- ✗ `AC: User can login → assertVisible("Login Button")` (label-only, no value assertion)

**SHIP-REPORT.md traceability matrix** lists every AC and whether it has a behavioral test. Any AC without a test is a **production blocker** at `/teikk-ship` time.

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
├─ SPEC.md              /teikk-spec (what to build)
├─ PROJECT.yaml         /teikk-spec (metadata: platform, domain, CI, E2E, budgets)
├─ QUICKSTART.md        /teikk-spec (first-run guide)
├─ WORKFLOW.md          /teikk-spec (decision tree: what command to run next)
├─ DOCTOR.md            /teikk-doctor (project setup health audit)
├─ SHIP-REPORT.md       /teikk-ship (go/no-go verdict + traceability + blockers)
├─ spec/                multi-file spec (optional)
├─ tasks/               /teikk-planning → plan.md (with AC→test mappings), todo.md
├─ ideas/               /teikk-idea → refined idea one-pagers
├─ intent/              /teikk-interview → captured project intent
├─ adr/                 /teikk-docs → Architecture Decision Records
├─ maestro/flows/       /teikk-e2e (Android)
└─ cache/               hook caches (sdd, simplify-ignore) — never leaves the project
```

> Everything a workflow generates lives here — no more `docs/ideas/`, `docs/decisions/`, or scattered files in your repo. ADRs are gitignored by default; if you want them version-controlled, un-ignore the folder (`!.teikk/adr/`).

**Install is additive.** Files land *next to* your own — `init claude` copies only into `.claude/commands/`, so an existing `.claude/settings.local.json` or your own slash commands are never deleted (a file it can't safely place is reported and left untouched). `uninstall` removes only the files it created.

---

## All commands (21)

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
| Diagnostics | `/teikk-doctor`, `/teikk-machine-audit` |
| End-to-end | `/teikk-quick-implement` |

30 skills total — commands are entry points; agents also auto-match skills by intent (see `AGENTS.md`).

---

## End-to-end implementation

- `/teikk-quick-implement` — **chains build → test → review → ship in one session** with automatic context compaction if running low on tokens. Use when you have a single, well-scoped task and want a final verdict without multiple command invocations. Estimated cost: 33–56k tokens. **Not recommended for exploratory work or when token budget is tight** — use individual commands instead.

---

## Diagnostics — health checks & troubleshooting

Both commands are **standalone, opt-in, not part of the core DEFINE→SHIP workflow**. Run them when you need a health check or debugging. Together they form a troubleshooting toolkit for the two layers: your **project setup** (doctor) and your **Claude Code environment** (machine-audit).

### `/teikk-doctor` — Project setup audit

Audits the **agent-skills workflow health** in your project. Writes `.teikk/DOCTOR.md` with a pass/warn/fail checklist.

**Checks:**
1. Gitignore — `.teikk/` in managed block ✓/✗
2. Manifest — `.teikk-agents-skills.json` present and valid ✓/✗
3. Spec — `.teikk/SPEC.md` present and complete (all 8 sections) ✓/⚠/✗
4. PROJECT.yaml — `.teikk/PROJECT.yaml` present ✓/⚠
5. Mobile-mcp — configured if Android/E2E project ✓/⚠/skip
6. E2E tooling — maestro/xcodebuild/flutter on PATH ✓/⚠/skip
7. Tasks — plan.md and todo.md present ✓/⚠/skip
8. Git tree — clean or dirty (informational) ✓/⚠

**Run when:**
- Project feels broken or workflow output is missing
- You just installed agent-skills and want to verify setup
- MCP servers are failing or E2E tests won't run
- Before sharing the project with someone else

**Output:** `.teikk/DOCTOR.md` (pass/warn/fail table + next-action recommendations)

### `/teikk-machine-audit` — Claude Code environment audit

Diagnoses your **Claude Code configuration and performance**. Run this when a session feels slow or expensive and you want to rule out workflow overhead.

**Checks:**
- `.claude/settings.json` and `.claude/settings.local.json` (permissions, hooks, MCP servers)
- MCP server health and connectivity
- Global hooks (are they causing slowdowns?)
- Token/cost instrumentation (is telemetry running?)
- Cache state and memory usage
- Known performance bottlenecks in your config

**Run when:**
- Sessions feel unusually slow or expensive
- MCP servers are timing out or disconnecting
- You suspect a misconfigured hook or permission is causing issues
- Switching to a new machine or Claude Code version
- Before opening a support ticket (rules out workflow as root cause)

**Output:** Detailed environment report with recommendations for improvements

---

### Using both together

**Typical troubleshooting flow:**

1. Something feels wrong → Run `/teikk-doctor` first (quick project-level check)
2. Doctor is green but you're still stuck → Run `/teikk-machine-audit` (diagnose the IDE/agent layer)
3. Both green? → Issue is in your project code, not the workflow or environment
4. Both red? → You have infrastructure + setup issues to fix first before resuming work

**In a new project:**

```
npm install teikk-agents-skills
npx teikk-agents-skills init claude
/teikk-doctor        ← verify install succeeded
/teikk-machine-audit ← verify your Claude Code is healthy
/teikk-spec          ← now you're ready to start
```

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
