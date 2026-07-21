---
name: api-and-interface-design
description: Contracts first. Use when designing API models, database structures, or module boundaries. Use when writing Retrofit interfaces, DTOs, or domain models.
version: 1.0.0
platform: generic
---

# API and Interface Design (Android)

## Overview

Design clean, robust, and backward-compatible APIs and interfaces. A well-designed interface is easy to use correctly and hard to use incorrectly. Focus on contract-first design, consistent error semantics, boundary validation, and type safety using Kotlin features.

## When to Use

- Use when designing network request/response models (DTOs) and Retrofit API services.
- Use when designing local data models (Room entities, DAOs).
- Use when defining public contracts for repositories, use cases, or shared modules.
- Use when designing data structures or sealed state representations.
- Do NOT use for layout-only styling or basic unit logic that does not expose public APIs.

## Core Process

### 1. Contract First
Define the interface before implementing it. In Android, Retrofit interfaces are the ideal way to specify network contracts first:

```kotlin
// Define the Retrofit contract first
interface TaskApi {
    @POST("tasks")
    suspend fun createTask(@Body input: CreateTaskInput): TaskDto

    @GET("tasks")
    suspend fun listTasks(
        @Query("page") page: Int,
        @Query("pageSize") pageSize: Int
    ): PaginatedResult<TaskDto>

    @GET("tasks/{id}")
    suspend fun getTask(@Path("id") id: String): TaskDto

    @PATCH("tasks/{id}")
    suspend fun updateTask(
        @Path("id") id: String,
        @Body input: UpdateTaskInput
    ): TaskDto

    @DELETE("tasks/{id}")
    suspend fun deleteTask(@Path("id") id: String): Response<Unit>
}
```

### 2. Consistent Error Semantics
Parse error bodies into a consistent structured class in your network repository:

```kotlin
data class ApiErrorResponse(
    val code: String,        // Machine-readable: "VALIDATION_ERROR"
    val message: String,     // Human-readable: "Title is required"
    val details: Map<String, String>? = null // Field-specific validation errors
)
```

Map HTTP status codes consistently:
- **400** → Client sent invalid data.
- **401** → Not authenticated (token expired or missing).
- **403** → Authenticated but not authorized.
- **404** → Resource not found.
- **422** → Validation failed (semantically invalid).
- **500** → Server error (generic fallback, hide server stack traces).

### 3. Validate at Boundaries
Validate user input at the system boundaries (e.g. inside the UI ViewModel before calling repositories):

```kotlin
class CreateTaskViewModel @Inject constructor(
    private val taskRepository: TaskRepository
) : ViewModel() {
    
    fun onCreateTaskClicked(title: String, description: String) {
        val trimmedTitle = title.trim()
        if (trimmedTitle.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Title cannot be empty") }
            return
        }
        if (trimmedTitle.length > 200) {
            _uiState.update { it.copy(errorMessage = "Title too long") }
            return
        }
        
        // Input is validated; internal code execution is safe
        viewModelScope.launch {
            taskRepository.createTask(trimmedTitle, description)
        }
    }
}
```

Validate third-party data or API responses inside the data repository layer before converting them to domain entities:

```kotlin
class TaskRepositoryImpl(private val taskApi: TaskApi) : TaskRepository {
    override suspend fun getTask(id: String): Task {
        val response = taskApi.getTask(id)
        // Validate response fields before mapping to Domain Model
        requireNotNull(response.title) { "API returned a null title for task $id" }
        return response.toDomain()
    }
}
```

### 4. Prefer Addition Over Modification
Extend inputs and DTOs without breaking existing parsers. Use Kotlin's optional parameters with default values:

```kotlin
// Good: Add optional fields with safe defaults
@Serializable
data class CreateTaskInput(
    val title: String,
    val description: String? = null,
    val priority: String = "MEDIUM" // Added later with default value
)
```

---

## Kotlin Interface & Model Patterns

### 1. Use Sealed Interfaces for State Variants
Replace string flags or multiple boolean fields with Kotlin sealed interfaces to model distinct states:

```kotlin
sealed interface TaskStatus {
    object Pending : TaskStatus
    
    data class InProgress(
        val assignee: String,
        val startedAt: Long
    ) : TaskStatus
    
    data class Completed(
        val completedAt: Long,
        val completedBy: String
    ) : TaskStatus
}

// Consumer gets compile-time safety and smart casting
fun getStatusLabel(status: TaskStatus): String = when (status) {
    is TaskStatus.Pending -> "Pending"
    is TaskStatus.InProgress -> "In Progress by ${status.assignee}"
    is TaskStatus.Completed -> "Completed at ${status.completedAt}"
}
```

### 2. Input/Output Separation
Separate DTO models (used for Retrofit serialization) from clean domain/UI models:

```kotlin
// DTO (Data Transfer Object)
@Serializable
data class TaskDto(
    @SerialName("id") val id: String,
    @SerialName("title") val title: String,
    @SerialName("created_at") val createdAt: Long
)

// Domain Model (used in UI and business logic)
data class Task(
    val id: TaskId,
    val title: String,
    val createdAtDate: Date
)
```

### 3. Use Value Classes for Type-Safe IDs
Prevent passing user IDs to task IDs by using inline value classes:

```kotlin
@JvmInline
value class TaskId(val value: String)

@JvmInline
value class UserId(val value: String)

// Compiler blocks passing a UserId where a TaskId is expected
fun getTask(id: TaskId) { ... }
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is an internal API, we don't need strict schemas" | Internal contracts change. Having clear compile-time type-safety (like sealed classes or value classes) prevent ripple effects when refactoring. |
| "I'll just pass JSON string blobs around" | String blobs bypass type checking, making it easy to introduce deserialization crashes. Always define structured data models. |
| "We don't need input/output model separation" | Using database entities or Retrofit DTOs directly in UI layouts couples your design to backend data models, leading to fragile code. |

## Red Flags

- Domain models containing Retrofit `@SerializedName` or Room annotations.
- Functions accepting generic `Map<String, Any>` or raw `Bundle` objects instead of structured data classes.
- APIs or functions returning multiple types of object structures depending on success or failure.
- Using generic strings or integers for identifiers (e.g. `String` for both taskId and userId).

## Verification

- [ ] Every network request/response and database schema uses a type-safe Kotlin model.
- [ ] Sealed interfaces or classes are used for UI state and status variants.
- [ ] Boundaries (ViewModel inputs, API responses) validate data formats.
- [ ] Backward compatibility is preserved by adding default-valued parameters to data classes.
- [ ] No database (Room) or network (Retrofit) annotations are leaked into domain/business logic packages.
