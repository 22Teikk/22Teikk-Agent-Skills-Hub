---
name: android-testing-and-benchmark-kotlin
description: Implements unit testing and performance benchmarking in Kotlin. Use when writing Kotlin JUnit tests, MockK unit/integration tests, Compose UI tests, or Macrobenchmark files.
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

### 3. Macrobenchmark for Startup and Frame Performance
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
- Not setting a custom test dispatcher when testing ViewModels that launch coroutines.
- Running Macrobenchmarks on virtual emulators without disabling baseline checks (results will be highly variable and inaccurate).
- UI tests that search for elements using physical positions (x, y coordinates) rather than semantics/tags.

## Verification

- [ ] All JVM unit tests pass: `./gradlew test`.
- [ ] No warnings about un-mocked loops or Main dispatcher during test executions.
- [ ] Coroutine unit tests use `runTest` and appropriate test schedulers.
- [ ] UI tests assert element visibility using Compose semantics nodes.
- [ ] Macrobenchmarks are configured inside a separate module and execute correctly.
