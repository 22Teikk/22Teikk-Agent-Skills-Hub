---
name: flutter-di-and-build
description: Configures Flutter DI (get_it + BLoC), pubspec deps, flavors, build_runner, and GitHub Actions for Flutter. Use when editing pubspec.yaml, setting up get_it, configuring --flavor/--dart-define, or wiring CI for Flutter.
version: 1.0.0
platform: flutter
depends-on: [flutter-di]
  - observability-and-instrumentation
  - ci-cd-and-automation
---

# Flutter Dependency Injection and Build Configuration

## Overview

Standardize the Dart/Flutter toolchain: dependency management in `pubspec.yaml`, dependency injection via get_it (default) with BLoC `MultiBlocProvider` for state wiring, flavor/environment configuration with `--dart-define` and entry-point shims, asset bundling, code generation with `build_runner`, and CI/CD with GitHub Actions. This skill covers the **build** side of DI — declaring dependencies in `pubspec.yaml` and wiring codegen. For runtime DI wiring — get_it registrations, constructor injection, `ProviderScope` (Riverpod variant) — see `flutter-di`. Avoid global singletons; everything that has lifecycle is registered once in get_it.

## When to Use

- Use when adding, upgrading, or removing dependencies in `pubspec.yaml`.
- Use when wiring `get_it` registrations as the DI seam (the default for this pack).
- Use when configuring flavor-specific entry points (`main_dev.dart`, `main_prod.dart`) or `--dart-define` keys.
- Use when setting up `build_runner` for `freezed`/`json_serializable`/`riverpod_generator`/`drift`.
- Use when defining or modifying a GitHub Actions workflow for a Flutter project.
- Use when configuring asset folders, fonts, or platform-specific build settings.

## Core Process

### 1. Dependency management with `pubspec.yaml`

- Pin dependencies with **caret ranges** (`^1.2.3`) for libraries, **exact** (`1.2.3`) for tools that affect codegen output (`build_runner`, `freezed`, `drift_dev`).
- Group dependencies into `dependencies:` (runtime) and `dev_dependencies:` (build/test/lint only). Never ship a test-only or codegen-only package at runtime.
- Use `dependency_overrides` sparingly — it locks the resolution for the whole project and breaks consumers who try to add their own `pubspec`. Prefer proposing an upstream version bump.

```yaml
# pubspec.yaml (excerpt)
name: my_app
description: Teikk Flutter app
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.4.0 <4.0.0"
  flutter: ">=3.22.0"

dependencies:
  flutter:
    sdk: flutter
  get_it: ^8.0.0
  flutter_bloc: ^9.0.0
  equatable: ^2.0.0
  go_router: ^14.2.0
  dio: ^5.5.0
  freezed_annotation: ^2.4.4
  json_annotation: ^4.9.0
  drift: ^2.18.0
  talker: ^5.1.20
  talker_flutter: ^5.1.20
  # Riverpod variant (projects that declare flutter_riverpod):
  # flutter_riverpod: ^2.5.1
  # riverpod_annotation: ^2.3.5

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  build_runner: 2.4.11
  freezed: 2.5.7
  json_serializable: 6.8.0
  drift_dev: ^2.18.0
  mocktail: ^1.0.4
  # riverpod_generator: ^2.4.0 (Riverpod variant only)

flutter:
  uses-material-design: true
  assets:
    - assets/images/
    - assets/config/
  fonts:
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

### 2. DI via get_it (the default)

- For runtime DI wiring — registrations, constructor injection, test resets — see `flutter-di`. This section keeps the build-side contract.
- **Everything with a lifecycle is registered once in get_it**: `Dio`, `AppDatabase`, repositories, `Talker`, `GoRouter`, `FirebaseMessaging`.
- Call `setupLocator()` at the top of `main()` **before** `runApp()`. For tests, `getIt.reset()` and register fakes.
- Lazy singletons live for the app lifetime; use `registerFactory` for per-scope instances.

```dart
// lib/di/locator.dart
final locator = GetIt.instance;

void setupLocator() {
  locator.registerLazySingleton<AppDatabase>(() => AppDatabase(_openConnection()));
  locator.registerLazySingleton<Talker>(() => TalkerFlutter.init());
  // ... other registrations
}
```

- **Avoid global singletons.** If you see `final repo = MyRepository()` outside a registration, it has escaped DI; move it.
- **BLoC wiring**: the pack default uses `flutter_bloc`, exposing each `Bloc` via `MultiBlocProvider` at the root and `RepositoryProvider` for repositories. The dependency rules below still apply.
- **Riverpod variant**: projects that declared `flutter_riverpod` author providers with `riverpod_generator` (`@riverpod`) next to the class they expose and swap with `ProviderScope(overrides: [...])` in tests; never mix the two DI seams in the same feature subtree.

### 3. Flavors and environments with `--dart-define`

- Keep a **single** `lib/main.dart` that reads `--dart-define` keys (`API_BASE`, `SENTRY_DSN`, `FLAVOR_NAME`). Spin up per-flavor bootstrap shims only when Firebase/native config differs (`main_dev.dart`, `main_prod.dart`).
- Provide sane defaults so `flutter run` works without flags: `const String.fromEnvironment('API_BASE', defaultValue: 'https://api.dev.example.com')`.

```dart
// lib/config/env.dart
class Env {
  const Env._();
  static const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
  static const apiBase = String.fromEnvironment('API_BASE',
      defaultValue: 'https://api.dev.example.com');
  static const sentryDsn = String.fromEnvironment('SENTRY_DSN',
      defaultValue: '');
  static bool get isProd => flavor == 'prod';
}
```

- Run with: `flutter run --dart-define=FLAVOR=dev --dart-define=API_BASE=https://api.dev.example.com`
- Or via flavor shims (Android): `flutter build apk --flavor dev -t lib/main_dev.dart`

### 4. Build modes

- **debug**: assertions on, Observatory/DevTools attached, JIT. Used for development and most CI test runs.
- **profile**: assertions off, AOT, Observatory still attached. The only mode that gives accurate performance numbers — run Macrobenchmark-style measurements here, not in release.
- **release**: assertions off, AOT, Observatory stripped. Use for ship builds, App Store / Play Store uploads.
- Codegen-generated files (`*.g.dart`, `*.freezed.dart`, `*.gr.dart`) must be present before any release build. CI runs `dart run build_runner build --delete-conflicting-outputs` before `flutter build`.

### 5. Code generation with `build_runner`

- One `build.yaml` at the repo root to configure generators globally.
- Generate once: `dart run build_runner build --delete-conflicting-outputs`.
- Watch during development: `dart run build_runner watch --delete-conflicting-outputs`.
- Commit the generated files unless the project policy forbids it. CI without committed codegen breaks on every clean checkout.

```yaml
# build.yaml
targets:
  $default:
    builders:
      json_serializable:
        options:
          field_rename: snake
          explicit_to_json: true
```

### 6. Asset bundling

- Reference assets from `pubspec.yaml` `flutter.assets:`. Group by domain (`assets/images/`, `assets/icons/`, `assets/config/`) — avoid one flat `assets/` directory with hundreds of files.
- Use `rootBundle.loadString` or `flutter_svg` for SVGs; never `Image.asset('assets/foo.png')` from network-loaded config (the asset path must be static).
- For large binary assets (video, audio), declare them in `flutter.assets:` — Flutter's tree-shaker otherwise strips them.

### 7. CI/CD with GitHub Actions

- A Flutter CI workflow: checkout, set up JDK (Android), set up Flutter, cache `~/.pub-cache`, run `flutter pub get`, `dart run build_runner build --delete-conflicting-outputs`, `flutter analyze`, `flutter test`, then platform builds.

```yaml
# .github/workflows/flutter.yml
name: Flutter CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - run: flutter pub get
      - run: dart run build_runner build --delete-conflicting-outputs
      - run: flutter analyze
      - run: flutter test --coverage
      - run: flutter build apk --release --flavor prod -t lib/main_prod.dart
```

- For App Store / Play Store distribution, use `fastlane` (iOS) and the official Google Play publisher action (Android) — not raw `flutter build` + manual upload.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just `final repo = MyRepository();` at module scope, it's faster" | That is a global singleton. It survives tests, blocks fake injection, and creates order-of-initialization bugs. Use a registration. |
| "I'll skip the Version Catalog equivalent — `pubspec.yaml` is fine" | `pubspec.yaml` IS the dependency catalog for Dart. Pin versions, group by purpose, and don't sprinkle `dependency_overrides` to silence conflicts. |
| "I'll commit secrets in `--dart-define`" | `--dart-define` values are compiled into the binary; they are recoverable from a release APK/IPA. Use runtime config fetched from a backend, or platform keychain (`flutter_secure_storage`), for anything sensitive. |
| "I'll just run `flutter build` in CI without `build_runner`" | The first clean checkout that runs without `pub get` and codegen will fail. CI must always run codegen, or commit the generated files. |
| "I'll use `dependency_overrides` to silence a version conflict" | It locks resolution globally. Fix the conflict at its source (upgrade the conflicting package, or pin one side) instead. |

## Red Flags

- Hardcoded `Dio()`, `AppDatabase`, `Talker`, `GoRouter`, or `Repository` instances at module scope.
- `dependency_overrides` in `pubspec.yaml` to silence a real version conflict.
- Test-only or codegen-only packages in `dependencies:` instead of `dev_dependencies:`.
- Secrets (API keys, signing material, Sentry DSN) baked in via `--dart-define` to a release build.
- Missing `build_runner` step in CI on a clean checkout.
- `.dart_tool/` or `build/` committed to git (should be ignored).
- `flutter run` works but `flutter build apk --release` fails (forgot a codegen step or asset).
- A flavor that silently falls back to a "prod" base URL because the `--dart-define` was never passed.

## Verification

- [ ] `flutter pub get` succeeds with no version-solving conflicts.
- [ ] `dart run build_runner build --delete-conflicting-outputs` exits cleanly.
- [ ] `flutter analyze` reports zero warnings.
- [ ] `flutter test` passes.
- [ ] `flutter build apk --release --flavor prod -t lib/main_prod.dart` and `flutter build ios --release --flavor prod -t lib/main_prod.dart` both succeed.
- [ ] No `Dio()` / `AppDatabase()` / `Talker()` instantiated at module scope.
- [ ] `setupLocator()` runs before `runApp(...)`; `Bloc.observer` is registered. (Riverpod variant: `ProviderScope` wraps the root and `ProviderScope(overrides: [...])` the test root.)
- [ ] No `dependency_overrides` in `pubspec.yaml` (unless documented in `## Open Questions` and tracked).
- [ ] CI workflow runs codegen + analyze + test + build, with a cached `~/.pub-cache`.
