---
name: android-testing-and-benchmark-kotlin
description: Implements unit testing and performance benchmarking in Kotlin. Use when writing Kotlin JUnit tests, MockK unit/integration tests, Compose UI tests, or Macrobenchmark files.
version: 1.0.0
platform: android
---

# Android Testing and Benchmarking (Kotlin Stack)

## Overview

Ensure application correctness and performance stability. Write robust Unit Tests, Compose UI tests, and performance Macrobenchmarks in Kotlin to prevent regressions.

## When to Use

- Use when writing unit tests for Kotlin code, ViewModels, Use Cases, or Repositories.
- Use when setting up test doubles, mocks, or stubs using MockK.
- Use when designing UI tests for Jetpack Compose screens or components.
- Use when measuring startup times, jank, or frame rendering metrics using Jetpack Macrobenchmark.
- Do NOT use for Java-based view layouts (XML), Mockito-based tests, or Espresso View tests (use `android-testing-and-benchmark-java` instead).

## Core Process

### 1. Kotlin Unit Testing with JUnit & MockK
- **Mocking**: Use MockK (`mockk()`) to isolate components.
- **Coroutines Testing**: Use `kotlinx-coroutines-test`. Rule: Switch dispatchers inside tests using `StandardTestDispatcher` and `runTest`.

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class TaskViewModelTest {

    private val getTasksUseCase = mockk<GetTasksUseCase>()
    private val testDispatcher = StandardTestDispatcher()
    
    private lateinit var viewModel: TaskViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        coEvery { getTasksUseCase() } returns flowOf(listOf(Task("1", "Test Task", false)))
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `loadTasks success updates uiState`() = runTest {
        viewModel = TaskViewModel(getTasksUseCase)
        
        // Let initialization coroutine run
        testScheduler.advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(1, state.tasks.size)
        assertEquals("Test Task", state.tasks[0].title)
    }
}
```

### 2. Jetpack Compose UI Testing
- Use the Compose rule to test layouts, state reactions, and screen flow without launching the full application.

```kotlin
class TaskListContentTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun taskList_showsTasks() {
        val tasks = listOf(Task("1", "Buy Milk", false))
        
        composeTestRule.setContent {
            TaskListContent(
                state = TaskUiState(tasks = tasks),
                onTaskClick = {},
                onRefresh = {}
            )
        }

        composeTestRule.onNodeWithText("Buy Milk").assertIsDisplayed()
    }
}
```

### 3. Room In-Memory DAO Integration Tests (mandatory for the data layer)

The data layer must have **≥1 test against a real Room database**, not a mocked repository. A mock that returns `750.0` and then asserts `750.0` proves nothing — it never touches SQL, so a wrong column type, a bad `SUM`, or a broken query ships green. Use an **in-memory** database (fast, real).

```kotlin
@RunWith(AndroidJUnit4::class)
class TransactionDaoTest {
    private lateinit var db: AppDatabase
    private lateinit var dao: TransactionDao

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), AppDatabase::class.java
        ).allowMainThreadQueries().build()
        dao = db.transactionDao()
    }

    @After fun tearDown() = db.close()

    @Test
    fun insertThenSum_returnsExactTotalInMinorUnits() = runTest {
        dao.insert(TransactionEntity(amountMinor = 2550))   // 25.50
        dao.insert(TransactionEntity(amountMinor = 1099))   // 10.99
        val total = dao.totalMinor().first()
        assertEquals(3649L, total)                          // exact — no float drift
    }
}
```

This is the test that catches money-as-`Double`: with `Double` columns the sum drifts; with `Long` minor units it is exact. See `references/domain-guardrails.md` for the finance rules.

### 4. Macrobenchmark for Startup and Frame Performance
- Run Macrobenchmarks on real devices to measure Cold/Warm/Hot startup times and frame rendering jank (Frame Overrun).

```kotlin
@RunWith(AndroidJUnit4::class)
@LargeTest
class StartupBenchmark {

    @get:Rule
    val benchmarkRule = MacrobenchmarkRule()

    @Test
    fun startupCold() = benchmarkRule.measureRepeated(
        packageName = "com.example.tasks",
        metrics = listOf(StartupTimingMetric()),
        compilationMode = CompilationMode.DEFAULT,
        iterations = 5,
        setupBlock = {
            pressHome()
        }
    ) {
        startActivityAndWait()
    }
}
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Testing UI flows inside standard JVM unit tests is enough" | JVM unit tests run on mock views or Robolectric, which cannot capture real device rendering behavior, jank, or Android OS integration quirks. Run UI tests on Compose rules or Emulators. |
| "Writing benchmarks is too slow and requires specific setups" | Benchmarking prevents shipping regressions (like cold startup slowness or heavy scrolling frame drops) that ruin user experience and lower Play Store rankings. |
| "I don't need Dispatchers.setMain because my ViewModel uses viewModelScope" | In standard unit tests, the main thread loop does not run. Not overriding it with a test dispatcher causes crashes with "Looper not mocked" or concurrent execution failures. |

## Red Flags

- Tests that rely on `Thread.sleep` to wait for coroutines or background operations to complete.
- Mocking classes you do not own (like Android SDK classes, Context, database drivers, or remote APIs).
- **Mock-verification tests** — mocking the very component under test (mock repo returns the expected value, then assert that value). Tautological; counts as zero coverage.
- **Boilerplate template tests** left in the suite (`ExampleUnitTest` `2+2==4`, `ExampleInstrumentedTest` package check) — delete them; never count them.
- Data layer "tested" only through mocked repositories, with no Room in-memory DAO test.
- Not setting a custom test dispatcher when testing ViewModels that launch coroutines.
- Running Macrobenchmarks on virtual emulators without disabling baseline checks (results will be highly variable and inaccurate).
- UI tests that search for elements using physical positions (x, y coordinates) rather than semantics/tags.

## Verification

- [ ] All JVM unit tests pass: `./gradlew test`.
- [ ] No warnings about un-mocked loops or Main dispatcher during test executions.
- [ ] Coroutine unit tests use `runTest` and appropriate test schedulers.
- [ ] UI tests assert element visibility using Compose semantics nodes.
- [ ] Macrobenchmarks are configured inside a separate module and execute correctly.

### 4. E2E journeys (optional — Maestro)

For multi-screen critical flows only. **Do not use this section for every project.**

- Invoke `/teikk-e2e` or read `skills/android-e2e-maestro/SKILL.md`.
- Keep unit + Compose component tests in this skill; Maestro covers cross-screen journeys only.
- Declare in SPEC: `E2E: none` or `E2E: Maestro — flows: [...]`.

## Common Rationalizations
