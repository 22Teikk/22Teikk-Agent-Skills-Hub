---
name: android-data-and-concurrency-java
description: Handles data operations and concurrency in Java. Use when writing RxJava streams, CompletableFutures, Retrofit network requests in Java, or Room database queries in Java.
version: 1.0.0
platform: android
---

# Android Data and Concurrency (Java Stack)

## Overview

Manage asynchronous operations, network communications, and database persistence in Java. Adhere to RxJava concurrency standards, type-safe Retrofit configurations, and Room ORM in Java.

## When to Use

- Use when developing or maintaining data layer components, repositories, or network services in Java-based Android apps.
- Use when working with RxJava 3 (Flowable, Single, Observable) for asynchronous streams in Java.
- Use when integrating Room database queries, tables, and entities in Java.
- Use when designing network clients using Retrofit and OkHttp in Java.
- Use when parsing JSON using Gson or Jackson.
- Use when handling async actions using Java 8 `CompletableFuture`.
- Do NOT use for Kotlin Coroutines, flows, or Kotlin Serialization (use `android-data-and-concurrency-kotlin` instead).

## Core Process

### 1. RxJava & Multithreading
- **Thread Boundaries**: Fetch data on background threads (`Schedulers.io()`) and observe results on the UI thread (`AndroidSchedulers.mainThread()`).
- **Disposables management**: Always add RxJava subscriptions to a `CompositeDisposable` and clear them in `onCleared()` (ViewModel) or `onDestroy()` (Activity/Fragment) to prevent memory leaks.

```java
public class TaskRepository {
    private final TaskApiService apiService;
    private final TaskDao taskDao;

    public Single<List<Task>> getTasks() {
        return apiService.fetchTasks()
                .subscribeOn(Schedulers.io())
                .flatMap(dtos -> {
                    List<TaskEntity> entities = convertToEntities(dtos);
                    taskDao.insertTasks(entities);
                    return Single.just(convertToDomain(entities));
                });
    }
}
```

```java
// ViewModel usage with CompositeDisposable
public class TaskViewModel extends ViewModel {
    private final TaskRepository repository;
    private final CompositeDisposable disposables = new CompositeDisposable();
    private final MutableLiveData<List<Task>> tasks = new MutableLiveData<>();

    public void loadTasks() {
        disposables.add(repository.getTasks()
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(tasks::setValue, throwable -> {
                    // Handle error
                }));
    }

    @Override
    protected void onCleared() {
        super.onCleared();
        disposables.clear(); // Prevents memory leaks
    }
}
```

### 2. Retrofit in Java
- Define standard Retrofit API service returning `Single<T>`, `Observable<T>`, or `Call<T>`.

```java
public interface TaskApiService {
    @GET("tasks")
    Single<List<TaskDto>> fetchTasks();
}
```

### 3. Room in Java
- Use Room in Java, which supports returning `Single<T>`, `Maybe<T>`, or `Flowable<T>` for reactive operations.

```java
@Dao
public interface TaskDao {
    @Query("SELECT * FROM tasks")
    Flowable<List<TaskEntity>> getTasksFlowable();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertTasks(List<TaskEntity> tasks);
}
```

### 4. CompletableFuture for Async Tasks (Java 8+)
- For simple background operations without RxJava, use `CompletableFuture.supplyAsync()` running on a dedicated executor thread pool.

```java
CompletableFuture.supplyAsync(() -> taskDao.getTasksOnce(), Executors.newSingleThreadExecutor())
    .thenAccept(tasks -> {
        // Handle result on UI thread (if directed)
    });
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just subscribe without disposing because it finishes quickly" | If the user rotates the device or leaves the screen before the network/db request completes, the subscriber retains a reference to the View/ViewModel, causing severe memory leaks. |
| "I can run short DB operations on the Main thread" | Even small DB operations can block the Main thread under write lock or heavy disk usage, resulting in skipped frames and ANRs. Enforce background thread processing. |
| "Error consumers in RxJava are optional during testing" | An RxJava stream without an error consumer will throw an unhandled `OnErrorNotImplementedException`, crashing the app immediately if a network error occurs. |

## Red Flags

- Blocking main thread operations using `.blockingGet()` or `.get()` on RxJava/CompletableFuture.
- Subscribing to RxJava observables in views or view models without adding to a `CompositeDisposable` that gets cleared.
- Room query methods returning raw object models (e.g. `List<TaskEntity>`) running synchronously inside View classes.
- Throwing exceptions inside RxJava streams without a proper error consumer.
- Hardcoded thread pool sizes instead of using standard schedulers or scoped executors.

## Verification

- [ ] No network or database calls block the main UI thread.
- [ ] All RxJava subscriptions are disposed of in `onCleared()` or `onDestroy()`.
- [ ] Appropriate RxJava error consumer handles exceptions safely (preventing app crashes).
- [ ] Database query transactions are verified to run off the Main thread.
- [ ] Retrofit APIs are configured to return RxJava types or standard Call models, not blocking types.
