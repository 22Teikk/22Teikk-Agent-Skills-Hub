---
description: Run TDD workflow — write failing tests, implement, verify. For bugs, use the Prove-It pattern.
---

Invoke the teikk-agents-skills:test-driven-development skill.

Read the spec (`.teikk/spec/SPEC.md`, falling back to `.teikk/SPEC.md`) to determine the platform before routing tests. If `.teikk/tasks/todo.md` exists, also read its `**Current task:**` line and jump to that task's `## Task N:` section in `.teikk/tasks/plan.md` for the specific acceptance criteria to verify — don't re-scan the whole plan. This is a read-only lookup; `/teikk-test` does not update `todo.md`.

For new features:
1. Write tests that describe the expected behavior (they should FAIL)
2. Implement the code to make them pass
3. Refactor while keeping tests green

For bug fixes (Prove-It pattern):
1. Write a test that reproduces the bug (must FAIL)
2. Confirm the test fails
3. Implement the fix
4. Confirm the test passes
5. Run the full test suite for regressions

## Platform routing

| Platform | Test frameworks | Also read |
|----------|----------------|-----------|
| Android (Kotlin) | JUnit 5, MockK, Turbine, ComposeTestRule | `skills/android-testing-and-benchmark-kotlin/SKILL.md` |
| Android (Java) | JUnit 4, Mockito, Espresso | `skills/android-testing-and-benchmark-java/SKILL.md` |
| iOS | XCTest, XCTestExpectation, async throws | `agents/swift-expert.md` |
| Flutter | `flutter_test`, WidgetTester, Mocktail | `agents/flutter-expert.md` |

**Not for E2E user journeys** — use `/teikk-e2e` when SPEC declares E2E opt-in or for multi-screen smoke tests.

## Audit (recommended for non-trivial changes)

After the test suite passes, optionally spawn `test-engineer` as a sub-agent to audit test quality. This is Pattern 1 (direct invocation, single perspective — see `references/orchestration-patterns.md`) using the same `test-engineer` persona `/teikk-ship` runs in its fan-out, so the audit criteria do not drift between the test and ship phases.

The sub-agent:
- Disqualifies mock-only, boilerplate (`ExampleUnitTest`), and label-only tests — they count as zero coverage for the AC they claim to cover
- Verifies the data layer has a real in-memory DAO test (integration, not a mocked repository)
- Returns a one-line verdict (`PASS` / `has-gaps: <file list>`)

**When to spawn:** the change touches auth, payments, data, or config layers; OR the test count is high (>30) and a quick audit is cheaper than re-reading everything; OR this is a pre-ship gate where consistency with `/teikk-ship`'s audit matters. **Skip for trivial changes** (<3 test files, no auth/payments/data) — the sub-agent invocation cost is wasted on small diffs.

**Optional telemetry:** after the audit (or after the test run if skipping the audit), source `hooks/emit.sh` and emit `verification_passed ok` or `verification_failed err` with the test count in meta. This feeds the offline Framework Score — see `references/observability-and-benchmark.md`.
