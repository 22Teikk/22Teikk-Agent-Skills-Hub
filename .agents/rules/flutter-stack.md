# Flutter Stack Defaults

Apply when working on Flutter projects unless .teikk/SPEC.md or the user overrides.

## Architecture

- Clean architecture: `presentation` → `domain` → `data`
- State management: Riverpod 2 (`@riverpod` + code gen) as default; BLoC if project already uses it
- Navigation: `go_router` with typed route objects — no `Navigator.push` in feature code
- UI state modeled as sealed class: `Loading | Success(data) | Error(message)`

## Widget Design

- Prefer `StatelessWidget` + Riverpod; `StatefulWidget` only for local ephemeral state
- `const` constructors on every widget with static parameters
- `ListView.builder` / `SliverList` for unbounded lists — never `ListView(children: [...])`
- `RepaintBoundary` around expensive independently-animating sub-trees

## Dependency Management

- `pubspec.yaml` with pinned minor versions (`^x.y.0`)
- `flutter pub upgrade --major-versions` only when intentional
- Run `flutter pub outdated` before planning phase

## Observability

- `firebase_crashlytics` with `FlutterError.onError` + `PlatformDispatcher.instance.onError`
- `logger` package: `DevelopmentFilter` for debug, `ProductionFilter` for release
- No `print()` in production code

## Skills / Personas by layer

| Work | Use |
|------|-----|
| Widget trees, state, routing | `flutter-expert` persona |
| E2E journeys | `teikk-e2e` (integration_test path) |
| Tests | `teikk-test` (Flutter routing) |
| Logging/telemetry | `skills/observability-and-instrumentation` |
