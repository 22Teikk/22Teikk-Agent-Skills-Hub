# iOS Stack Defaults

Apply when working on Swift/SwiftUI iOS projects unless .teikk/SPEC.md or the user overrides.

## Architecture

- MVVM: Views observe `@Observable` / `@ObservableObject` ViewModels
- ViewModels own async Tasks; cancel on `deinit` via stored `Task` handle
- Repositories: protocol in domain layer, concrete impl injected via constructor or `@Environment`
- Views stateless where possible — `@State` for local ephemeral UI only

## Dependency Management

- Swift Package Manager (SPM) default — no CocoaPods unless project already uses it
- Add packages via Xcode → File → Add Package Dependencies, or `Package.swift`
- Pin to exact version or minimum version range; never use `branch:` in production

## Concurrency

- `async/await` everywhere — no new `DispatchQueue` or Combine pipelines for new code
- `@MainActor` on ViewModels; `actor` for shared mutable state
- `Task { }` tied to view lifecycle via `.task` modifier or stored and cancelled in `onDisappear`

## Observability

- `os_log` / `Logger(subsystem:category:)` with `#if DEBUG` guard for verbose logs
- Crashlytics: `Crashlytics.crashlytics().record(error:)` for non-fatals with custom keys
- No PII in logs; release builds suppress debug-level output

## Skills / Personas by layer

| Work | Use |
|------|-----|
| SwiftUI views, async/await | `swift-expert` persona |
| E2E journeys | `teikk-e2e` (XCUITest path) |
| Tests | `teikk-test` (XCTest routing) |
| Logging/telemetry | `skills/observability-and-instrumentation` |
