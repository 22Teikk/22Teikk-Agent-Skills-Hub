---
name: android-data-and-concurrency-kotlin
description: Handles data operations and concurrency in Kotlin. Use when writing Kotlin Coroutines, flows (StateFlow, SharedFlow), Retrofit network requests, Kotlin Serialization converters, or Room database operations.
---

# Android Data and Concurrency (Kotlin Stack)

## Overview

Manage asynchronous data streams, networking, serialization, and local databases in Kotlin. Follow Clean Architecture by separating concerns between network sources, local Room databases, repositories, and domain thread-concurrency boundaries.

## When to Use

- Use when implementing data layer components, repositories, or data sources in Kotlin-based Android apps.
- Use when designing network requests using Retrofit and OkHttp in Kotlin.
- Use when serializing/deserializing JSON payloads using Kotlin Serialization.
- Use when configuring Room database access, tables, entities, or DAOs.
- Use when handling async execution via Coroutines (Scope, Dispatchers) and Flow API.
- Do NOT use when writing Java code or using RxJava/CompletableFuture for concurrency (use `android-data-and-concurrency-java` instead).

## Core Process

### 1. Coroutines & Dispatchers
- **ViewModel Scope**: Always launch coroutines on the UI thread using `viewModelScope.launch` and switch dispatchers explicitly inside use-cases or repositories.
- **Thread Safety**: Network calls and database writes must run on `Dispatchers.IO`. Use `withContext(Dispatchers.IO)` in repositories.

```kotlin
class TaskRepositoryImpl @Inject constructor(
    private val apiService: TaskApiService,
    private val taskDao: TaskDao
) : TaskRepository {
    override suspend fun getTasks(): List<Task> = withContext(Dispatchers.IO) {
        val remoteTasks = apiService.fetchTasks()
        taskDao.insertTasks(remoteTasks.map { it.toEntity() })
        taskDao.getTasksOnce()
    }
}
```

### 2. Reactive Data Streams with Kotlin Flow
- **Room Integration**: Return `Flow<List<Entity>>` from DAOs to get real-time updates from database.
- **Flow Collection**: Always collect flows in UI using `collectAsStateWithLifecycle()` to respect Android Lifecycle and save resources.
- **StateFlow vs SharedFlow**: Use `StateFlow` for state (requires initial value), use `SharedFlow` or `Channel` for one-time events (like navigation, toast alerts).

```kotlin
@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks")
    fun getTasksFlow(): Flow<List<TaskEntity>>
}
```

### 3. Retrofit + Kotlin Serialization
- Define DTO data classes annotated with `@Serializable` and use `kotlinx.serialization` converter.

```kotlin
@Serializable
data class TaskDto(
    @SerialName("id") val id: String,
    @SerialName("title") val title: String,
    @SerialName("is_completed") val isCompleted: Boolean
)

interface TaskApiService {
    @GET("tasks")
    suspend fun fetchTasks(): List<TaskDto>
}
```

### 4. Room Database Operations
- Mark Room query methods as `suspend` unless they return `Flow`.
- Use Room `@Transaction` for multi-step database operations to guarantee atomicity.

```kotlin
@Database(entities = [TaskEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
}
```

#### Data-layer guardrails (block on these before ship)

- **`exportSchema = false` + no `Migration`** is a data-loss trap. The moment `version` bumps in a released app, users with the old schema get a crash or a destructive fallback. Set `exportSchema = true` (commit the schema JSON) and provide a `Migration` for every version bump. A shipped app with `exportSchema = false` and no migration path is a **production blocker**, not a nit.
- **Never store a value that must be exact as `Double`/`Float`.** For money use `Long` minor units (cents) or `BigDecimal`; a `SUM()` over a money column must return `Long`/`BigDecimal`, not `Flow<Double>`. See `references/domain-guardrails.md`.
- Prove the schema with a **Room in-memory DAO test** (insert → query/`SUM` → assert exact value), not a mocked repository — see `skills/android-testing-and-benchmark-kotlin/SKILL.md`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just block the current thread using runBlocking" | `runBlocking` blocks the executing thread (like the Main thread), causing ANRs (Application Not Responding). Use `suspend` functions and start coroutines in the correct scope. |
| "collectAsState() is fine for collecting StateFlow" | `collectAsState()` keeps collecting flow events when the app is in the background, wasting CPU and battery. Use `collectAsStateWithLifecycle()` to automatically pause collection. |
| "I don't need Dispatchers.IO because Retrofit does it automatically" | While Retrofit runs enqueue/suspend calls asynchronously under the hood, parsing JSON and Room database queries must be explicitly directed to `Dispatchers.IO` to ensure no Main thread blockage. |

## Red Flags

- Using `GlobalScope` or `runBlocking` in application code.
- Performing network operations or parsing heavy JSON on the Main thread.
- Standard Room DAO query methods not marked with `suspend` or returning `Flow`.
- Collecting flows in Compose views using `collectAsState()` instead of `collectAsStateWithLifecycle()`.
- Committing Room database schema changes without incrementing database version and providing migration paths.
- `exportSchema = false` with no `Migration` in an app that will ship updates — user data loss on version bump.
- Money or any must-be-exact value stored as `Double`/`Float`, or a `SUM()` returning `Flow<Double>`.

## Verification

- [ ] No database operations run on `Dispatchers.Main`.
- [ ] Room DAOs utilize `suspend` or return a `Flow`.
- [ ] Network exceptions are handled safely (e.g. using `try-catch` blocks).
- [ ] Flow collection in Composables uses `collectAsStateWithLifecycle()`.
- [ ] Coroutine scopes are linked correctly to views (e.g. using `viewModelScope` or `lifecycleScope`).
