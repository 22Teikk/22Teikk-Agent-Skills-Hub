---
name: ios-data-and-concurrency
description: Handles iOS data operations and concurrency. Use when writing async/await code, `Task`/`TaskGroup`, actors, `AsyncSequence`/`AsyncStream`, SwiftData (`@Model`, `@Query`), URLSession with `async let`, or Codable networking.
version: 1.0.0
platform: ios
depends-on: [ios-ui]
---

# iOS Data and Concurrency (Swift 5.9+)

## Overview

Structure the data layer around `async/await`, structured concurrency, actors, and SwiftData. Replace Coroutines/Flow/Room/Retrofit with their Swift-native counterparts — never transliterate Kotlin patterns. Repository protocol → actor implementation → view model consumer, with strict `@MainActor` boundaries at the UI edge.

## When to Use

- Use when implementing repositories, data sources, or background work in an iOS app.
- Use when designing a network layer with `URLSession`, `async let`, or `URLRequest`.
- Use when defining SwiftData `@Model` types, `ModelContainer` configuration, or `@Query` views.
- Use when modeling shared mutable state (use `actor`, not locks or `@synchronized`-style workarounds).
- Use when streaming values into the UI (`AsyncSequence` / `AsyncStream`).
- Do NOT use for Combine-only code (it has its place; migrate to `async/await` only when refactoring).

## Core Process

### 1. async/await & Structured Concurrency

- **Async functions** for everything that suspends. Mark with `async throws` and let the caller decide isolation.
- **`Task` lifecycle**: tie work to a scope (`.task`, a view model's `Task` stored property, or `TaskGroup`). Never spawn a detached task to "fire and forget" — you lose cancellation and error handling.
- **`async let`**: for parallel fan-out of a fixed set of independent calls (e.g. load profile + preferences at app start).
- **`TaskGroup`**: for dynamic parallel work (e.g. fetching N images in parallel).
- **`@MainActor`**: every UI-touching type is `@MainActor` isolated. Background work hops to `MainActor` only when it needs to update state.

```swift
struct ProfileSnapshot: Sendable {
    let profile: Profile
    let preferences: Preferences
}

@MainActor
protocol ProfileLoading {
    func loadSnapshot() async throws -> ProfileSnapshot
}

final class ProfileLoader: ProfileLoading {
    private let session: URLSession
    private let decoder: JSONDecoder

    init(session: URLSession = .shared, decoder: JSONDecoder = .init()) {
        self.session = session
        self.decoder = decoder
    }

    func loadSnapshot() async throws -> ProfileSnapshot {
        // Parallel fan-out — `async let` keeps both requests in flight
        async let profile = fetch(Profile.self, from: .profile)
        async let preferences = fetch(Preferences.self, from: .preferences)
        return try await ProfileSnapshot(
            profile: profile,
            preferences: preferences
        )
    }

    private func fetch<T: Decodable & Sendable>(_ type: T.Type, from url: URL) async throws -> T {
        let (data, response) = try await session.data(from: url)
        try Self.validate(response)
        return try decoder.decode(T.self, from: data)
    }

    private static func validate(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else {
            throw NetworkError.invalidResponse
        }
    }
}
```

### 2. Actors for Shared Mutable State

- Use `actor` for any type that has mutable state accessed from multiple tasks. Actor isolation gives you serial access without locks.
- `nonisolated` for read-only computed properties or `Sendable` static factories.
- Crossing an actor boundary requires `await` — that's intentional; it forces you to think about hops.

```swift
actor InMemoryTokenStore {
    private var token: String?

    func current() -> String? { token }

    func update(_ newToken: String) {
        token = newToken
    }
}

// Use in a view model:
@MainActor
final class AuthModel {
    private let store: InMemoryTokenStore
    private(set) var isAuthenticated = false

    init(store: InMemoryTokenStore) { self.store = store }

    func refreshAuthFlag() async {
        isAuthenticated = await store.current() != nil
    }
}
```

### 3. AsyncSequence / AsyncStream for Event Streams

- **`AsyncSequence`**: when you own the producer (a database change feed, a custom iterator).
- **`AsyncStream`**: when wrapping a callback-based API (`NotificationCenter`, `URLSessionWebSocketTask`, a delegate).
- **`AsyncThrowingStream`**: same, but errors are thrown to the consumer.

```swift
// Wrapping NotificationCenter
func notificationStream(_ name: Notification.Name) -> AsyncStream<Notification> {
    AsyncStream { continuation in
        let observer = NotificationCenter.default.addObserver(
            forName: name, object: nil, queue: nil
        ) { note in
            continuation.yield(note)
        }
        continuation.onTermination = { _ in
            NotificationCenter.default.removeObserver(observer)
        }
    }
}

// Consuming in a view model:
func observeAppForeground() {
    Task { @MainActor [weak self] in
        for await _ in notificationStream(UIApplication.willEnterForegroundNotification) {
            await self?.reload()
        }
    }
}
```

### 4. SwiftData Persistence

- **`@Model`**: declare a class, not a struct. SwiftData manages identity.
- **`ModelContainer`**: configured once at app start (or per-feature for previews). Pass it down; do not reach for `ModelContext` statically.
- **`@Query`**: for SwiftUI views that need a reactive collection. Filters/sorts via `@Query(filter:sort:)`.
- **Background writes**: get a background context via `ModelContext(container)` (off-main) and save; SwiftData merges into the main context on save.

```swift
@Model
final class TaskRecord {
    @Attribute(.unique) var id: UUID
    var title: String
    var isCompleted: Bool
    var createdAt: Date

    init(id: UUID = UUID(), title: String, isCompleted: Bool = false, createdAt: Date = .now) {
        self.id = id
        self.title = title
        self.isCompleted = isCompleted
        self.createdAt = createdAt
    }
}

@MainActor
final class TaskRepository {
    private let context: ModelContext

    init(container: ModelContainer) {
        self.context = ModelContext(container)
    }

    func allTasks() throws -> [TaskRecord] {
        let descriptor = FetchDescriptor<TaskRecord>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        return try context.fetch(descriptor)
    }

    func upsert(_ record: TaskRecord) throws {
        context.insert(record)
        try context.save()
    }
}
```

### 5. URLSession with `async let`

- Use `URLSession.data(for:)` (iOS 15+) for one-shot requests. Use `URLSession.bytes(for:)` for streaming responses.
- Configure a custom `URLSession` with `URLSessionConfiguration` for timeouts, caching, and headers — never use `.shared` for non-trivial apps.
- Decode off the main thread (URLSession is already off-main; just don't hop back to update UI until you have the decoded value).

```swift
struct TaskDTO: Codable, Sendable {
    let id: String
    let title: String
    let isCompleted: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case isCompleted = "is_completed"
    }
}

protocol TaskAPI: Sendable {
    func fetchTasks() async throws -> [TaskDTO]
}

struct HTTPTaskAPI: TaskAPI {
    let session: URLSession
    let baseURL: URL

    func fetchTasks() async throws -> [TaskDTO] {
        var request = URLRequest(url: baseURL.appendingPathComponent("tasks"))
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else {
            throw NetworkError.invalidResponse
        }
        return try JSONDecoder().decode([TaskDTO].self, from: data)
    }
}
```

### 6. Logging & Crash Reporting

- Use `os.Logger` with subsystems (one per module: `Bundle.main.bundleIdentifier ?? "App"`).
- Crash reporting via Crashlytics / Sentry — initialize once at app start, never on a background queue.
- Never `print()` in shipping code — see `ios-ui` red flags.

```swift
import os

extension Logger {
    static let network = Logger(subsystem: Bundle.main.bundleIdentifier ?? "App", category: "network")
    static let data = Logger(subsystem: Bundle.main.bundleIdentifier ?? "App", category: "data")
}

// Usage:
Logger.network.error("Decoding failed: \(error.localizedDescription, privacy: .public)")
```

#### Data-layer guardrails (block on these before ship)

- **`@Model` with no migration plan** is a data-loss trap. The moment a schema changes in a shipped app, users with the old store get a crash or a destructive fallback. Either:
  1. Add lightweight migration attributes (`@Attribute(.spotlight)`, versioned `VersionedSchema`), OR
  2. Provide a `SchemaMigrationPlan` mapping old → new.
- **Never store a value that must be exact as `Double`.** For money, use `Int64` minor units (cents) or `Decimal` for arbitrary-precision. A `SUM()`/aggregate on a money field must return `Int64` or `Decimal`, not `Double`. See @references/domain-guardrails.md.
- Prove the schema with a **SwiftData in-memory test** (insert → fetch/aggregate → assert exact value), not a mocked repository. See `ios-testing-and-benchmark`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just block using `RunLoop.current.run(until:)`" | Blocking on a runloop starves the cooperative thread pool and deadlocks the UI. Use `async/await` and `Task` with proper cancellation. |
| "DispatchQueue.global().async is fine for parallelism" | Unstructured queues lose cancellation, propagate errors as crashes, and have no scope. Use `TaskGroup` or `async let`. |
| "I'll use `@MainActor` on every type for safety" | `@MainActor` everywhere serializes everything through the main thread, defeating the point of concurrency. Mark UI/types touching UI as `@MainActor`; let actors and value types run on the cooperative pool. |
| "Combine works fine; I don't need async/await" | New code should use `async/await`. Combine is fine for legacy Publisher chains, but async gives you cancellation, structured concurrency, and interop with SwiftData/URLSession for free. |
| "`@Model` is just Core Data with a nicer name" | SwiftData is built on Core Data but uses `@Model` macros and `@Query` — schemas need explicit versioning to avoid breaking users on update. Treat it as a real schema, not a free-for-all. |

## Red Flags

- Detached `Task.detached { ... }` used to "fire and forget" network or DB work.
- `@MainActor` applied to actors or value types (it defeats their isolation model).
- `await` inside a synchronous function (the function must become `async` to call it).
- `URLSession.shared` used directly in a feature module (lose timeout / header / mock control).
- `print(...)` for production logging.
- `try!` on JSON decoding or any user-supplied input.
- A `@Model` field typed as `Double` for money or quantity that must be exact.
- A `Task { ... }` started inside `body` of a SwiftUI view (see `ios-ui`).
- Catching `error` with `_` and continuing — silent failures are how data corruption ships.

## Verification

- [ ] No `print()` in non-test code; all logs go through `os.Logger` or an injected logger.
- [ ] All async functions are `async throws`; no `runBlocking`-equivalent.
- [ ] All shared mutable state lives inside an `actor` or is `@MainActor`-isolated.
- [ ] SwiftData writes happen on a background `ModelContext`; reads from main context only.
- [ ] SwiftData schema changes ship with a migration plan (versioned schema or mapping).
- [ ] Money / must-be-exact values use `Int64` (minor units) or `Decimal`, never `Double`.
- [ ] Network code uses a configured `URLSession`, not `.shared` directly in feature modules.
- [ ] `Sendable` conformance is explicit and verified for every type crossing actor boundaries.
- [ ] Crash reporter (Crashlytics / Sentry) is initialized exactly once at app start.
