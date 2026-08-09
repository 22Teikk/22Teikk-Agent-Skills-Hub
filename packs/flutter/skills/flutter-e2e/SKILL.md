---
name: flutter-e2e
description: Writes and runs Flutter end-to-end user-journey tests on a real device or emulator with the official integration_test package. Use when a multi-screen Flutter app needs journey smoke tests covering navigation + DI + real app startup together, when .teikk/SPEC.md declares E2E integration_test, or when invoked via /teikk-e2e. Do NOT use for unit tests, widget component tests, or golden-only widget tests.
version: 1.0.0
platform: flutter
depends-on: [ci-cd-and-automation]
---

# Flutter E2E Testing (integration_test)

## Overview

`integration_test` is the Flutter-team's **official** end-to-end testing package. Tests live under `integration_test/` as a separate "test app" and run as a **real device/emulator build** — the full app boots, real plugins attach, real network calls run, and `WidgetTester` drives the UI exactly like a widget test. This skill is the **dedicated deep-dive** for `integration_test`; `flutter-testing-and-benchmark` §7 keeps the quick-start section and points here. E2E is **opt-in** — not every project needs it. Use `/teikk-test` (TDD: unit + widget tests) for the fast loop; reach for this skill only for critical multi-screen journeys.

## When to Use

- `.teikk/SPEC.md` or a plan declares `E2E: integration_test` for one or more acceptance criteria.
- User invokes `/teikk-e2e` with a journey name or acceptance criterion.
- Pre-ship smoke when `integration_test/` already exists (via `/teikk-ship` optional check).
- Multi-screen flows where widget tests cannot cover **navigation + DI + real app startup + real plugins** together.
- Device-accurate golden captures (`matchesGoldenFile` on a real device under `integration_test/`).

**When NOT to use:**
- Single-screen apps, libraries, or prototypes with no journey requirement.
- Replacing unit or widget component tests — E2E complements the pyramid, it does not replace the base. See `flutter-testing-and-benchmark`.
- Logic-heavy widget assertions — a widget test with provider overrides is faster and precise; E2E buys you the *real* stack, not speed.
- Performance measurement — use `Timeline` + profile mode (`flutter-testing-and-benchmark` §9).
- Every `/teikk-build` task — E2E is too slow for the TDD loop.

## Prerequisites

1. **`integration_test` dev dependency** in `pubspec.yaml` (part of the Flutter SDK — no version to invent):

   ```yaml
   dev_dependencies:
     integration_test:
       sdk: flutter
   ```

2. **Device or emulator** running. List targets with `flutter devices`; iOS needs `flutter emulators --launch apple_ios_simulator`, Android needs an AVD up.
3. **`flutter_test`** already present (it is, in every Flutter project's `pubspec.yaml`).
4. **Stable selectors** — `Key`s added to the widgets in the journey (see Core Process Step 2).

If no device is available, write the test but stop before claiming verification — report what the user must run locally.

## Core Process

### Step 1: Confirm scope (opt-in gate)

Read `.teikk/SPEC.md` (or the user request) for the acceptance criterion this journey must prove:

```
JOURNEY SCOPE:
- Criterion: [from SPEC success criteria or user]
- Screens:   [from `flutter-navigation` routes / plan]
- Device:    [flutter devices target id]
→ Proceed only if this is a journey test, not a component test.
```

If SPEC says `E2E: none` and the user did not explicitly request E2E, stop and suggest `/teikk-test` instead.

### Step 2: Add stable selectors to app code

**Do not hallucinate UI text.** Read the widget source for each screen in the journey and add `Key`s to interactive elements. `Key`s are stable against copy/text changes and are the E2E equivalent of Maestro `id:`. Follow the selector priority:

| Priority | Selector | Source |
|----------|----------|--------|
| 1 | `Key` | `Key('fab_add_task')` in the widget tree |
| 2 | `find.text(...)` | string literals / l10n in UI code |
| 3 | `find.byType(...)` | widget type — last resort, brittle |

```dart
FloatingActionButton(
  key: const Key('fab_add_task'),
  onPressed: onAdd,
  child: const Icon(Icons.add),
)
```

Cross-check navigation order against `flutter-navigation` routes or the `go_router` config.

### Step 3: Write the journey test

Layout:

```
integration_test/
  app_test.dart       # full-journey smoke
  persistence_test.dart
test_driver/
  integration_test.dart
```

**Binding + real app boot.** `IntegrationTestWidgetsFlutterBinding.ensureInitialized()` must be the **first line** of `main()`. Boot the real app with `app.main()` (not `pumpWidget`) so DI, routes, and plugins start exactly as in production. **Assert the VALUE the user entered, not just a static label:**

```dart
import 'package:integration_test/integration_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('create task then see it in the list', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('fab_add_task')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('field_title')), 'Buy Milk');
    await tester.tap(find.byKey(const Key('btn_save')));
    await tester.pumpAndSettle();

    expect(find.text('Buy Milk'), findsOneWidget);          // the value round-tripped
    expect(find.text('Total: \$12.50'), findsOneWidget);     // derived total changed
  });
}
```

**A journey that only asserts static chrome ("Task List", "Add") is worthless** — an app that inserts a row but never renders it, or computes the wrong total, still passes. Always assert the dynamic value the user produced and any total/derived state it should change.

**Long lists — `scrollUntilVisible` instead of `tapAt`:**

```dart
await tester.scrollUntilVisible(find.text('Task 50'), 500);
await tester.tap(find.text('Task 50'));
await tester.pumpAndSettle();
```

**Real async.** On a real device the app's own async (HTTP, DB, plugin calls) runs genuinely. When the *test itself* must await real asynchronous work that is not driven by frames/timers (e.g. polling a websocket), wrap it in `tester.runAsync(() async { ... })`. Prefer `pumpAndSettle` for anything driven by frames or animations — do not scatter `Future.delayed` sleeps.

### Step 4: Add the `test_driver` file

`flutter test` needs a driver entry to talk to the running app on the device:

```dart
// test_driver/integration_test.dart
import 'package:integration_test/integration_test_driver.dart';

Future<void> main() => integrationDriver();
```

### Step 5: Run on a device (mandatory)

A journey is not done until it passes on device/emulator:

```bash
# List targets
flutter devices

# Single file
flutter test integration_test/app_test.dart -d <device-id>

# Whole suite
flutter test integration_test -d <device-id>
```

**On failure:** read the failure output, fix selectors or timing, re-run. Do not mark the task complete on a failing run.
**On success:** report test path, criterion covered, device used, and the command.

### Step 6: Golden screenshots on device

`matchesGoldenFile` also works inside `integration_test` and captures **real device rendering** (fonts, shaders, plugin-drawn surfaces) that widget-test goldens cannot. Use sparingly — device goldens are larger and renderer-sensitive:

```dart
await tester.pumpAndSettle();
await expectLater(
  find.byType(TaskListScreen),
  matchesGoldenFile('goldens/task_list_device.png'),
);
```

- Run on one canonical device class (e.g. one Pixel emulator) and commit the `.png`s; they will not match across device classes.
- Regenerate with `flutter test integration_test --update-goldens -d <device-id>` only when the change is intentional.
- For CI-safe widget-level goldens that run on any host, use `flutter-testing-and-benchmark` §4 (`alchemist` local-vs-CI split) instead.

### Step 7: Multi-device / CI runs

Add E2E to CI only when the project adopts it in SPEC — see `ci-cd-and-automation`. Run the suite per device; a headless desktop target (`-d macos`, `-d linux`, `-d web-server` with Chrome) is the cheapest CI device, an emulator is the most faithful:

```bash
# All connected devices (watch the queue — slow)
flutter test integration_test -d all

# CI: single emulator/desktop target in the pipeline
flutter test integration_test -d macos
```

Guard the CI job: E2E is minutes per run, so gate it on a schedule / pre-ship, not every push.

## Relationship to other skills

| Concern | Skill |
|---------|-------|
| Unit / widget component TDD | `test-driven-development`, `flutter-testing-and-benchmark` |
| `integration_test` quick-start (keeps §7) | `flutter-testing-and-benchmark` |
| `Key`s in widgets | `flutter-ui` |
| Route order for the journey | `flutter-navigation` |
| Testability of layout (feature-first) | `flutter-project-structure` |
| CI pipeline for the device job | `ci-cd-and-automation` |
| Pre-ship optional run | `/teikk-ship` when `integration_test/` exists |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll write the journey from the spec without reading widget code" | Wrong text or missing `Key`s cause flaky or always-failing runs. Read source first, add `Key`s second. |
| "`integration_test` replaces widget tests" | Widget tests are faster and precise for component logic. E2E covers the cross-screen, real-stack integration only. |
| "I'll add E2E to every build task" | E2E takes minutes per run and breaks the TDD loop. Run on demand or pre-ship. |
| "The test file exists, so we're done" | An unrun test is not verification. `flutter test integration_test/ -d <device>` must pass. |
| "Patrol is the default choice" | Patrol is opt-in, for native gestures (`scrollUntilVisible` with platform fling, biometrics, permissions) that `WidgetTester` cannot express. If `integration_test` covers the flow, stop there. |
| "I'll `sleep` until the network returns" | Fixed sleeps are racy. `pumpAndSettle` drives frames; `tester.runAsync` drives genuine async; neither guesses. |

## Red Flags

- **Journeys that only assert static labels** ("Task List", "Add") and never assert a value the user entered — these pass on an app that inserts but doesn't render.
- No `IntegrationTestWidgetsFlutterBinding.ensureInitialized()` as the first line of `main()`.
- Tests booting the app with `pumpWidget` instead of `app.main()` — real DI/routes/plugins never start.
- `Future.delayed` / `sleep` scattered through the journey instead of `pumpAndSettle` / `runAsync`.
- Missing `test_driver/integration_test.dart`, or `flutter drive` used instead of `flutter test integration_test/` (the 2026 standard).
- `Key`s invented without verifying they exist in the widget source.
- Device goldens committed without pinning a canonical device class, or regenerated for every cosmetic change.
- `find.byType`/`tapAt(Offset)` used when a `Key` exists.
- E2E run when SPEC says `E2E: none` without explicit user override.

## Verification

Before marking E2E work complete:

- [ ] Journey maps to a specific SPEC acceptance criterion or user-stated journey.
- [ ] `integration_test` is a dev dependency (`sdk: flutter`); `test_driver/integration_test.dart` exists.
- [ ] `IntegrationTestWidgetsFlutterBinding.ensureInitialized()` is first; the app boots via `app.main()`.
- [ ] Test asserts the **dynamic value** the user produced (and any derived total), not just static chrome.
- [ ] Selectors sourced from actual widget code (`Key` > `text` > `byType`).
- [ ] `flutter test integration_test/<file> -d <device-id>` passes on emulator or device.
- [ ] No fixed sleeps; the journey completes in reasonable time.
- [ ] `/teikk-test` scope unchanged — unit/widget tests still own component behavior.
