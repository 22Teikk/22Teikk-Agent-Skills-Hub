---
name: ios-di-and-build
description: Configures iOS dependency injection and build environments. Use when adding SPM dependencies, setting up SwiftLint, configuring Xcode build phases or schemes, managing code signing, or wiring up Xcode Cloud / GitHub Actions CI.
version: 1.0.0
platform: ios
depends-on:
  - ios-data-and-concurrency
---

# iOS Dependency Injection and Build Configuration

## Overview

Wire dependencies via initializer injection (no service-locator singletons). Pin everything in `Package.swift`, keep build phases and schemes honest, manage code signing through `.xcconfig` and environment variables, and automate CI with Xcode Cloud or GitHub Actions running on macOS runners. Replace Hilt with protocols + initializer injection; replace the Version Catalog with SwiftPM dependency pinning.

## When to Use

- Use when adding or upgrading an SPM dependency, or migrating a project from CocoaPods to SPM.
- Use when designing the dependency graph for a new feature (repositories → use cases → view models → views).
- Use when configuring SwiftLint, build phases, schemes, or `.xcconfig` files.
- Use when setting up code signing for Debug / TestFlight / App Store, or rotating signing certificates.
- Use when wiring CI (Xcode Cloud, GitHub Actions with `macos-latest`, or Fastlane).

## Core Process

### 1. Dependency Injection via Initializer Injection

iOS has no Hilt — Apple's idiomatic answer is **constructor injection through protocols**. Every long-lived type takes its dependencies in `init`. The composition root (typically `App` or a `Dependencies` struct) wires concrete implementations once at launch.

```swift
// Protocol — owned by the consumer, not the implementer
@MainActor
protocol GetTasksUseCase: Sendable {
    func callAsFunction() -> AsyncThrowingStream<[Task], Error>
}

// Concrete implementation
struct GetTasksUseCaseImpl: GetTasksUseCase {
    let repository: TaskRepository
    let clock: () -> Date

    init(repository: TaskRepository, clock: @escaping () -> Date = Date.init) {
        self.repository = repository
        self.clock = clock
    }

    func callAsFunction() -> AsyncThrowingStream<[Task], Error> {
        // ...
    }
}

// Composition root — built once, passed down via initializer or `@Environment`
@MainActor
struct AppDependencies {
    let session: URLSession
    let taskAPI: TaskAPI
    let taskRepository: TaskRepository
    let getTasks: GetTasksUseCase

    static func live() -> AppDependencies {
        let session = URLSession(configuration: .apiDefault())
        let api = HTTPTaskAPI(session: session, baseURL: URL(string: "https://api.example.com")!)
        let repo = TaskRepository(api: api)
        return AppDependencies(
            session: session,
            taskAPI: api,
            taskRepository: repo,
            getTasks: GetTasksUseCaseImpl(repository: repo)
        )
    }

    // For previews and tests
    static func mock(tasks: [Task] = []) -> AppDependencies {
        let api = MockTaskAPI(tasks: tasks)
        let repo = TaskRepository(api: api)
        return AppDependencies(
            session: .stub,
            taskAPI: api,
            taskRepository: repo,
            getTasks: GetTasksUseCaseImpl(repository: repo)
        )
    }
}
```

**Avoid:**
- `class TaskService { static let shared = ... }` (service locator; untestable, hidden coupling).
- Reach for `URLSession.shared`, `UserDefaults.standard`, or `FileManager.default` deep inside a feature module — those reach past the composition root and break substitution.

### 2. Swift Package Manager Layout

A typical iOS app uses a **hybrid layout**: an `.xcodeproj` for the app target, plus one or more SPM packages for shareable code (`Package.swift`).

```swift
// Package.swift — at the repo root or in a local package directory
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AppCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "AppCore", targets: ["AppCore"])
    ],
    dependencies: [
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", exact: "1.17.6"),
        .package(url: "https://github.com/apple/swift-collections", from: "1.1.0")
    ],
    targets: [
        .target(
            name: "AppCore",
            dependencies: [
                .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
                .product(name: "OrderedCollections", package: "swift-collections")
            ]
        ),
        .testTarget(
            name: "AppCoreTests",
            dependencies: ["AppCore", "SnapshotTesting"]
        )
    ]
)
```

**Pin dependencies tightly.** Use `exact:` for libraries you depend on at the API level (a breaking change would break you); use `from:` for libraries where you trust semver. Audit `.package(url:)` resolutions with `swift package show-dependencies` before merging.

### 3. SwiftLint Configuration

```yaml
# .swiftlint.yml
opt_in_rules:
  - anyobject_protocol
  - explicit_init
  - first_where
  - redundant_nil_coalescing
  - sorted_imports

disabled_rules:
  - trailing_whitespace

excluded:
  - .build
  - DerivedData
  - Pods

line_length:
  warning: 120
  error: 160
```

Add a build phase that runs `swiftlint` and fails on errors. Treat lint warnings as errors in CI for the `main` branch.

### 4. Build Configuration via `.xcconfig`

Keep all environment-specific values out of source code. Use Debug / Release / Staging `.xcconfig` files, with secrets injected by CI.

```xcconfig
// Configs/Debug.xcconfig
API_BASE_URL = https://staging.api.example.com
ENABLE_LOGGING = YES
BUNDLE_ID_SUFFIX = .debug

// Configs/Release.xcconfig
API_BASE_URL = https://api.example.com
ENABLE_LOGGING = NO
BUNDLE_ID_SUFFIX =
```

Read these in code via `Bundle.main.infoDictionary` (set `API_BASE_URL` as a user-defined build setting) — never compile them in via `#if DEBUG` checks.

### 5. Code Signing

- **Local development**: Automatic signing with a personal team. Fine for Debug.
- **CI / TestFlight / App Store**: Manual signing, with the signing certificate and provisioning profile stored in the CI's secret store. Inject via `xcodebuild` flags or an Xcode Cloud workflow.
- **Never** commit `.p12`, `.cer`, `.mobileprovision`, or `.p8` files. Add them to `.gitignore` and CI's `Settings → Secrets`.

```bash
# GitHub Actions example — manual signing for an upload-build job
xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="MyApp_AppStore_Profile" \
  -archivePath build/App.xcarchive \
  archive
```

### 6. CI/CD with Xcode Cloud or GitHub Actions

**Xcode Cloud** (Apple-managed, free up to 25 hrs/month):
- Define workflows in `App.xcodeproj/xcshareddata/xcschemes/...` and Xcode → Product → Xcode Cloud.
- Best for projects that don't need custom build steps.

**GitHub Actions on `macos-14`** (or newer):

```yaml
name: iOS CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_15.4.app
      - name: Cache SPM
        uses: actions/cache@v4
        with:
          path: ~/Library/Caches/org.swift.swiftpm
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
      - name: Resolve dependencies
        run: xcodebuild -resolvePackageDependencies -project App.xcodeproj
      - name: Lint
        run: swiftlint --strict
      - name: Test
        run: |
          xcodebuild test \
            -project App.xcodeproj \
            -scheme App \
            -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest'
```

**Fastlane** (optional) for TestFlight upload, screenshots, code-signing automation via `match`. Use it when the project has more than one environment target (Staging, Prod) or rotates certificates often.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Singletons are fine — Hilt doesn't exist on iOS anyway" | Singletons aren't Hilt, they're a service locator. They make test setup impossible without a global mutable variable. Initializer injection is barely more code and gives you free testability. |
| "I'll just `import` the package file directly, no need to declare it in `Package.swift`" | Untracked dependencies break other devs (`xcodebuild` fails on their machine) and CI (cache misses). Every dependency lives in `Package.swift` or `.xcodeproj` — nowhere else. |
| "Signing credentials in source are fine, it's a private repo" | Compromised or leaked signing identities can sign malicious apps that look like yours. Treat signing material like production secrets — always in CI's secret store. |
| "`#if DEBUG` for environment branching is good enough" | `#if DEBUG` compiles different code in Debug vs Release — exactly the bug surface you don't want. Use `.xcconfig` and runtime configuration for environment differences; keep `#if DEBUG` for telemetry/log verbosity only. |
| "SwiftLint rules are subjective; we don't need them" | Unformatted code slows reviews and hides real issues. A 10-line `.swiftlint.yml` enforces 80% of the rules that matter. |

## Red Flags

- `class Foo { static let shared = ... }` for any non-trivial service.
- `URLSession.shared`, `UserDefaults.standard`, or `FileManager.default` reached into from a feature module.
- A `Package.swift` that uses `.branch("main")` or `.revision(...)` for a dependency that has tagged releases.
- A `.xcconfig` value checked into git containing an API key, signing identity, or bundle identifier suffix meant for prod.
- A `.p12`, `.cer`, or `.mobileprovision` file inside the repo (even in `.gitignore` accidents).
- `#if DEBUG` branching on `API_BASE_URL` or feature flags.
- A scheme that builds Debug for Release distribution, or vice versa.
- CI running without a SwiftLint step (or running it with `--strict` disabled).
- `swift package update` run without committing `Package.resolved` (drift across devs).

## Verification

- [ ] Every long-lived type receives its dependencies through `init`.
- [ ] No service-locator singletons in feature modules (`AppDependencies` is the only composition root).
- [ ] All third-party dependencies are declared in `Package.swift` (SPM) or `Podfile` (legacy CocoaPods), never imported ad-hoc.
- [ ] `swift package show-dependencies` matches the lockfile (`Package.resolved`).
- [ ] SwiftLint runs in CI with `--strict` and zero warnings on `main`.
- [ ] Debug / Release / Staging environments use `.xcconfig` files, not source-level `#if`.
- [ ] Signing material lives in CI secrets; `.p12`/`.cer`/`.mobileprovision` are gitignored.
- [ ] CI builds and tests on `macos-14` (or newer) with a pinned Xcode version.
- [ ] Archive / TestFlight uploads use manual signing with profiles from CI secrets.
- [ ] Every `.gitignore` line for `*.xcuserstate`, `DerivedData/`, `.build/`, `*.xcworkspace/xcuserdata/` is present.
