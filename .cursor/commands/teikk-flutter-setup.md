# Set up Flutter foundation — flavor config, state management, logging, Crashlytics

Read `agents/flutter-expert.md`.

Use at Flutter project start or when project tooling is missing. Sets up the Phase 0 Foundation before any feature work.

## Deliverables

**Flavor / environment config:**
- `flutter_flavor` or manual `--dart-define` approach for `dev` / `staging` / `prod`
- Separate `main_dev.dart`, `main_prod.dart` entry points with environment-aware Firebase init

**State management (pick from SPEC, default Riverpod):**
- Riverpod: `flutter_riverpod` + `riverpod_annotation` + `riverpod_generator`; `ProviderScope` at root
- BLoC: `flutter_bloc`; `BlocObserver` for debug logging

**Routing:**
- `go_router` — `GoRouter` defined in a dedicated `router.dart`, typed route objects

**Logging + Crashlytics:**
- `firebase_crashlytics` with `FlutterError.onError` and `PlatformDispatcher.instance.onError` wired
- `logger` package with `DevelopmentFilter` (debug only) and `ProductionFilter` (errors only in release)

**Lint:**
- `flutter_lints` or `very_good_analysis` in `analysis_options.yaml`

**Build verification:**
```bash
flutter analyze
flutter test
flutter build apk --flavor dev
```

After completion, update `.teikk/tasks/plan.md` Phase 0 Foundation checkpoint if a plan exists.
