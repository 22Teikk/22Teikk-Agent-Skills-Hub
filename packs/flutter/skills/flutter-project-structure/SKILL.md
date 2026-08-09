---
name: flutter-project-structure
description: Structures Flutter projects and features with the 2026-standard feature-first layout and the official MVVM UI/Data layer split. Use when creating a new Flutter project or organizing an existing one, deciding where a file belongs (lib/features/<feature>/{data,domain,presentation} vs lib/core vs lib/shared vs lib/app), enforcing layer boundaries and import rules, or choosing between single-package and melos/workspaces monorepos.
version: 1.0.0
platform: flutter
depends-on: [flutter-state-bloc, flutter-testing-and-benchmark]
---

# Flutter Project Structure (Feature-First + MVVM Layers)

## Overview

The 2026 Flutter standard is **feature-first layout** with the official Flutter-recommended **MVVM split**: a **UI layer** (Views + ViewModels) and a **Data layer** (Repositories + Services). Every feature — auth, tasks, settings — is a self-contained folder holding its own UI, state, domain contracts, and data implementation, so the code you touch for one feature lives in one place. Cross-feature infrastructure (theme, network, DI, constants) lives in `lib/core/`; truly generic widgets live in `lib/shared/`.

This structure is **state-agnostic**. BLoC is the default state holder in this pack; Riverpod is a supported variant. The folder layout, layer boundaries, and dependency rules are identical for both — only the files inside `presentation/` change shape (see `flutter-state-bloc` and `flutter-state-riverpod`).

The dependency rule is the contract that keeps the whole thing coherent: **presentation → domain → data**. Presentation may depend on domain and data; domain depends on nothing but Dart; data implements domain contracts.

## When to Use

- Use when creating a new Flutter project — this is the layout to scaffold.
- Use when organizing an existing project that has drifted into `lib/screens/`, `lib/models/`, `lib/services/` global folders.
- Use when deciding where a new file belongs (`lib/features/<feature>/...` vs `lib/core/` vs `lib/shared/`).
- Use when defining or enforcing layer boundaries (who may import what).
- Use when evaluating whether to split into a monorepo (melos, Dart pub workspaces).
- Do NOT use for Android or iOS native (see the android/ios packs); do NOT use for widget-level composition (`flutter-ui`) or navigation structure (`flutter-navigation`).

## Core Process

### 1. The canonical layout

Scaffold the app in five top-level zones: `main.dart` (entry), `lib/app/` (composition root), `lib/core/` (infrastructure), `lib/shared/` (generic widgets), and `lib/features/` (business capabilities).

```text
lib/
├── main.dart                 # bootstrap only: ensureInitialized, DI setup, runApp
├── app/
│   ├── app.dart              # root MaterialApp.router widget (the "App widget")
│   ├── router.dart           # GoRouter table — see flutter-navigation
│   ├── theme.dart            # light/dark ThemeData, ColorScheme.fromSeed
│   └── di.dart               # ProviderScope wiring / setupLocator() — see flutter-di
├── core/
│   ├── constants/            # app-wide constants, Env --dart-define keys
│   ├── network/              # shared Dio client, interceptors, error mapping
│   ├── theme/                # theme extensions, app colors, text styles
│   └── utils/                # pure Dart helpers, formatters, extension methods
├── shared/
│   ├── widgets/              # genuinely generic widgets (EmptyState, ErrorView)
│   └── styles/               # spacing, typography tokens usable outside theme
└── features/
    ├── auth/
    │   ├── data/             # repositories impl, DTOs, data sources
    │   ├── domain/           # entities, use cases, repository interfaces
    │   └── presentation/     # screens, view models/providers/blocs, feature widgets
    ├── tasks/
    └── settings/
test/
├── core/                     # unit tests for core utilities
├── shared/                   # widget tests for shared widgets
└── features/                 # tests mirror the feature layout exactly
```

`main.dart` stays tiny — it wires DI and hands off. Everything the app is and does lives in `lib/app/` and `lib/features/`. The `lib/app/` folder is the composition root: it is the only place allowed to import across `lib/core/`, `lib/shared/`, and every feature.

### 2. Feature internals: presentation / domain / data

Each feature repeats the same three sub-layers. The names are the same for every feature so a developer never has to think about where something goes:

- **`presentation/`** — screens (`Widget`), state holders, and feature-scoped widgets. With Riverpod this holds `AsyncNotifier`s / providers next to the screens that use them; with BLoC it holds `Bloc`/`Cubit` classes. This is the **UI layer** of the MVVM split — Views render state, ViewModels hold it.
- **`domain/`** — pure Dart: entities, use cases, and repository **interfaces**. No Flutter imports, no `dart:ui`, no concrete data implementation. This is where business rules that must be unit-tested in isolation live.
- **`data/`** — concrete repository implementations, DTOs, and data sources (API clients, drift tables, Hive boxes). This is the **Data layer** of the MVVM split.

```dart
// features/tasks/domain/task.dart            — pure Dart entity
class Task {
  const Task({required this.id, required this.title, required this.done});
  final String id;
  final String title;
  final bool done;
}

// features/tasks/domain/task_repository.dart  — contract, no Flutter imports
abstract interface class TaskRepository {
  Future<List<Task>> getTasks();
  Future<void> toggleDone(String id);
}

// features/tasks/data/task_repository_impl.dart — implements the contract
class TaskRepositoryImpl implements TaskRepository {
  TaskRepositoryImpl(this._api);
  final TaskApi _api; // data source — dio client, drift DAO, or hive box
  @override
  Future<List<Task>> getTasks() async {
    final dtos = await _api.fetchTasks();
    return dtos.map(TaskDto.toEntity).toList();
  }
}

// features/tasks/presentation/task_list_controller.dart — state holder
final taskListProvider = AsyncNotifierProvider<TaskListController, List<Task>>(
  TaskListController.new,
);

class TaskListController extends AsyncNotifier<List<Task>> {
  @override
  Future<List<Task>> build() => ref.read(taskRepositoryProvider).getTasks();
}
```

The MVVM split maps cleanly onto these folders: **UI layer = presentation/** (Views + ViewModels/Controllers), **Data layer = data/** (Repositories + Services). The official Flutter architecture guidance (UI / Data split) and the 2026 community consensus (layers inside features) are satisfied by the same tree — this is why this layout is the standard.

### 3. Feature naming conventions

- **Name features by capability, not screen.** `auth`, `tasks`, `settings`, `payments` — not `login_screen`, `task_screen`, `settings_screen`. A feature is a functional requirement; a screen is a view inside it.
- Use **lowercase singular** folder names (`feature/task/`), matching Dart's lowercase-with-underscores package convention. Multi-word features are `snake_case`: `password_reset`, `product_details`.
- **One feature = one folder**, no matter how many screens or routes it contains. A screen is a child of its feature, so a feature with a list + detail + edit flow stays one `tasks/` folder.
- File names inside a feature are self-documenting: `task_list_screen.dart`, `task_repository.dart`, `task_dto.dart`, `toggle_done_use_case.dart`.
- Don't create a feature for infrastructure (`networking/`, `theming/`) — that is `lib/core/` territory. Don't create a feature for one widget (`profile_header/`) — that is `lib/shared/` until it grows business logic.

### 4. When a widget belongs in `lib/shared/` vs a feature

Rule of thumb: **a widget starts in the feature that uses it and is promoted to `lib/shared/` when a second feature needs the same widget.** The test is "two unrelated features use this," not "I might reuse this someday." Premature promotion is how shared folders become God folders.

```text
PROMOTE when:                  KEEP in feature when:
- 2+ features use it          - only one feature uses it
- it is UI-only (no state)    - it owns feature state or business logic
- it takes data as params     - it calls a feature repository/provider
```

A widget that reads a provider from `features/auth/` cannot be shared — it is coupled to auth. Extract the pure presentation into `lib/shared/widgets/` and keep the stateful wrapper in the feature. Widgets in `lib/shared/` must be **stateless or parameter-driven** and must never import a feature.

### 5. Folder boundaries enforcement

Boundaries are only real if they are enforced mechanically — a folder structure alone does not stop a `import 'features/tasks/data/task_repository_impl.dart'` inside a domain file:

- **Import rules are the law:**
  - `presentation/` → may import `domain/` and `data/` (and `core/`, `shared/`).
  - `domain/` → may import **only** Dart + `core/constants` + `core/utils` if they are pure. Never `data/`, never `presentation/`, never `dart:ui`, never `package:flutter/`.
  - `data/` → may import `domain/` (the interfaces it implements) + `core/network` + its data-source packages (dio, drift, hive). Never `presentation/`.
  - `lib/shared/` → may import `core/` and Flutter. Never a feature.
  - `lib/app/` → the only place that imports everything, on purpose (composition root).
- **Use `dart run custom_lint` or `very_good_analysis` with an `avoid_relative_lib_imports` / `depend_on_referenced_packages`-style rule set** to make cross-layer imports a compile/analyze failure, not a review comment. If you use `melos`, `melos exec -- dart analyze` checks every package from its own boundary.
- **Never reach across features.** `features/tasks/presentation` must not import `features/auth/data`. Cross-feature data sharing goes through a use case exposed by the owning feature, or through `lib/core/` if it is truly generic.
- Prefer **relative imports within a feature** and package imports across `lib/` zones — it makes the boundary visible in every import line.
- Avoid circular feature dependencies by keeping shared contracts in the feature that owns the data, or promote the contract to `lib/core/` only when two features genuinely need it.

### 6. Avoiding God folders

A God folder is any folder that accretes every file nobody knew where else to put. It defeats the entire structure. Defense:

- **`lib/core/` is infrastructure, not a junk drawer.** If a file in `lib/core/` references a feature, it does not belong in core. Core stays free of business logic: constants, utils, network, theme — nothing that knows about tasks or auth.
- **`lib/shared/` earns every file** via the two-feature rule above. A `shared/widgets/` folder full of single-use widgets is a God folder with a better name.
- **`features/<feature>/presentation/` is not a dumping ground either** — split into `screens/`, `widgets/` (feature-scoped), and `controllers/` (state) once a feature passes ~5 files, so a 30-file feature still reads cleanly.
- **No `lib/utils.dart`, no `lib/helpers.dart` at the root.** Every helper lives in the folder of the code it serves; generic pure-Dart helpers go to `lib/core/utils/`.
- If a folder has more than ~15 files with no internal organization, that folder has outgrown its structure — subdivide it rather than appending files.

### 7. Testing implications: each layer testable independently

The layer boundaries exist so each layer is testable without the layers above it — this is a primary *reason* for the structure, not a side effect:

- **`domain/`** is the cheapest to test: pure Dart, no mocks, no Flutter binding. Use cases and entity logic run in plain `test/` cases.
- **`data/`** tests the repository against real data sources where possible: drift in-memory DAO tests (`NativeDatabase.memory()`) and `dio` against a mocked `HttpClientAdapter` or a fake data source. The repository interface in `domain/` is what makes `TaskRepositoryImpl` fakeable — `presentation/` tests never touch the network.
- **`presentation/`** widget tests inject fakes through the state holder: `ProviderScope(overrides: [taskRepositoryProvider.overrideWithValue(FakeTaskRepository())])` for Riverpod, or `RepositoryProvider` with a fake for BLoC. Because presentation depends on the *interface*, not the implementation, the fake is a 5-line class — see `flutter-testing-and-benchmark` for the full harness.
- **Mirror the layout in `test/`.** `test/features/tasks/` holds that feature's unit, widget, and data tests; `test/core/` and `test/shared/` hold theirs. A test that crosses into another feature's folder is a smell that the code under test also crosses a boundary.
- Keep `flutter analyze` and `flutter test` green as the gate that proves the boundaries are respected — a violation of the import rules should fail analyze (via lint) before it ever runs.

### 8. Monorepo decision (melos / Dart workspaces)

Default to a **single package**. Escalate to a monorepo only when one of these is actually true:

- Two or more Flutter apps share UI or business logic.
- Internal packages (shared design system, shared domain models) must evolve alongside the apps that consume them.
- Five or more developers work on related features and need independent package boundaries.

Then use **Melos** (`melos bootstrap`, `melos run`) or Dart pub workspaces (`workspace:` in pubspec). Very Good Ventures' feature-per-package clean architecture is enterprise-scale — do not adopt it for a single app; the folder layout in this skill already gives you the same boundaries without the bootstrap cost.

```yaml
# melos.yaml — only when a monorepo is justified
name: my_app
packages:
  - apps/*
  - packages/*
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Our app is small, one folder per screen is fine" | One-folder-per-screen breaks down past ~5 features: files scatter across the tree and you jump between layers constantly. Feature-first costs nothing at 1 feature and scales from day one. |
| "Layers-first (`lib/models`, `lib/screens`, `lib/services`) is cleaner" | Feature files end up scattered across global folders, and a feature change touches 3-4 unrelated directories. The 2026 standard puts the MVVM layers *inside* features. |
| "I'll promote this widget to `lib/shared/` now — it'll definitely be reused" | Shared folders become God folders when they hold single-use widgets. Promote when a *second* feature uses it; until then it stays in the feature it serves. |
| "The domain layer is overkill for this small app" | Even small apps benefit from repository interfaces — they make the data layer fakeable in tests, which the official Flutter architecture guidance rates as important. |
| "We'll adopt melos now so we're future-proof" | Melos adds bootstrap/build overhead and indirection. It pays off only when 2+ apps or 5+ devs actually share code. Start single-package. |
| "The folder structure is enough — everyone knows the rules" | A folder tree does not stop a domain file from importing a data class. Enforce the boundaries with lints so a violation fails `flutter analyze`, not code review. |
| "I'll put this shared thing in `lib/core/`, it's close enough" | `lib/core/` is infrastructure. A widget or helper that references a feature belongs in the feature or in `lib/shared/`; core stays business-logic-free. |

## Red Flags

- Global `lib/screens/`, `lib/models/`, `lib/services/` folders in an app past ~5 features.
- A feature folder with files scattered across 3+ top-level directories (`lib/screens/`, `lib/data/`, `lib/services/`).
- A file in `lib/domain/` (or a feature's `domain/`) importing `package:flutter/` or a concrete repository.
- `lib/shared/` or `lib/core/` containing widgets that import a feature or read a feature provider.
- ViewModels / controllers importing concrete repository implementations instead of the interface.
- A `lib/utils.dart` or `lib/helpers.dart` junk drawer at the root.
- Cross-feature imports (`features/tasks/...` reaching into `features/auth/...`).
- A monorepo with only one app or no shared packages.
- `test/` layout that does not mirror `lib/` — tests crossing feature boundaries.
- Providers/blocs defined in a global `providers.dart` instead of the owning feature's `presentation/`.
- The same widget copy-pasted into two features while an identical one sits in `lib/shared/` — or the reverse.

## Verification

- [ ] Layout is `lib/main.dart` + `lib/app/` + `lib/core/` + `lib/shared/` + `lib/features/<feature>/{data,domain,presentation}`.
- [ ] `lib/app/` is the composition root: only place importing across features; `main.dart` is bootstrap-only.
- [ ] Feature folders are named by capability (`tasks`, not `task_screen`), lowercase `snake_case`.
- [ ] `domain/` has no Flutter or `dart:ui` imports; depends only on Dart + domain contracts.
- [ ] Every feature has a repository interface in `domain/` and a concrete implementation in `data/`.
- [ ] State holders (Riverpod providers / BLoC) live inside the feature's `presentation/`, never a global `providers.dart`.
- [ ] Shared widgets are used by 2+ features and are stateless or parameter-driven; no shared widget imports a feature.
- [ ] `lib/core/` contains only infrastructure (constants, network, theme, utils) with no feature references.
- [ ] Import rules are enforced by lints (`flutter analyze` fails on a cross-layer import), not just convention.
- [ ] `test/` mirrors `lib/`: `test/features/<feature>/` holds that feature's unit/widget/data tests.
- [ ] Monorepo (melos/workspaces) exists only when 2+ apps or shared packages justify it.
- [ ] `flutter analyze` reports zero warnings and `flutter test` passes with the chosen structure.
