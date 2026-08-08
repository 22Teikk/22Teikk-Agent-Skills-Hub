---
name: ios-testing-and-benchmark
description: Implements iOS unit, UI, and performance testing. Use when writing XCTest unit tests with `async throws`, XCUITest flows, `XCTMetric` measurements, OS signposts for Instruments, or in-memory SwiftData / URLSession test doubles.
version: 1.0.0
platform: ios
depends-on:
  - ios-ui
  - ios-data-and-concurrency
---

# iOS Testing and Benchmarking

## Overview

Cover correctness with XCTest unit + UI tests, and prevent regressions with `XCTMetric`-based measurements. Unit-test view models with `async throws` against protocol-based test doubles. UI-test multi-screen flows with XCUITest. Benchmark startup, scrolling, and CPU work using `XCTClockMetric` / `XCTCPUMetric` / `XCTMemoryMetric`, and add OS signposts for Instruments correlation. Replace MockK with hand-rolled protocols or Swift's `Mock`/`Stub` patterns; replace Macrobenchmark with XCTest metrics.

## When to Use

- Use when writing unit tests for Swift types (view models, use cases, repositories, parsers).
- Use when defining test doubles for protocols (URLSession via `URLProtocol`, SwiftData via in-memory `ModelContainer`).
- Use when designing XCUITest flows for login, onboarding, or other multi-screen journeys.
- Use when measuring app startup, scroll frame time, or a hot loop's CPU cost.
- Use when adding OS signposts so an Instruments trace lines up with a code path.
- Do NOT use for whole-system end-to-end (use Maestro / XCUITest in a separate skill); keep core test feedback fast.

## Core Process

### 1. XCTest Unit Testing with `async throws`

- Mark every test that awaits with `func testFoo() async throws`. Use `throws` for any `try` inside.
- Use `#expect(...)` (Swift Testing, iOS 17+) for new tests; legacy `XCTAssert*` is still fine for established suites.
- One assertion focus per test; use descriptive names (`test_load_emitsError_when_repositoryFails`).

```swift
import XCTest
@testable import AppCore

final class TaskListModelTests: XCTestCase {
    private var repo: MockTaskRepository!
    private var sut: TaskListModel!

    @MainActor
    override func setUp() async throws {
        try await super.setUp()
        repo = MockTaskRepository()
        sut = TaskListModel(getTasks: GetTasksUseCaseImpl(repository: repo))
    }

    @MainActor
    func test_load_emitsLoadingThenLoaded() async {
        repo.tasksToReturn = [Task(id: "1", title: "Buy milk", isCompleted: false)]

        let states = collectStates {
            await sut.load()
        }

        XCTAssertEqual(states.count, 2)
        XCTAssertTrue(states.first?.isLoading == true)
        XCTAssertEqual(states.last?.tasks.first?.title, "Buy milk")
        XCTAssertNil(states.last?.errorMessage)
    }

    @MainActor
    func test_load_setsErrorMessage_whenRepositoryThrows() async {
        repo.errorToThrow = NetworkError.invalidResponse

        await sut.load()

        XCTAssertEqual(sut.state.errorMessage, NetworkError.invalidResponse.localizedDescription)
        XCTAssertFalse(sut.state.isLoading)
    }

    // helper
    @MainActor
    private func collectStates(_ block: () async -> Void) -> [TaskListUiState] {
        var captured: [TaskListUiState] = [sut.state]
        // Observe state changes via a small actor (omitted for brevity)
        let task = Task { @MainActor in
            for await _ in NotificationCenter.default.notifications(named: .modelDidUpdate) {
                captured.append(sut.state)
            }
        }
        let exp = expectation(description: "wait")
        Task { @MainActor in
            await block()
            exp.fulfill()
        }
        wait(for: [exp])
        task.cancel()
        return captured
    }
}
```

**Swift Testing alternative (iOS 17+):**

```swift
import Testing
@testable import AppCore

@MainActor
@Suite struct TaskListModelTests {
    @Test func load_emitsLoadedState() async {
        let repo = MockTaskRepository(tasks: [Task(id: "1", title: "Buy milk")])
        let sut = TaskListModel(getTasks: GetTasksUseCaseImpl(repository: repo))
        await sut.load()
        #expect(sut.state.tasks.first?.title == "Buy milk")
        #expect(sut.state.isLoading == false)
    }
}
```

### 2. SwiftData In-Memory Tests (mandatory for the data layer)

The data layer must have **≥1 test against a real SwiftData store**, not a mocked repository. A mock that returns `[250.00]` and then asserts `[250.00]` proves nothing — it never touches SQLite, so a wrong column type, a bad predicate, or a broken migration ships green. Use an **in-memory** `ModelContainer` (fast, real).

```swift
@MainActor
final class TransactionRepositoryTests: XCTestCase {
    private var container: ModelContainer!
    private var sut: TransactionRepository!

    override func setUp() async throws {
        try await super.setUp()
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: TransactionRecord.self, configurations: config)
        sut = TransactionRepository(container: container)
    }

    override func tearDown() async throws {
        container = nil
        sut = nil
        try await super.tearDown()
    }

    func test_totalMinor_returnsExactSumInMinorUnits() async throws {
        try sut.upsert(TransactionRecord(amountMinor: 2550, currency: "USD")) // $25.50
        try sut.upsert(TransactionRecord(amountMinor: 1099, currency: "USD")) // $10.99

        let total = try sut.totalMinor(currency: "USD")
        XCTAssertEqual(total, 3649) // exact — no Double drift
    }
}
```

This is the test that catches money-as-`Double`: with `Double` columns the sum drifts; with `Int64` minor units it is exact. See references/domain-guardrails.md.

### 3. URLSession Testing via `URLProtocol`

Stub network responses by conforming to `URLProtocol`. Swap the protocol classes via `URLSessionConfiguration`.

```swift
final class StubURLProtocol: URLProtocol {
    static var handler: ((URLRequest) -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.handler else { fatalError("handler not set") }
        let (response, data) = handler(request)
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

// In the test:
let config = URLSessionConfiguration.ephemeral
config.protocolClasses = [StubURLProtocol.self]
let session = URLSession(configuration: config)

StubURLProtocol.handler = { _ in
    let response = HTTPURLResponse(url: URL(string: "https://api.example.com/tasks")!,
                                   statusCode: 200, httpVersion: nil, headerFields: nil)!
    let data = #"[{"id":"1","title":"Buy milk","is_completed":false}]"#.data(using: .utf8)!
    return (response, data)
}

let api = HTTPTaskAPI(session: session, baseURL: URL(string: "https://api.example.com")!)
let tasks = try await api.fetchTasks()
XCTAssertEqual(tasks.first?.title, "Buy milk")
```

### 4. SwiftUI Previews + View Unit Tests

Previews are not tests, but you can render a SwiftUI view into an `XCTestCase` host to assert on rendered output:

```swift
final class TaskRowSnapshotTests: XCTestCase {
    func test_taskRow_rendersCompletedCheckmark() {
        let view = TaskRow(task: Task(id: "1", title: "Buy milk", isCompleted: true))
            .frame(width: 320, height: 60)

        let host = UIHostingController(rootView: view)
        host.view.frame = CGRect(x: 0, y: 0, width: 320, height: 60)
        // Assert on rendered tree or compare a snapshot
        XCTAssertNotNil(host.view)
    }
}
```

For visual regression, prefer `swift-snapshot-testing` (PFM) with `assertSnapshot(of: view, as: .image)` — pin devices, traits, and sizes in the snapshot strategy.

### 5. XCUITest for Multi-Screen Flows

Use XCUITest for journeys that cross screens (login → home → detail → back) and that need a real simulator/runtime. Keep individual screen tests in unit tests above.

```swift
final class LoginFlowUITests: XCTestCase {
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    func test_login_succeedsWithValidCredentials() throws {
        let app = XCUIApplication()
        app.launchEnvironment["API_BASE_URL"] = "https://staging.api.example.com"
        app.launch()

        let email = app.textFields["email_field"]
        email.tap()
        email.typeText("user@example.com")

        let password = app.secureTextFields["password_field"]
        password.tap()
        password.typeText("hunter2")

        app.buttons["login_button"].tap()

        XCTAssertTrue(app.staticTexts["home_greeting"].waitForExistence(timeout: 5))
    }
}
```

**Identity, not geometry.** Use `accessibilityIdentifier`s on every interactive element (`Button("Login").accessibilityIdentifier("login_button")`) and query via `app.buttons["login_button"]`. Never use coordinates or partial labels.

### 6. Performance Benchmarking with `XCTMetric`

Replace Macrobenchmark's startup/frame metrics with `XCTMetric` subclasses on a baseline performance test.

```swift
final class StartupPerformanceTests: XCTestCase {
    func test_coldStartup_underTwoSeconds() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-StartFromCleanState", "YES"]

        let options = XCTMeasureOptions()
        options.invocationOptions = [.autoStart] // or .manualStart with .stop() in code
        measure(metrics: [XCTClockMetric()], options: options) {
            app.launch()
        }
    }

    func test_homeScroll_maintains60Fps() throws {
        let app = XCUIApplication()
        app.launch()

        let list = app.collectionViews["task_list"]
        XCTAssertTrue(list.waitForExistence(timeout: 5))

        measure(metrics: [XCTOSSignpostMetric.scrollDecelerationMetric]) {
            list.swipeUp(velocity: .fast)
            list.swipeDown(velocity: .fast)
        }
    }
}
```

`XCTMetric` subclasses available out of the box:
- `XCTClockMetric` — wall-clock time per iteration.
- `XCTCPUMetric` — CPU time per iteration.
- `XCTMemoryMetric` — peak / average memory.
- `XCTStorageMetric` — bytes written.
- `XCTOSSignpostMetric` — `scrollAnimation`, `scrollDeceleration`, `navigation`, `custom(metric:)` — pairs with `os_signpost` calls in code.

**OS signposts** for Instruments correlation:

```swift
import os.signpost

let signposter = Signposter(subsystem: "com.example.App", category: "DataLayer")

func loadSnapshot() async throws -> ProfileSnapshot {
    let state = signposter.beginInterval("loadSnapshot")
    defer { signposter.endInterval("loadSnapshot", state) }
    // ...
}
```

Open the resulting `.trace` in Instruments → "Points of Interest" or "os_signpost" template to see each interval aligned with CPU samples.

### 7. E2E journeys (optional — XCUITest)

For multi-screen critical flows only. **Do not use this section for every project.**

- Keep unit + view tests in this skill; XCUITest covers cross-screen journeys only.
- Declare in SPEC: `E2E: none` or `E2E: XCUITest — flows: [...]`.
- For a Maestro-style flow on a non-iOS platform, see the cross-platform e2e skill; this skill is iOS-only.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll test everything in XCUITest" | XCUITest is slow, flaky on animations, and gives weak signal on internal logic. Cover view models + repositories in unit tests; reserve XCUITest for true cross-screen journeys. |
| "I don't need to mock URLSession — I'll hit staging" | Hitting staging makes tests slow, dependent on infra, and flaky. `URLProtocol` stubs give you deterministic, hermetic tests. |
| "My code is `async`; I don't need any extra test setup" | `async` test functions need `async throws` + `await` inside; tests that touch `@MainActor` types must be `@MainActor` themselves. Forgetting this gives "Looper-style" crashes at runtime. |
| "Benchmarks are too slow to write" | A 30-line `XCTClockMetric` test prevents shipping a regression that adds 800ms to cold startup. Cheap to write, expensive to skip. |
| "I'll just verify the in-memory model returns what I passed in" | That's a mock-verification test — tautological. Prove the real SwiftData store reads/writes correctly (see §2). |
| "Snapshot tests catch every visual regression" | Snapshots catch regressions you didn't notice. They don't catch "this screen is slow" or "this button is unreachable by VoiceOver". Combine with `XCTMetric` and accessibility audits. |

## Red Flags

- Tests that rely on `Thread.sleep` to wait for async operations to complete.
- Mocking concrete Apple types (`URLSession`, `URLResponse`, `ModelContext`) instead of stubbing at the protocol layer (`URLProtocol`, `ModelContainer`).
- **Mock-verification tests** — mocking the very component under test (mock repo returns the expected value, then assert that value). Tautological; counts as zero coverage.
- **Boilerplate template tests** left in the suite (`MyAppTests.defaultTest`, `MyAppUITests.launchPerformance`) — delete them; never count them.
- Data layer "tested" only through mocked repositories, with no SwiftData in-memory test.
- XCUITest using coordinates, frame indices, or partial labels instead of `accessibilityIdentifier`.
- XCUITest that asserts on `waitForExistence(timeout: 30)` — if you need 30s, the flow is broken.
- Benchmark tests running on a Simulator without `XCTMetric` configured (results are wildly variable).
- Tests that don't compile under Swift 6 strict concurrency (un-marked `Sendable` types across actor boundaries).

## Verification

- [ ] All XCTest unit tests pass: `xcodebuild test -scheme App -destination 'platform=iOS Simulator,name=iPhone 15'`.
- [ ] Coroutine-style async tests use `func testFoo() async throws` with `@MainActor` when touching view models.
- [ ] At least one test uses a real in-memory SwiftData `ModelContainer` (not a mock repository).
- [ ] Network tests stub via `URLProtocol`, never hit staging.
- [ ] UI tests assert element identity via `accessibilityIdentifier`, never via coordinates.
- [ ] At least one `XCTMetric` benchmark runs (startup, scroll, or CPU).
- [ ] OS signposts mark any hot loop that's instrumented in production code.
- [ ] No `Thread.sleep` in any test; cancellation is verified by cancelling a `Task` and asserting state.
- [ ] No leftover `MyAppTests.defaultTest` / `MyAppUITests.launchPerformance` boilerplate in the suite.
