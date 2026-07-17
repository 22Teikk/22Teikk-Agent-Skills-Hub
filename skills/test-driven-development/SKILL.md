---
name: test-driven-development
description: Guides Red-Green-Refactor development. Use when implementing any new logic or fixing bugs. Use when you need to write tests, design test suites, or debug failing tests.
---

# Test-Driven Development (TDD)

## Overview

Write a failing test before writing the code that makes it pass. For bug fixes, reproduce the bug with a test before attempting a fix. Tests are proof — "seems right" is not done. A codebase with good tests is an AI agent's superpower; a codebase without tests is a liability.

## When to Use

- Implementing any new logic or behavior in Kotlin/Java.
- Fixing any bug (the Prove-It Pattern).
- Modifying existing functionality.
- Adding edge case handling.
- Any change that could break existing behavior.

**When NOT to use:** Pure configuration changes, documentation updates, or static resource assets (like images or drawables) that have no behavioral impact.

**Related:** For Android UI and rendering changes, combine TDD with runtime verification — see the Android UI and Runtime Verification section below.

## Finding the task after context is cleared

`/teikk-test` runs after `/teikk-build`, often in a session that lost the context of which task was just implemented. Don't re-read the full `.teikk/tasks/plan.md` to figure out what to test — read `.teikk/tasks/todo.md`'s `**Current task:**` line first (format defined in `planning-and-task-breakdown`'s Step 6). That line names the task; jump straight to its `## Task N:` section in `plan.md` for the acceptance criteria and behavioral-test mappings that section demands. This is a read-only lookup here — `/teikk-test` does not flip `todo.md` checkboxes, that's `/teikk-build`'s job.

## The TDD Cycle

```
    RED                GREEN              REFACTOR
 Write a test    Write minimal code    Clean up the
 that fails  ──→  to make it pass  ──→  implementation  ──→  (repeat)
      │                  │                    │
      ▼                  ▼                    ▼
   Test FAILS        Test PASSES         Tests still PASS
```

### Step 1: RED — Write a Failing Test

Write the test first. It must fail. A test that passes immediately proves nothing.

```kotlin
// RED: This test fails because createTask doesn't exist yet in TaskRepository
class TaskRepositoryTest {
    private val repository = TaskRepository()

    @Test
    fun testCreateTask_createsTaskWithTitleAndPendingStatus() {
        val task = repository.createTask("Buy Milk")
        
        assertNotNull(task.id)
        assertEquals("Buy Milk", task.title)
        assertEquals(TaskStatus.PENDING, task.status)
        assertNotNull(task.createdAt)
    }
}
```

### Step 2: GREEN — Make It Pass

Write the minimum code to make the test pass. Don't over-engineer:

```kotlin
// GREEN: Minimal implementation
class TaskRepository {
    private val tasks = mutableListOf<Task>()

    fun createTask(title: String): Task {
        val task = Task(
            id = UUID.randomUUID().toString(),
            title = title,
            status = TaskStatus.PENDING,
            createdAt = System.currentTimeMillis()
        )
        tasks.add(task)
        return task
    }
}
```

### Step 3: REFACTOR — Clean Up

With tests green, improve the code without changing behavior:
- Extract shared logic.
- Improve naming.
- Remove duplication.
- Optimize if necessary.

Run tests after every refactor step to confirm nothing broke.

---

## The Prove-It Pattern (Bug Fixes)

When a bug is reported, **do not start by trying to fix it.** Start by writing a test that reproduces it.

```
Bug report arrives
       │
       ▼
  Write a test that demonstrates the bug
       │
       ▼
  Test FAILS (confirming the bug exists)
       │
       ▼
  Implement the fix
       │
       ▼
  Test PASSES (proving the fix works)
       │
       ▼
  Run full test suite (no regressions)
```

**Example:**
```kotlin
// Bug: "Completing a task doesn't update the completedAt timestamp"

// Step 1: Write the reproduction test (it should FAIL)
@Test
fun testCompleteTask_updatesCompletedAtTimestamp() {
    val task = repository.createTask("Test Bug")
    val completedTask = repository.completeTask(task.id)

    assertEquals(TaskStatus.COMPLETED, completedTask.status)
    assertNotNull(completedTask.completedAt) // This assertion fails -> bug confirmed
}

// Step 2: Fix the bug
fun completeTask(id: String): Task {
    val index = tasks.indexOfFirst { it.id == id }
    if (index == -1) throw NotFoundException()
    val updated = tasks[index].copy(
        status = TaskStatus.COMPLETED,
        completedAt = System.currentTimeMillis() // This was missing
    )
    tasks[index] = updated
    return updated
}

// Step 3: Test passes -> bug fixed, regression guarded
```

---

## The Test Pyramid

Invest testing effort according to the pyramid — most tests should be small and fast, with progressively fewer tests at higher levels:

```
          ╱╲
         ╱  ╲         E2E / Instrument Instrumented Tests (~5%)
        ╱    ╲        Full user flows, real device / emulator
       ╱──────╲
      ╱        ╲      Integration Tests (~15%)
     ╱          ╲     ViewModel + LiveData/Flow, Room Database
    ╱────────────╲
   ╱              ╲   Unit Tests (~80%)
  ╱                ╲  Pure business logic, isolated repository/use cases
 ╱──────────────────╲
```

**The Beyonce Rule:** If you liked it, you should have put a test on it. Infrastructure changes, refactoring, and migrations are not responsible for catching your bugs — your tests are. If a change breaks your code and you didn't have a test for it, that's on you.

### Test Sizes (Resource Model)

Beyond the pyramid levels, classify tests by what resources they consume:

| Size | Constraints | Speed | Example |
|------|------------|-------|---------|
| **Small** | Single JVM process, no I/O, no network, no database. | Milliseconds | Pure business logic, mapper tests |
| **Medium** | Multi-process OK, localhost database/Room in-memory, no external networks. | Seconds | Room DB migrations, ViewModel tests with fake network clients |
| **Large** | Multi-device OK, requires emulator or physical device. | Minutes | Espresso/Compose UI tests, performance benchmarks |

---

## Writing Good Tests

### 1. Test State, Not Interactions

Assert on the *outcome* of an operation, not on which methods were called internally. Tests that verify method call sequences break when you refactor, even if the behavior is unchanged.

```kotlin
// Good: Tests what the function does (state-based)
@Test
fun testGetTasks_returnsTasksSortedByCreationDateNewestFirst() {
    repository.createTask("Task A")
    repository.createTask("Task B")
    val tasks = repository.getTasks(sortBy = SortOrder.NEWEST)
    
    assertTrue(tasks[0].createdAt > tasks[1].createdAt)
}

// Bad: Tests how the function works internally (interaction-based)
@Test
fun testGetTasks_callsDaoWithQuery() {
    repository.getTasks(sortBy = SortOrder.NEWEST)
    coVerify { taskDao.getTasksOrderedByDateDesc() } // Breaks if we change Room query name
}
```

### 2. DAMP Over DRY in Tests

In production code, DRY (Don't Repeat Yourself) is usually right. In tests, **DAMP (Descriptive And Meaningful Phrases)** is better. A test should read like a specification — each test should tell a complete story without requiring the reader to trace through shared helpers.

```kotlin
// DAMP: Each test is self-contained and readable
@Test
fun testCreateTask_rejectsEmptyTitle() {
    assertFailsWith<IllegalArgumentException> {
        repository.createTask("")
    }
}

@Test
fun testCreateTask_trimsWhitespaceFromTitle() {
    val task = repository.createTask("   Clean Kitchen   ")
    assertEquals("Clean Kitchen", task.title)
}
```

Duplication in tests is acceptable when it makes each test independently understandable.

### 3. Prefer Real Implementations Over Mocks

Use the simplest test double that gets the job done. The more your tests use real code, the more confidence they provide.

```
Preference order (most to least preferred):
1. Real implementation  → Highest confidence, catches real integration bugs
2. Fake                 → In-memory version of a dependency (e.g., Room in-memory DB)
3. Stub                 → Returns canned data, no logic (e.g., mock returning fixed item)
4. Mock (interaction)   → Verifies method calls — use sparingly
```

**Use mocks only when:** the real implementation is too slow, non-deterministic, or has side effects you can't control (external network APIs, Firebase calls).

### What counts as a "behavioral test" (and what does not)

A test only proves an acceptance criterion if it is **behavioral**: it executes real logic or real infrastructure and asserts on a **value or observable outcome**. This is the unit of coverage the traceability gate and `/teikk-ship` count. The following prove nothing and count as **zero coverage** — flag them, don't tally them:

| Not a behavioral test | Why it proves nothing |
|-----------------------|-----------------------|
| **Boilerplate template** — `ExampleUnitTest` asserting `2 + 2 == 4`, `ExampleInstrumentedTest` checking the package name | Tests the toolchain, not your app. Delete before ship. |
| **Mock-verification of the unit under test** — mock the repository to return `750.0`, then assert the state is `750.0` | Tautology: you asserted the mock, not the logic that was supposed to compute `750.0`. |
| **Assertion-less / label-only** — no value assertion, or only `assertVisible("Total Balance")` on a static label | Passes even when the real number is wrong or the list never rendered. |

Rule of thumb: if the test would still pass after you **broke the real implementation**, it is not behavioral. For the data layer this means at least one **real Room in-memory** DAO test (insert → query/`SUM` → assert the exact value), not a mocked repository. "PARTIAL" coverage of an AC is **not done**.

---

## Android UI and Runtime Verification

For anything that renders on device, unit tests alone aren't enough — you need runtime verification. Use Android Studio Layout Inspector, Logcat logs, and CPU Profiler to verify app state.

### Runtime Verification Workflow

1. **Reproduce**: Run the application on an emulator or real device.
2. **Inspect**: Check Logcat for exceptions or warning logs. Verify UI rendering visually.
3. **Diagnose**: Compare actual layout vs expected. Use Layout Inspector to check Compose semantic nodes or XML hierarchies.
4. **Fix**: Implement the fix in Kotlin/Java or XML.
5. **Verify**: Rerun, check logs, and run automated tests.

For detailed testing guidelines, see `skills/android-testing-and-benchmark-kotlin/SKILL.md` or `skills/android-testing-and-benchmark-java/SKILL.md`.

---

## When to Use Subagents for Testing

For complex bug fixes, spawn a subagent to write the reproduction test:

```
Main agent: "Spawn a subagent to write a test that reproduces this bug:
[bug description]. The test should fail with the current code."

Subagent: Writes the reproduction test in Android tests directory.

Main agent: Verifies the test fails, then implements the fix,
then verifies the test passes.
```

This separation ensures the test is written without knowledge of the fix, making it more robust.

## See Also

- For detailed testing patterns and examples, see `references/testing-patterns.md`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll write tests after the code works" | You won't. And tests written after the fact test implementation details, not expected behavior. |
| "This is too simple to test" | Simple code gets complicated. The test documents the expected behavior from day one. |
| "Tests slow me down" | Tests slow you down now. They speed you up every time you modify the code later. |
| "I tested it manually" | Manual testing doesn't persist. Tomorrow's change might break it with no way to know. |

## Red Flags

- Writing code without any corresponding tests.
- Tests that pass on the first run before any implementation code is written.
- "All tests pass" but no tests were actually run.
- Bug fixes without reproduction tests.
- Test names that don't describe the expected behavior.
- Running the same test command twice in a row without any intervening code change.

## Verification

After completing any implementation:

- [ ] Every new behavior has a corresponding unit/instrumentation test.
- [ ] All tests pass: `./gradlew test` (or task-specific equivalent).
- [ ] Bug fixes include a reproduction test that failed before the fix.
- [ ] Test names describe the behavior being verified.
- [ ] No tests were skipped or disabled.
- [ ] If `.teikk/tasks/todo.md` exists, its `**Current task:**` pointer was checked before testing (not re-derived by re-reading the full plan)
