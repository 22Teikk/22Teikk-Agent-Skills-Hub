# Set up iOS foundation — SPM dependencies, SwiftLint, logging, Crashlytics

Read `agents/swift-expert.md`.

Use at iOS project start or when project tooling is missing. Sets up the Phase 0 Foundation before any feature work.

## Deliverables

**SPM dependencies** (add via Xcode or `Package.swift`):
- Firebase SDK (Crashlytics + Analytics)
- SwiftLint (build tool plugin or pre-build script phase)

**Project configuration:**
- `SwiftLint.yml` at project root with `strict: true`, at minimum: `force_try`, `force_cast`, `implicitly_unwrapped_optional`
- Crashlytics initialized in `@main` App entry point or `AppDelegate`
- `os_log` / `Logger` wrapper that strips debug output in release builds (`#if DEBUG`)
- `Info.plist` privacy strings for any required permissions declared upfront

**Build verification:**
```bash
xcodebuild build -scheme <Scheme> -destination 'platform=iOS Simulator,name=iPhone 16'
xcodebuild test -scheme <Scheme> -destination 'platform=iOS Simulator,name=iPhone 16'
```

After completion, update `.teikk/tasks/plan.md` Phase 0 Foundation checkpoint if a plan exists.
