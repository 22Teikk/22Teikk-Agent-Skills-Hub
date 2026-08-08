---
name: ios-pack
description: iOS platform pack — SwiftUI/UIKit, async/await concurrency, SwiftData, SPM, XCTest/XCUITest. Use when installing the iOS pack into a target project or routing work to the swift-expert persona.
version: 1.0.0
platform: ios
depends-on: []
---

# iOS Pack

Native iOS engineering skills for Swift 5.9+/6 apps built with SwiftUI and modern concurrency. Mirrors the Android pack (ui / data-and-concurrency / di-and-build / testing-and-benchmark) at the same depth, translated to Apple-idiomatic patterns instead of copy-pasted Kotlin.

## When to Use

- Use when installing iOS support into a target project (runs through `/teikk-ios-setup`).
- Use when routing a feature slice to a Swift-aware persona (see `swift-expert` below).
- Use when the project declares `platform: ios` in `.teikk/PROJECT.yaml`.
- Do NOT use for Android, Flutter, or server-side Swift work.

## Skills in this Pack

| Skill | Purpose | Trigger |
|---|---|---|
| `ios-ui` | SwiftUI views, `@Observable` view models, `NavigationStack`, lists/grids, async view work via `.task`. | Building or modifying any SwiftUI screen, view modifier, or `@Observable` model. |
| `ios-data-and-concurrency` | async/await, `Task`/`TaskGroup`, actors, `AsyncSequence`/`AsyncStream`, SwiftData persistence, URLSession with `async let`, Codable. | Writing repositories, network layers, SwiftData models, or background work. |
| `ios-di-and-build` | Swift Package Manager layouts (Package.swift vs .xcodeproj), DI via initializer injection (no singletons), SwiftLint, build phases, code signing & schemes, CI via Xcode Cloud / GitHub Actions. | Adding SPM dependencies, configuring schemes, signing, or CI for an iOS app. |
| `ios-testing-and-benchmark` | XCTest with `async throws`, XCUITest UI flows, `XCTMetric` measurements, OS signposts for Instruments, in-memory SwiftData/URLSession stubs. | Writing unit/UI/perf tests or preventing regressions in startup/scroll. |

## Persona

- **swift-expert** (`swift-expert`) — senior Swift reviewer/implementer. Routes feature work into the four skills above. Invoke directly from `/teikk-build` when the slice is iOS-native.

## Interaction with `/teikk-ios-setup`

`/teikk-ios-setup` is the entry point for any iOS target project. It:

1. Confirms platform = iOS in `.teikk/PROJECT.yaml`.
2. Detects the project layout (SPM-only vs Xcode project vs mixed).
3. Installs this pack's 4 skills + the `swift-expert` persona into the project's `.claude/skills/`, `.claude/agents/`, and equivalent platform folders.
4. Pins SwiftLint and the Swift toolchain version in `Package.swift` / `.swift-version`.

If the user runs `/teikk-ios-setup` without first generating a spec, redirect them to `/teikk-spec` — iOS work still needs a SPEC.md (Architecture + Observability + 7 other sections, see core skill `spec-driven-development`).

## Pack Boundaries

- **Always:** Swift 5.9+ / iOS 17+ baseline; SwiftUI first (UIKit only when SwiftUI cannot express it); constructor injection over service locators; value types (`struct`) over classes unless identity is required.
- **Never:** Copy Android patterns verbatim (no `lateinit var`, no `runBlocking`, no `Dispatchers.Main`, no `Flow`-only API). Never rely on `DispatchQueue.main.sync` or `try!` in shipped code. Never introduce cross-platform Swift dependencies (Kotlin Multiplatform, Flutter) inside a native iOS target.

## Cross-References

- Core (platform-neutral) skills: see `core/skills/` — every iOS feature still routes through `spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`, `code-review-and-quality`, `git-workflow-and-versioning`.
- Domain guardrails (money-as-Double, exact arithmetic, etc.): see the `security-and-hardening` skill's `references/domain-guardrails.md` — apply the Long-minor-units rule to SwiftData `Int64` columns, not just Room.
