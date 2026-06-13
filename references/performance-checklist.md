# Android Performance Checklist

Quick reference checklist for Android application performance. Use alongside the corresponding `android-*` skills.

## Table of Contents
- [App Startup Optimization](#app-startup-optimization)
- [UI & Rendering Performance](#ui-rendering-performance)
- [Data & DB Performance](#data-db-performance)
- [Network & Serialization Performance](#network-serialization-performance)
- [Measurement & Profiling](#measurement-profiling)
- [Common Anti-Patterns](#common-anti-patterns)

## App Startup Optimization
- [ ] **Application class**: Move non-critical initialization blocks out of `Application.onCreate()`. Use lazy initialization or background threads.
- [ ] **App Startup Library**: Leverage `androidx.startup` to initialize dependencies in a structured, deferred way.
- [ ] **Baseline Profiles**: Generate Baseline Profiles to pre-compile critical user journeys, reducing cold startup time.
- [ ] **Splash Screen API**: Utilize `androidx.core:core-splashscreen` to avoid blank screens during early process initialization.

## UI & Rendering Performance
- [ ] **Jetpack Compose Recomposition**:
  - Keep Composables stateless using State Hoisting.
  - Use stable/immutable data models (e.g. `@Stable`, `@Immutable`).
  - Wrap unstable parameters in `remember` or derived states.
  - Use `key` in `LazyColumn`/`LazyRow` items to prevent full recomposition of lists.
- [ ] **XML Layouts**:
  - Keep layout hierarchies flat. Use `ConstraintLayout` as the root to avoid nested layout passes.
  - Avoid layout weights in long lists or deeply nested structures.
  - Use `<merge>` and `<include>` tags to optimize layout recycling.
- [ ] **Image Rendering**:
  - Load images asynchronously using Coil with memory and disk cache configured.
  - Set explicit dimension limits on image holders to prevent size re-measurements.

## Data & DB Performance
- [ ] **Room Database**:
  - Never run database queries or transactions on the main UI thread.
  - Use `@Transaction` to combine multiple operations into a single atomic disk operation.
  - Use pagination (e.g., Paging 3 library) for large database tables instead of loading entire tables.
- [ ] **Concurrency Threads**:
  - For Kotlin: Route I/O operations to `Dispatchers.IO` and UI updates to `Dispatchers.Main`.
  - For Java: Use RxJava `subscribeOn(Schedulers.io())` and `observeOn(AndroidSchedulers.mainThread())`.

## Network & Serialization Performance
- [ ] **OkHttp Client**: Configure connection pooling, read/write timeouts, and cache interceptors.
- [ ] **Data Serialization**:
  - Prefer `kotlinx.serialization` (Kotlin) or optimized JSON parsers over slow reflection-based libraries.
- [ ] **Data Payloads**: Use gzip compression on APIs and ensure response bodies only contain required fields.

## Measurement & Profiling
- [ ] **Android Studio Profiler**: Use CPU Profiler to identify main thread locks, and Memory Profiler to track object allocations and leaks.
- [ ] **Macrobenchmark**: Implement Jetpack Macrobenchmark tests to measure startup time and frame overrun (jank).

## Common Anti-Patterns

| Anti-Pattern | Impact | Fix |
|---|---|---|
| Main Thread Disk/Network I/O | ANR (App Not Responding) crashes | Route calls to `Dispatchers.IO` / `Schedulers.io()` |
| Deeply Nested Views (XML) | Slow layout passes, dropped frames | Flat layouts using `ConstraintLayout` |
| Broad Compose Recompositions | High CPU usage, battery drain | Stabilize models, use `key` in lists, lift state |
| Memory Leaks (static context) | OOM (Out of Memory) crashes | Avoid storing references to `Activity` or `Context` statically |
