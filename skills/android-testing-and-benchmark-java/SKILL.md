---
name: android-testing-and-benchmark-java
description: Implements unit testing and performance benchmarking in Java. Use when writing Java JUnit tests, Mockito unit/integration tests, Espresso UI tests, or Macrobenchmark configurations.
---

# Android Testing and Benchmarking (Java Stack)

## Overview

Perform unit testing, XML-based UI testing, and performance benchmarking on Java Android projects. Ensure correct execution boundaries and regression protection.

## When to Use

- Use when writing unit tests for Java-based Android code, ViewModels, or Repositories.
- Use when setting up mock objects and stubbing return values using Mockito in Java.
- Use when designing UI tests for XML layout files, Activities, or Fragments using Espresso.
- Use when configuring performance Benchmarks inside a Java-based app module.
- Do NOT use for Kotlin-based project components, MockK, or Jetpack Compose UI tests (use `android-testing-and-benchmark-kotlin` instead).

## Core Process

### 1. Java Unit Testing with JUnit & Mockito
- **Mocking**: Use Mockito (`Mockito.mock()`) to isolate dependencies.
- **RxJava Testing**: Override Schedulers in tests to run all asynchronous tasks synchronously on a single thread.

```java
public class TaskViewModelTest {

    @Rule
    public InstantTaskExecutorRule instantTaskExecutorRule = new InstantTaskExecutorRule();

    private GetTasksUseCase getTasksUseCase;
    private TaskViewModel viewModel;

    @Before
    public void setUp() {
        // Mock dependencies
        getTasksUseCase = Mockito.mock(GetTasksUseCase.class);

        // Force RxJava to execute synchronously in tests
        RxAndroidPlugins.setInitMainThreadSchedulerHandler(scheduler -> Schedulers.trampoline());
        RxJavaPlugins.setIoSchedulerHandler(scheduler -> Schedulers.trampoline());

        // Setup mock response
        List<Task> tasks = Collections.singletonList(new Task("1", "Java Task", false));
        Mockito.when(getTasksUseCase.execute()).thenReturn(Single.just(tasks));
    }

    @Test
    public void loadTasks_Success_UpdatesLiveData() {
        viewModel = new TaskViewModel(getTasksUseCase);
        viewModel.loadTasks();

        assertNotNull(viewModel.getUiState().getValue());
        assertEquals(1, viewModel.getUiState().getValue().getTasks().size());
        assertEquals("Java Task", viewModel.getUiState().getValue().getTasks().get(0).getTitle());
    }

    @After
    public void tearDown() {
        RxAndroidPlugins.reset();
        RxJavaPlugins.reset();
    }
}
```

### 2. UI Testing with Espresso
- Test XML layout screens, button clicks, and screen transitions using Android Espresso UI testing APIs.

```java
@RunWith(AndroidJUnit4.class)
@LargeTest
public class TaskListActivityTest {

    @Rule
    public ActivityScenarioRule<TaskListActivity> activityRule =
            new ActivityScenarioRule<>(TaskListActivity.class);

    @Test
    public void taskListScreen_displayHeader() {
        // Verify view is displayed and contains correct title
        onView(withId(R.id.recyclerView)).check(matches(isDisplayed()));
        onView(withText("Java Tasks")).check(matches(isDisplayed()));
    }
}
```

### 3. Macrobenchmark in Java
- Measure app cold/warm startup times and frame drawing performance using Java Android JUnit benchmark wrappers.

```java
@RunWith(AndroidJUnit4.class)
@LargeTest
public class StartupBenchmark {

    @Rule
    public MacrobenchmarkRule benchmarkRule = new MacrobenchmarkRule();

    @Test
    public void startupCold() {
        benchmarkRule.measureRepeated(
            "com.example.tasks.java",
            Collections.singletonList(new StartupTimingMetric()),
            CompilationMode.DEFAULT,
            5,
            setupBlock -> {
                // Perform actions before startup (like pressing home)
                return null;
            },
            measureBlock -> {
                // Launch app under test
                return null;
            }
        );
    }
}
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Mockito mocks are enough, I don't need real device tests" | Mockito mocks can hide integration bugs. You need Espresso to verify that clicks trigger layouts and that XML files load without inflation crashes. |
| "I'll test my RxJava flows using standard async calls in JUnit" | Java unit tests exit immediately before background threads (like Schedulers.io()) finish. You must override Schedulers to Schedulers.trampoline() or use TestObserver. |
| "Writing Espresso tests takes too long because of UI updates" | Espresso handles synchronization with UI events automatically. Using it prevents regressions in critical user flows. |

## Red Flags

- Espresso tests containing manual `Thread.sleep` calls to wait for views (causes flakiness; use IdlingResources instead).
- Missing `InstantTaskExecutorRule` rule when testing LiveData inside ViewModels (causes "Method getMainLooper not mocked" error).
- Not calling `RxJavaPlugins.reset()` after completing tests that modified schedulers (causes cross-test contamination).
- Mocking Android framework classes (like `Bundle`, `Intent`, `Context`) instead of using mock contexts or instrumentation.

## Verification

- [ ] All unit tests pass: `./gradlew test`.
- [ ] No thread leaks or test contamination from RxJava scheduler overrides.
- [ ] Espresso tests execute without flakiness (running on an active emulator/device).
- [ ] LiveData assertions are wrapped within an `InstantTaskExecutorRule` context.
- [ ] Obfuscated R8 builds do not break Espresso layout mappings.
