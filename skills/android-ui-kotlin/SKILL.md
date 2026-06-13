---
name: android-ui-kotlin
description: Builds Android user interfaces using Kotlin and Jetpack Compose. Use when creating or modifying Compose screens, Composables, MVVM ViewModels, Navigation Compose routes, or loading images via Coil.
---

# Android UI Engineering (Kotlin & Jetpack Compose)

## Overview

Build high-quality, responsive, accessible, and performant Android user interfaces using Kotlin and Jetpack Compose. Adhere to MVVM + Clean Architecture, modern Compose states, type-safe Navigation Compose, and efficient image loading with Coil.

## When to Use

- Use when developing user interfaces in Kotlin-based Android projects.
- Use when creating new Compose screens or individual Composable components.
- Use when setting up MVVM ViewModels that expose screen UI state.
- Use when implementing application navigation using Navigation Compose.
- Do NOT use when working on traditional Android projects built with Java or XML-only Layouts (use `android-ui-java` instead).

## Core Process

### 1. MVVM + Clean Architecture
- **View (Composables)**: Dumb presentation layer. Only renders state and propagates user events.
- **ViewModel**: Holds UI state using `StateFlow` and handles UI logic. Interacts with Use Cases/Repositories.
- **UI State**: Exposed as a single read-only data class representing the screen state.

```kotlin
// UI State Pattern
data class TaskUiState(
    val tasks: List<Task> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

// ViewModel Example
@HiltViewModel
class TaskViewModel @Inject constructor(
    private val getTasksUseCase: GetTasksUseCase
) : ViewModel() {
    private val _uiState = MutableStateFlow(TaskUiState(isLoading = true))
    val uiState: StateFlow<TaskUiState> = _uiState.asStateFlow()

    init {
        loadTasks()
    }

    fun loadTasks() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                getTasksUseCase().collect { tasks ->
                    _uiState.update { it.copy(tasks = tasks, isLoading = false) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(errorMessage = e.message, isLoading = false) }
            }
        }
    }
}
```

### 2. State Hoisting & Recomposition Optimization
- **State Hoisting**: Keep Composables stateless by passing state down and events up.
- **Recomposition Optimization**: Use `@Stable` and `@Immutable` on domain/data classes passed to Composables. Use `remember` and `rememberSaveable` to cache values across recompositions.
- **Use key in LazyLists**: Always use `key` inside `LazyColumn` or `LazyRow` to prevent unnecessary items recomposition.

```kotlin
// Good: Stateless Composable with State Hoisting
@Composable
fun TaskListScreen(
    viewModel: TaskViewModel,
    onNavigateToDetail: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    TaskListContent(
        state = state,
        onTaskClick = onNavigateToDetail,
        onRefresh = { viewModel.loadTasks() }
    )
}

@Composable
fun TaskListContent(
    state: TaskUiState,
    onTaskClick: (String) -> Unit,
    onRefresh: () -> Unit
) {
    if (state.isLoading) {
        LoadingSpinner()
    } else if (state.errorMessage != null) {
        ErrorScreen(message = state.errorMessage, onRetry = onRefresh)
    } else {
        LazyColumn {
            items(items = state.tasks, key = { it.id }) { task ->
                TaskItem(task = task, onClick = { onTaskClick(task.id) })
            }
        }
    }
}
```

### 3. Type-Safe Navigation Compose
- Define destinations using type-safe routes (via `kotlinx.serialization` integration in Navigation Compose).

```kotlin
@Serializable
object TaskListDestination

@Serializable
data class TaskDetailDestination(val taskId: String)

@Composable
fun AppNavHost(navController: NavHostController) {
    NavHost(navController = navController, startDestination = TaskListDestination) {
        composable<TaskListDestination> {
            TaskListScreen(onNavigateToDetail = { id ->
                navController.navigate(TaskDetailDestination(id))
            })
        }
        composable<TaskDetailDestination> { backStackEntry ->
            val detail: TaskDetailDestination = backStackEntry.toRoute()
            TaskDetailScreen(taskId = detail.taskId)
        }
    }
}
```

### 4. Efficient Image Loading with Coil
- Use `AsyncImage` for asynchronous image loading. Configure crossfade, placeholders, and error fallbacks.

```kotlin
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(imageUrl)
        .crossfade(true)
        .placeholder(R.drawable.placeholder)
        .error(R.drawable.error)
        .build(),
    contentDescription = stringResource(R.string.task_image_desc),
    modifier = Modifier.fillMaxWidth().height(200.dp),
    contentScale = ContentScale.Crop
)
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This screen is very simple, we don't need a ViewModel" | Simple screens grow. Using a ViewModel from the start ensures state is retained during configuration changes (device rotation, theme switch). |
| "I'll add content descriptions for accessibility later" | Adding accessibility descriptors during development prevents refactoring debt. All non-decorative elements need descriptive labels. |
| "Passing the ViewModel to sub-composables is easier" | It couples sub-composables to the ViewModel, making them non-reusable and difficult to preview or unit-test. Hoist state and pass lambdas. |

## Red Flags

- Composables containing direct database queries or repository calls.
- Passing `ViewModel` instances to lower-level child Composables (violating state hoisting).
- Not using `key` in `LazyColumn`/`LazyRow` items (causes performance issues).
- Modifying State Flow values directly from Compose UI without invoking a ViewModel function.
- Hardcoded string values for user-visible UI text (use `stringResource(R.string.id)` instead).

## Verification

- [ ] UI state is derived from ViewModel state flows and collected using `collectAsStateWithLifecycle()`.
- [ ] No direct business logic or data source access in Composable files.
- [ ] All lists in Lazy layouts have unique `key` parameters.
- [ ] Accessible semantics and content descriptions are provided for screen readers (TalkBack).
- [ ] UI layouts scale correctly when device font size is increased.
