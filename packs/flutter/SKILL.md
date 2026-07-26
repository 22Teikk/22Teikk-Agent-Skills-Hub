---
name: flutter-pack
description: Flutter platform-scoped skill pack — Dart 3+, Flutter 3+, Riverpod-default state management. Mirrors the Android pack for Flutter idioms (widget composition, drift/dio, Riverpod providers as DI, flutter_test/integration_test). Use when picking the platform-scoped skill subset for a Flutter target project.
version: 1.0.0
platform: flutter
---

# Flutter Pack

Platform-scoped pack for Flutter mobile (iOS + Android targets). Mirrors the Android pack shape but translated to Dart 3+ and Flutter 3+ idioms — **do not** copy/paste from the Android equivalents.

## What this pack ships

- **1 persona** (agent):
  - `flutter-expert` — senior Flutter developer for widget composition, state management (Riverpod default, BLoC variant), platform channels, and 60fps mobile performance.
- **4 skills** (consumed by `/teikk-build` and `/teikk-flutter-setup`):
  - `flutter-ui` — widget tree, stateless widgets, hoisted state, GoRouter, type-safe routing, accessibility, performance.
  - `flutter-data-and-concurrency` — `Future`/`Stream`/`Isolate`, `dio` networking, `freezed`/`json_serializable` models, `drift` (relational) or `hive` (key-value), Riverpod `AsyncValue` providers.
  - `flutter-di-and-build` — `pubspec.yaml` dependency pinning, Riverpod providers as DI (replaces Hilt), flavors (`--dart-define`), code generation (`build_runner`), asset bundling, GitHub Actions CI.
  - `flutter-testing-and-benchmark` — `flutter_test`, `mocktail`, golden tests, `integration_test`, drift in-memory DAO tests, Patrol (opt-in), `Timeline`-based perf benchmarks.

## Interaction with `/teikk-flutter-setup`

`/teikk-flutter-setup` is Phase 0 Foundation for Flutter projects. It plants the defaults this pack assumes:

- Riverpod (`flutter_riverpod` + `riverpod_annotation` + `riverpod_generator`) — the default state-management reference for every skill in this pack. BLoC variant is documented inline; do **not** mix both in the same feature subtree.
- `go_router` as the navigation primitive.
- `dio` for HTTP, `drift` for relational local data, `freezed`/`json_serializable` for models.
- `logger` (debug-only) + `firebase_crashlytics` for telemetry; `flutter_lints` or `very_good_analysis` for static analysis.

A Flutter project that has run `/teikk-flutter-setup` is ready for `/teikk-build` tasks that route to the four skills above.

## How a `/teikk-build` task routes

| Task concern | Skill |
|---|---|
| Compose a screen, widget tree, route, Riverpod `Notifier` | `flutter-ui` |
| Network call, local DB, JSON model, repository, isolate | `flutter-data-and-concurrency` |
| `pubspec.yaml`, flavors, codegen, CI, asset config | `flutter-di-and-build` |
| Unit / widget / golden / integration test, drift in-memory test, perf timeline | `flutter-testing-and-benchmark` |
| Cross-cutting review | `flutter-expert` (persona) |

## Conventions

- Frontmatter: `name`, `description` (with "Use when..." triggers), `version: 1.0.0`, `platform: flutter`, `depends-on: [...]`.
- Each skill is an **actionable process** — code patterns plus verification steps, not generic advice.
- State-management default is **Riverpod**. The BLoC variant lives in inline notes inside `flutter-ui` and `flutter-data-and-concurrency`; do not pull BLoC into a project that picked Riverpod or vice versa.
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
