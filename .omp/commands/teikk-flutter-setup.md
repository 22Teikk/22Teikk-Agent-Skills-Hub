---
description: Set up Flutter foundation — flavor config, state management, logging, Crashlytics
---

Read `flutter-expert`.

Use at Flutter project start or when project tooling is missing. Sets up the Phase 0 Foundation before any feature work. Read `observability-and-instrumentation` for logging hygiene; plant the library named in `logging.library` from `.teikk/spec/PROJECT.yaml` (fall back to `.teikk/PROJECT.yaml`, then `talker` as the platform default) — this is the library every `/teikk-build` task will use inline going forward.

## Deliverables

**Flavor / environment config:**
- `flutter_flavor` or manual `--dart-define` approach for `dev` / `staging` / `prod`
- Separate `main_dev.dart`, `main_prod.dart` entry points with environment-aware Firebase init

**State management (pick from SPEC, default BLoC/Cubit):**
- BLoC/Cubit: `flutter_bloc` + `equatable`; default `Cubit` for most features (plain methods + `emit`), promote to `Bloc<Event,State>` only for event logs / concurrency / audit; `Bloc.observer = TalkerBlocObserver(talker: talker)` for audit logging
- Riverpod: `flutter_riverpod` + `riverpod_annotation` + `riverpod_generator`; `ProviderScope` at root (variant)

**Routing:**
- `go_router` — `GoRouter` defined in a dedicated `router.dart`, typed route objects

**Logging + Crashlytics:**
- `firebase_crashlytics` with `FlutterError.onError` and `PlatformDispatcher.instance.onError` wired
- Per `logging.library`: Talker (`talker` + `talker_flutter`, default) — `TalkerFlutter.init(safeMode: !kDebugMode)` with console logging configured via `TalkerConfig`; add `talker_dio_logger` for dio stacks and `talker_bloc_logger` for bloc stacks

**Lint:**
- `flutter_lints` or `very_good_analysis` in `analysis_options.yaml`

**Build verification:**
```bash
flutter analyze
flutter test
flutter build apk --flavor dev
```

After completion, update `.teikk/tasks/plan.md` Phase 0 Foundation checkpoint if a plan exists.
