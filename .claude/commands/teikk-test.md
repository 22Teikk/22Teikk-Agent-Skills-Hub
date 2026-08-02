---
description: Run TDD workflow — write failing tests, implement, verify. For bugs, use the Prove-It pattern.
---

Invoke the teikk-agents-skills:test-driven-development skill.

Read `.teikk/spec/SPEC.md` (fall back to `.teikk/SPEC.md`) for platform before routing tests. If `.teikk/tasks/todo.md` exists, also read its `**Current task:**` line and jump to that task's `## Task N:` section in `.teikk/tasks/plan.md` for the specific ACs to verify — don't re-scan the plan. Read-only lookup; `/teikk-test` does not update `todo.md`.

For new features: write tests that fail → implement to pass → refactor while green.
For bug fixes (Prove-It): reproduce test (must FAIL) → confirm fail → fix → confirm pass → full suite for regressions.

## Platform routing

| Platform | Test frameworks | Skill / persona |
|----------|-----------------|-----------------|
| Android (Kotlin) | JUnit 5, MockK, Turbine, ComposeTestRule | `android-testing-and-benchmark-kotlin` |
| Android (Java) | JUnit 4, Mockito, Espresso | `android-testing-and-benchmark-java` |
| iOS | XCTest, XCTestExpectation, async throws | `swift-expert` |
| Flutter | `flutter_test`, WidgetTester, Mocktail | `flutter-expert` |

**Not for E2E user journeys** — use `/teikk-e2e` when SPEC declares E2E opt-in or for multi-screen smoke tests.

## Audit (recommended for non-trivial changes)

Optionally spawn `test-engineer` as a sub-agent after tests pass (Pattern 1 direct invocation — see the `planning-and-task-breakdown` skill's `references/orchestration-patterns.md`). Same persona `/teikk-ship` runs in fan-out, so audit criteria don't drift between test and ship phases.

The sub-agent: disqualifies mock-only / `ExampleUnitTest` / label-only tests (zero coverage for the AC they claim); verifies data layer has a real in-memory DAO test (integration, not mocked repository); returns one-line verdict (`PASS` / `has-gaps: <file list>`).

**When to spawn:** change touches auth/payments/data/config; OR test count > 30 and audit is cheaper than re-reading; OR pre-ship gate where consistency with `/teikk-ship` matters. **Skip for trivial changes** (< 3 test files, no auth/payments/data) — sub-agent cost is wasted on small diffs.

**Optional telemetry:** after audit (or after test run if skipping), if an emit helper exists in the current tool's installed hooks directory, source it and emit `verification_passed ok` / `verification_failed err` with test count. Otherwise skip telemetry; it fails open. See the `observability-and-instrumentation` skill's `references/observability-and-benchmark.md`.
