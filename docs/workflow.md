# Workflow — which command when

The full lifecycle map: what each of the 23 commands does and when to reach for it. For copy-paste prompt templates per phase, see [prompting-guide.md](prompting-guide.md).

```
DEFINE ──▶ PLAN ──▶ BUILD ──▶ VERIFY ──▶ REVIEW ──▶ SHIP
                                 └▶ QA (optional, slow): /teikk-qa
```

`VERIFY` is the fast TDD loop (`/teikk-test`). E2E and UI/UX testing are **optional** and slow — they live in `/teikk-qa`, run deliberately before a release, never inside the inner loop.

---

## Typical new feature

```
/teikk-map-code-base ← existing/legacy project? reverse-engineer .teikk/spec/ from the code, then skip to /teikk-planning
/teikk-interview     ← ask unclear? skip if you know what you want
/teikk-idea          ← exploring options? skip if direction is clear
/teikk-spec          ← lock WHAT + platform (Android/iOS/Flutter) + stack + arch + observability + E2E opt-in
/teikk-planning      ← break into tasks (Phase 0: platform foundation first)
/teikk-build         ← one task at a time
/teikk-build auto    ← approve plan once, agent runs all tasks
/teikk-build ultra   ← same as auto, plus runs independent tasks in parallel git worktrees
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

## Setup & specialists

| Command | When |
|---------|------|
| `/teikk-map-code-base` | Existing/legacy project — reverse-engineer `.teikk/spec/` from the code (skip hand-writing a spec) |
| `/teikk-android-setup` | New Android project — Hilt, Version Catalog, Gradle |
| `/teikk-ios-setup` | New iOS project — SPM, SwiftLint, logging, Crashlytics |
| `/teikk-flutter-setup` | New Flutter project — flavors, Riverpod/BLoC, GoRouter, logging |
| `/teikk-observability` | Retrofit logging/analytics/perf traces onto existing code, or scope beyond one task (routine logging is now inline in `/teikk-build`) |
| `/teikk-ci` | GitHub Actions / quality gates |
| `/teikk-docs` | ADRs, README updates |
| `/teikk-code-simplify` | Code works but too complex |
| `/teikk-androidperf` | Startup / jank audit (Android) |

---

## All commands (23)

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

31 skills total in the repo (23 platform-neutral in `core/` + 8 Android in `packs/android/`). Your project only receives `core/` plus the one pack matching `PROJECT.yaml`'s `platform:` — an Android project installs 31, a generic project installs 23. Commands are entry points; agents also auto-match skills by intent (see [AGENTS.md](../AGENTS.md)).

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

Android Maestro skill: `packs/android/skills/android-e2e-maestro/SKILL.md` (installed only when PROJECT.yaml sets `platform: android`; lands flat at `skills/android-e2e-maestro/SKILL.md` in your project)

---

## End-to-end implementation

`/teikk-quick-implement` **chains build → test → review → ship in one session** with automatic context compaction if running low on tokens. Use when you have a single, well-scoped task and want a final verdict without multiple command invocations. Estimated cost: 33–56k tokens. **Not recommended for exploratory work or when token budget is tight** — use individual commands instead.

---

← Back to [README](../README.md) · Related: [prompting-guide.md](prompting-guide.md) · [generated-files.md](generated-files.md)
