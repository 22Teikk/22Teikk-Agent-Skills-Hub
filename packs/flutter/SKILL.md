---
name: flutter-pack
description: Flutter platform-scoped skill pack — Dart 3+, Flutter 3+, Riverpod-default state management. Mirrors the Android pack for Flutter idioms (widget composition, drift/dio, Riverpod providers as DI, flutter_test/integration_test). Use when picking the platform-scoped skill subset for a Flutter target project.
version: 1.0.0
platform: flutter
---

# Flutter Pack

Platform-scoped pack for Flutter mobile (iOS + Android targets). Mirrors the Android pack shape but translated to Dart 3+ and Flutter 3+ idioms — **do not** copy/paste from the Android equivalents.

## What this pack ships

- **2 personas** (agents):
  - `flutter-expert` — senior Flutter developer for widget composition, state management (Riverpod default, BLoC variant), platform channels, and 60fps mobile performance.
  - `flutter-performance-auditor` — Flutter performance auditor for rebuild/jank, list/image performance, and DevTools `Timeline` analysis on the way to 60/120fps.
- **17 skills** (consumed by `/teikk-build` and `/teikk-flutter-setup`):
  - `flutter-project-structure` — feature-first layout (`lib/features/<feature>/{data,domain,presentation}` + `lib/core/`), official MVVM UI/Data layer split, Riverpod/BLoC placement, monorepo (melos/workspaces) decision.
  - `flutter-ui` — widget tree, stateless widgets, hoisted state, GoRouter, type-safe routing, accessibility, performance.
  - `flutter-navigation` — type-safe navigation with `go_router` 17.x, `GoRoute`/`StatefulShellRoute`, redirect/auth gating, deep links, `go_router_builder` typed routes, state restoration.
  - `flutter-state-riverpod` — Riverpod 3.x state management: `Notifier`/`AsyncNotifier`, `@riverpod` codegen, `family`/`autoDispose`/`select`, `ProviderScope`, Riverpod-as-DI wiring.
  - `flutter-state-bloc` — Bloc 9.x/Cubit event-driven state: `Bloc<Event,State>`/`Cubit`, `BlocProvider`/`BlocListener`/`BlocBuilder`, `bloc_test`.
  - `flutter-state-provider` — legacy Provider 6.x / `ChangeNotifier` maintenance (`context.watch`/`context.read`, `MultiProvider`, `ProxyProvider`) and Provider→Riverpod migration out.
  - `flutter-theming` — Material 3 (default), `ColorScheme.fromSeed`, dark mode (`darkTheme`/`themeMode`), `ThemeExtension` custom tokens, `textTheme` typography, `WidgetStateProperty`.
  - `flutter-localization` — official gen-l10n + ARB pipeline (`flutter_localizations` + `intl: any`), placeholders/plurals, locale delegates, `synthetic-package: false`.
  - `flutter-data-networking` — HTTP with `dio`/`retrofit`: `BaseOptions`/interceptors, `@RestApi` type-safe clients, `freezed` DTOs, streaming/cancellation.
  - `flutter-data-persistence` — local storage choice (drift/hive/shared_preferences/sqflite), drift tables & migrations (`MigrationStrategy`), `watch()` streams, hive `TypeAdapter`s.
  - `flutter-data-and-concurrency` — `Future`/`Stream`/`Isolate`, `freezed`/`json_serializable` models, Riverpod `AsyncValue` providers, repository patterns.
  - `flutter-di` — runtime DI with `get_it` + Riverpod hybrid: `registerSingleton`/`registerLazySingleton`/`registerFactory`, `setupLocator()`, resetting the locator in tests.
  - `flutter-error-handling` — three global surfaces (`FlutterError.onError`, `PlatformDispatcher.instance.onError`, `runZonedGuarded`), sealed-class `Result` types for repositories, `ErrorWidget.builder`.
  - `flutter-animations` — implicit (`AnimatedContainer`, `AnimatedSwitcher`) and explicit (`AnimationController` + `Tween`/`AnimatedBuilder`) motion, Hero, staggered `Interval` sequences, `AnimatedList`, spring curves.
  - `flutter-e2e` — journey smoke tests on device/emulator with the official `integration_test` package, multi-screen flows covering navigation + DI + real startup.
  - `flutter-di-and-build` — `pubspec.yaml` dependency pinning, Riverpod providers as DI (replaces Hilt), flavors (`--dart-define`), code generation (`build_runner`), asset bundling, GitHub Actions CI.
  - `flutter-testing-and-benchmark` — `flutter_test`, `mocktail`, golden tests, `integration_test`, drift in-memory DAO tests, Patrol (opt-in), `Timeline`-based perf benchmarks.

## Interaction with `/teikk-flutter-setup`

`/teikk-flutter-setup` is Phase 0 Foundation for Flutter projects. It plants the defaults this pack assumes:

- Riverpod (`flutter_riverpod` + `riverpod_annotation` + `riverpod_generator`) — the default state-management reference for every skill in this pack. BLoC variant is documented inline; do **not** mix both in the same feature subtree.
- `go_router` as the navigation primitive.
- `dio` for HTTP, `drift` for relational local data, `freezed`/`json_serializable` for models.
- `logger` (debug-only) + `firebase_crashlytics` for telemetry; `flutter_lints` or `very_good_analysis` for static analysis.

A Flutter project that has run `/teikk-flutter-setup` is ready for `/teikk-build` tasks that route to the seventeen skills above.

## How a `/teikk-build` task routes

| Task concern | Skill |
|---|---|
| Project/feature layout, layer boundaries, monorepo decision | `flutter-project-structure` |
| Compose a screen, widget tree, accessibility | `flutter-ui` |
| Type-safe routes, redirects, deep links, shell routes | `flutter-navigation` |
| Riverpod 3.x state (`Notifier`, `@riverpod` codegen, `ProviderScope`) | `flutter-state-riverpod` |
| Bloc/Cubit event-driven state (`bloc` projects) | `flutter-state-bloc` |
| Legacy Provider 6.x maintenance / migration out | `flutter-state-provider` |
| Theme, colors, dark mode, custom design tokens | `flutter-theming` |
| Localization, ARB messages, locale delegates | `flutter-localization` |
| HTTP networking, `dio`/`retrofit` API clients, DTOs | `flutter-data-networking` |
| Local DB, drift tables/migrations, hive, storage choice | `flutter-data-persistence` |
| Isolates, streams, models, repository patterns | `flutter-data-and-concurrency` |
| Runtime DI (`get_it` + Riverpod hybrid), service registration | `flutter-di` |
| Global error handlers, Result types, error UI | `flutter-error-handling` |
| Implicit/explicit animations, Hero, staggered motion | `flutter-animations` |
| Journey smoke tests (`integration_test`) on device/emulator | `flutter-e2e` |
| `pubspec.yaml`, flavors, codegen, CI, asset config | `flutter-di-and-build` |
| Unit / widget / golden / integration test, drift in-memory test, perf timeline | `flutter-testing-and-benchmark` |
| Performance audit — rebuilds, jank, images, DevTools timeline | `flutter-performance-auditor` (agent) |
| Cross-cutting review | `flutter-expert` (persona) |

## Conventions

- Frontmatter: `name`, `description` (with "Use when..." triggers), `version: 1.0.0`, `platform: flutter`, `depends-on: [...]`.
- Each skill is an **actionable process** — code patterns plus verification steps, not generic advice.
- State-management default is **Riverpod** (`flutter-state-riverpod`). Projects that declared `bloc` route to `flutter-state-bloc`; legacy `provider` 6.x apps route to `flutter-state-provider` (maintenance/migration). Do not pull BLoC into a project that picked Riverpod or vice versa.
- Money values are `int` minor units end-to-end (never `double`); proven by a drift in-memory DAO test.
- Drift schema bumps always ship a `MigrationStrategy.onUpgrade`; silence is data loss on update.
- Generated files (`*.g.dart`, `*.freezed.dart`, `*.gr.dart`) are committed unless the project policy forbids it. CI without codegen breaks on every clean checkout.

## Boundary

This pack is **mobile-only** (iOS + Android Flutter targets). It does not cover:

- Flutter Web — different render tree, different perf budget, different routing assumptions.
- Flutter Desktop (Windows / macOS / Linux) — different windowing, different input model.
- Pure Dart server / CLI — see `core/skills/` instead.

If a target project needs one of those, switch to a generic-Dart skill from `core/` and do not pull anything from `packs/flutter/`.

## Related

- Core (platform-neutral) skills — `core/skills/` — used by every Flutter project on top of this pack.
- Other packs — `packs/android/`, `packs/ios/` — kept in lock-step for parity; do not duplicate skills across packs.
- Setup workflow — `/teikk-flutter-setup` (Phase 0) plants the defaults this pack assumes.
