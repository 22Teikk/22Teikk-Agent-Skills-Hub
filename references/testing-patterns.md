# Testing Patterns Reference

Quick reference for common testing patterns in Android development. Use alongside the `android-testing-and-benchmark-*` skills.

## Table of Contents
- [Kotlin Unit Testing (MockK)](#kotlin-unit-testing-mockk)
- [Java Unit Testing (Mockito)](#java-unit-testing-mockito)
- [Compose UI Testing (Kotlin)](#compose-ui-testing-kotlin)
- [Espresso UI Testing (Java/XML)](#espresso-ui-testing-javaxml)
- [Test Anti-Patterns](#test-anti-patterns)

## Kotlin Unit Testing (MockK)

### Standard Test Structure
Use the Arrange-Act-Assert pattern for unit testing ViewModels and repositories.

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class TaskRepositoryTest {
    private val apiService = mockk<TaskApiService>()
    private val taskDao = mockk<TaskDao>(relaxed = true)
    
    private lateinit var repository: TaskRepositoryImpl

    @Test
    fun getTasks_fetchesFromApiAndSavesToDb() = runTest {
        // Arrange
        val remoteTasks = listOf(TaskDto("1", "Buy Milk", false))
        coEvery { apiService.fetchTasks() } returns remoteTasks
        repository = TaskRepositoryImpl(apiService, taskDao)

        // Act
        val result = repository.getTasks()

        // Assert
        assertEquals(1, result.size)
        assertEquals("Buy Milk", result[0].title)
        coVerify(exactly = 1) { taskDao.insertTasks(any()) }
    }
}
```

## Java Unit Testing (Mockito)

### Schedulers Override & Assertions
When testing Java RxJava-based systems, override Schedulers to run synchronously.

```java
public class TaskViewModelTest {

    @Rule
    public InstantTaskExecutorRule instantTaskExecutorRule = new InstantTaskExecutorRule();

    private GetTasksUseCase getTasksUseCase;
    private TaskViewModel viewModel;

    @Before
    public void setUp() {
        getTasksUseCase = Mockito.mock(GetTasksUseCase.class);
        
        RxAndroidPlugins.setInitMainThreadSchedulerHandler(scheduler -> Schedulers.trampoline());
        RxJavaPlugins.setIoSchedulerHandler(scheduler -> Schedulers.trampoline());
    }

    @Test
    public void loadTasks_success_postsToLiveData() {
        // Arrange
        List<Task> tasks = Collections.singletonList(new Task("1", "Clean Room", false));
        Mockito.when(getTasksUseCase.execute()).thenReturn(Single.just(tasks));
        viewModel = new TaskViewModel(getTasksUseCase);

        // Act
        viewModel.loadTasks();

        // Assert
        assertEquals(tasks, viewModel.getTasksLiveData().getValue());
    }
}
```

## Compose UI Testing (Kotlin)

### Node Interaction & Finding Elements
Use semantic selectors to interact with Jetpack Compose elements.

```kotlin
class TaskItemTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun taskItem_showsTitleAndHandlesClicks() {
        var clicked = false
        val task = Task("1", "Practice Piano", false)

        composeTestRule.setContent {
            TaskItem(task = task, onClick = { clicked = true })
        }

        // Assert title displayed
        composeTestRule.onNodeWithText("Practice Piano").assertIsDisplayed()

        // Perform click and assert event triggered
        composeTestRule.onNodeWithText("Practice Piano").performClick()
        assertTrue(clicked)
    }
}
```

## Espresso UI Testing (Java/XML)

### Action & View Assertions
Interact with XML layouts and RecyclerViews.

```java
@RunWith(AndroidJUnit4.class)
@LargeTest
public class MainActivityTest {

    @Rule
    public ActivityScenarioRule<MainActivity> activityRule =
            new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void clickAddTaskButton_opensDialog() {
        // Click floating action button
        onView(withId(R.id.fab_add_task)).perform(click());

        // Check if add task dialog header is shown
        onView(withText("Add New Task")).check(matches(isDisplayed()));
    }
}
```

## Test Anti-Patterns

| Anti-Pattern | Problem | Better Approach |
|---|---|---|
| Mocking everything | Green tests but app crashes at runtime | Use real database/Room in local tests when possible |
| Leaking Main Schedulers | Multithreading race conditions in Java/RxJava tests | Override Schedulers with `Schedulers.trampoline()` |
| Thread.sleep in UI tests | Tests become slow and flaky | Use Compose wait/IdlingResources for async updates |
| Direct View/State manipulation | Doesn't simulate real user actions | Simulate interactions via Compose Nodes or Espresso |
