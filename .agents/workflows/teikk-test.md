# Run TDD workflow — write failing tests, implement, verify. For bugs, use the Prove-It pattern.

Read and follow `skills/test-driven-development/SKILL.md`.

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
