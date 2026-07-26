# Write and verify E2E tests for critical user journeys (opt-in). Platform-aware: Maestro (Android), XCUITest (iOS), integration_test (Flutter).

**Opt-in only — part of the optional `/teikk-qa` pass, not the core verify loop.** E2E can run for minutes on a device/emulator. Do not run unless SPEC declares an E2E strategy or the user explicitly requests a flow.

Read `.teikk/spec/SPEC.md` (fall back to `.teikk/SPEC.md`) to detect platform + E2E opt-in value, then route to the matching skill/persona:

| Platform | E2E value | Skill / persona |
|----------|-----------|-----------------|
| Android | `Maestro` | `skills/android-e2e-maestro` |
| iOS | `XCUITest` | `agents/swift-expert` |
| Flutter | `integration_test` | `agents/flutter-expert` |

Read and follow `skills/android-e2e-maestro/SKILL.md`.

Common flow across platforms: 1. **Gate** — confirm SPEC E2E value matches platform; 2. **Gather identifiers** — `testTag` from Composable / `.accessibilityIdentifier` from SwiftUI / `Key`/`find.byType` from widget; 3. **Write flow file** — `.teikk/maestro/flows/<snake>.yaml` (with `appId` from `build.gradle.kts`) / `<Feature>UITests.swift` in UI test target / `integration_test/<feature>_test.dart` via `IntegrationTestWidgetsFlutterBinding`; 4. **Run** — `maestro test <flow>.yaml` / `xcodebuild test -scheme <Scheme> -destination 'platform=iOS Simulator,name=iPhone 16'` / `flutter test integration_test/<test>.dart` on device or emulator; 5. **Report** — criterion covered, file path, command run, pass/fail.

If Xcode / simulator unavailable: write the test file, document verify command, stop without claiming pass.

## Arguments

- No args — user describes journey, or pick next flow from plan/SPEC `E2E` section
- Flow name — write/update that specific flow file
- `all` — run all existing E2E flows for the detected platform without writing new files

Do not invoke during `/teikk-build` unless the active plan task explicitly says E2E.
