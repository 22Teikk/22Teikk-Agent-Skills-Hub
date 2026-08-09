---
name: flutter-state-bloc
description: "Implements Bloc 9.x / Cubit event-driven state management in Flutter Dart 3+ projects. Use when a project declares bloc, when writing Bloc<Event,State>/Cubit classes, BlocProvider/BlocListener/BlocBuilder wiring, bloc_test unit tests, or audit-trail/event-logging state flows. Do NOT use for Riverpod projects (flutter-state-riverpod), legacy ChangeNotifier apps (flutter-state-provider), or simple local widget state."
version: 1.0.0
platform: flutter
depends-on: [flutter-data-and-concurrency, flutter-state-provider, flutter-state-riverpod, flutter-testing-and-benchmark, flutter-ui]
  - flutter-ui
  - flutter-data-and-concurrency
---

# Flutter State Management with Bloc (bloc 9.x, flutter_bloc 9.x)

## Overview

Bloc is the enterprise standard for event-driven state management. Every user intent becomes an **event**, every event produces a **deterministic state transition**, and every transition flows through one observable pipeline. That pipeline buys the three properties teams adopt Bloc for: predictable transitions (`state` changes only inside an `on<Event>` handler), a complete audit trail (`BlocObserver` sees every event, change, and error), and replayable, time-travel debugging (any state reconstructs from the event log).

For this pack, **default to `Cubit`** — the simple member of the bloc family. `Cubit<State>` exposes plain methods that call `emit(...)` — use it when the intent is obvious from the method name. `Bloc<Event, State>` routes typed events through handlers — use it for concurrency control, an event log, or several inputs converging on one state machine.

## When to Use

- Use when `pubspec.yaml` declares `flutter_bloc` / `bloc` — the project already chose this pattern; never introduce a second state-management library.
- Use when writing `Bloc<Event, State>` / `Cubit<State>` classes and their Equatable state/event families.
- Use when wiring `BlocProvider`, `MultiBlocProvider`, `RepositoryProvider`, `BlocBuilder`, `BlocListener`, or `BlocConsumer`.
- Use when the feature needs an audit trail — payments, compliance, multi-step wizards — where "which event produced this state" must be answerable after the fact.
- Use when writing `bloc_test` suites or a global `BlocObserver`.
- Do NOT use for Riverpod projects — see the `flutter-state-riverpod` skill.
- Do NOT use for legacy `ChangeNotifier` codebases — see the `flutter-state-provider` skill.
- Do NOT use for ephemeral widget-local state (animation controllers, focus nodes, text controllers) — that is `StatefulWidget` territory in the `flutter-ui` skill.
- Do NOT reach for Bloc on a screen with one boolean toggle; see the Comparison below.

## Comparison

| Concern | Riverpod | Bloc |
|---|---|---|
| Mental model | reactive providers, dependency graph | event → handler → state machine |
| Boilerplate | low (codegen) | higher (event + state families) |
| Audit trail | manual instrumentation | built in via `BlocObserver` |
| Best fit | small teams, fast iteration | regulated / event-sourced / complex domains |

**Bloc/Cubit is the pack default** for this pack — start with `Cubit` and promote to `Bloc<Event, State>` only when you need an event log, concurrency transformers, or several inputs converging on one state machine. Riverpod remains the documented alternative (see `flutter-state-riverpod`). Pick exactly **one** per project — never mix `ConsumerWidget` with `BlocProvider` in the same subtree.

## Core Process

### 1. Choose Cubit vs Bloc

| Signal | Pick |
|---|---|
| One screen, a handful of direct actions (`load()`, `retry()`) | `Cubit` |
| No need to know *why* state changed, only *what* it is | `Cubit` |
| Multiple event sources (UI + stream + timer) into one state | `Bloc` |
| Needs debounce / throttle / drop / restart per event | `Bloc` + `bloc_concurrency` |
| Audit requirement — the event log itself is a deliverable | `Bloc` |

Start with `Cubit`; promotion is mechanical — methods become events, bodies become `on<Event>` handlers.

### 2. State and event classes with Equatable

State and event classes are **immutable value objects**: every field `final`, constructors `const` where possible, `props` listing every field that participates in equality. Bloc skips `emit` when the new state `==` the current one — without `Equatable`, identical states cause rebuild storms.

```dart
sealed class TaskListState extends Equatable {
  const TaskListState();
  @override
  List<Object?> get props => const [];
}
final class TaskListLoading extends TaskListState { const TaskListLoading(); }
final class TaskListFailure extends TaskListState {
  const TaskListFailure(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}
final class TaskListLoaded extends TaskListState {
  const TaskListLoaded({required this.tasks, this.filter = TaskFilter.all});
  final List<Task> tasks;
  final TaskFilter filter;
  @override
  List<Object?> get props => [tasks, filter];
}

// Events use the same shape: sealed base, const constructors, props per payload.
sealed class TaskListEvent extends Equatable {
  const TaskListEvent();
  @override
  List<Object?> get props => const [];
}
final class TaskListRequested extends TaskListEvent { const TaskListRequested(); }
final class TaskFilterChanged extends TaskListEvent {
  const TaskFilterChanged(this.filter);
  final TaskFilter filter;
  @override
  List<Object?> get props => [filter]; // the payload IS the audit record
}
```

Handlers register in the constructor, and `emit` is only ever called with the `Emitter` that handler received. `transformer` sets per-event concurrency — `restartable`, `droppable`, `sequential`, or `concurrent` from `bloc_concurrency`.

```dart
class TaskListBloc extends Bloc<TaskListEvent, TaskListState> {
  TaskListBloc(this._repo) : super(const TaskListLoading()) {
    on<TaskListRequested>(_onRequested, transformer: restartable());
    on<TaskFilterChanged>((event, emit) {
      if (state case TaskListLoaded(:final tasks)) {
        emit(TaskListLoaded(tasks: tasks, filter: event.filter));
      }
    });
  }
  final TaskRepository _repo;

  Future<void> _onRequested(
      TaskListRequested event, Emitter<TaskListState> emit) async {
    emit(const TaskListLoading());
    try {
      emit(TaskListLoaded(tasks: await _repo.fetchAll()));
    } on RepositoryException catch (e) {
      emit(TaskListFailure(e.message)); // failures are states, not exceptions
    }
  }
}
```

### 3. BlocProvider, BlocBuilder, BlocListener, BlocConsumer

- `BlocProvider` **creates and owns** the bloc and closes it when the subtree is disposed. Scope it to the narrowest subtree that needs it — a feature route, not `MaterialApp`. Use `BlocProvider.value` to pass an *existing* instance to a new route; never `create:` a second instance of a bloc you already own.
- `BlocBuilder` rebuilds UI, `BlocListener` fires one-shot side effects, `BlocConsumer` is both. Use `buildWhen` / `listenWhen` wherever a widget cares about only a subset of the state — otherwise every emit rebuilds every builder.
- `context.read<MyBloc>().add(event)` does not subscribe: it is for dispatching from callbacks, `initState`, or a provider `create:`. `context.watch<MyBloc>().state` subscribes and is legal only inside `build()`, where it rebuilds the *entire* enclosing widget on any change. Prefer `BlocBuilder` + `buildWhen` for a scoped subtree, or `context.select` for a single narrow value.

```dart
BlocProvider<TaskListBloc>(
  create: (context) => TaskListBloc(context.read<TaskRepository>())
    ..add(const TaskListRequested()),
  child: BlocBuilder<TaskListBloc, TaskListState>(
    builder: (context, state) => switch (state) {
      TaskListLoading() => const LoadingSpinner(),
      TaskListFailure(:final message) => ErrorView(
          message: message,
          // read: dispatch only, inside a callback — never during build.
          onRetry: () =>
              context.read<TaskListBloc>().add(const TaskListRequested()),
        ),
      TaskListLoaded(:final tasks) => TaskListContent(tasks: tasks),
    },
  ),
);
```

### 4. MultiBlocProvider and RepositoryProvider composition

Provide repositories **above** the blocs that consume them so a bloc resolves its dependencies via `context.read<T>()` inside `create:`. Flatten nesting with `MultiRepositoryProvider` / `MultiBlocProvider`. Repository construction itself belongs to the `flutter-data-and-concurrency` skill.

```dart
MultiRepositoryProvider(
  providers: [
    RepositoryProvider<AuthRepository>(create: (_) => AuthRepositoryImpl(api)),
  ],
  child: MultiBlocProvider(
    providers: [
      BlocProvider<AuthBloc>(
        create: (c) => AuthBloc(c.read<AuthRepository>())..add(const AuthStarted()),
        lazy: false, // auth must run before the first frame
      ),
      BlocProvider<ThemeCubit>(create: (_) => ThemeCubit()),
    ],
    child: const App(),
  ),
);
```

Only genuinely app-wide blocs (auth, connectivity, theme) belong at the root; feature blocs stay inside their route's `BlocProvider`. Hoisting everything to the root leaks memory and keeps stale state alive across navigation.

### 5. Side effects and the audit trail: BlocListener + BlocObserver

Navigation, snackbars, dialogs, haptics, and analytics are **effects**, not state. They belong in `BlocListener` — a `builder` may run many times for the same state, but `listener` fires once per distinct state change.

```dart
BlocListener<AuthBloc, AuthState>(
  listenWhen: (prev, next) => prev.status != next.status,
  listener: (context, state) => switch (state.status) {
    AuthStatus.authenticated => context.go('/home'),
    AuthStatus.failure => ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(state.error!))),
    _ => null,
  },
  child: const LoginForm(),
);
```

`BlocObserver` is the audit trail — one class, registered once, that sees every bloc in the app. Override `onEvent` for inbound events, `onTransition` for event→state pairs, `onError` for the crash reporter.

```dart
class AppBlocObserver extends BlocObserver {
  @override
  void onTransition(Bloc bloc, Transition transition) {
    super.onTransition(bloc, transition);
    analytics.logTransition(bloc.runtimeType.toString(), transition);
  }
  @override
  void onError(BlocBase bloc, Object error, StackTrace st) {
    crashReporter.recordError(error, st, reason: '${bloc.runtimeType}');
    super.onError(bloc, error, st);
  }
}

void main() {
  Bloc.observer = AppBlocObserver(); // register before runApp
  runApp(const App());
}
```

The pack default wires `talker_bloc_logger`'s `TalkerBlocObserver` so every event/transition/error flows into Talker; add a custom observer when you must forward `onError` to Crashlytics without secrets:

```dart
// pack default: audit trail through Talker (package:talker_bloc_logger/talker_bloc_logger.dart)
Bloc.observer = TalkerBlocObserver(talker: talker); // register before runApp
```

Never log raw tokens, passwords, or PII from `onEvent` — payloads reach the logging sink verbatim.

### 6. Testing with bloc_test

`blocTest` drives the bloc directly: `build` constructs it with mocked collaborators, `act` dispatches, `expect` asserts the **ordered** state sequence, `verify` asserts collaborator interactions. Mock repositories with `mocktail`, registering fallback values for custom argument types.

```dart
class MockTaskRepository extends Mock implements TaskRepository {}

void main() {
  late MockTaskRepository repository;
  setUp(() => repository = MockTaskRepository());
  blocTest<TaskListBloc, TaskListState>(
    'emits [Loading, Loaded] when the repository succeeds',
    build: () {
      when(() => repository.fetchAll()).thenAnswer((_) async => [testTask]);
      return TaskListBloc(repository);
    },
    act: (bloc) => bloc.add(const TaskListRequested()),
    expect: () => [const TaskListLoading(), TaskListLoaded(tasks: [testTask])],
    verify: (_) => verify(() => repository.fetchAll()).called(1),
  );
  // The failure branch is a separate blocTest of the same shape: stub
  // `thenThrow`, expect [TaskListLoading(), TaskListFailure('offline')].
}
```

Every branch of every handler gets one `blocTest`. Widget tests then verify only the wiring — that a tap dispatches the right event — not the transition logic. Broader suite structure lives in the `flutter-testing-and-benchmark` skill.

### 7. Persistence with hydrated_bloc (optional)

For state that must survive a cold start (theme, onboarding progress, cached filters), extend `HydratedCubit` / `HydratedBloc`, implement `fromJson` / `toJson`, and initialize `HydratedBloc.storage` before `runApp`. Hydrate only small, non-sensitive, schema-stable state — auth tokens go to secure storage, never to `hydrated_bloc`. Return `null` from `fromJson` on any parse failure so a corrupt payload falls back to the initial state rather than crashing at startup.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Cubit is always enough, events are ceremony" | Cubit is right until you need debounce/drop/restart semantics or an event log. A search field firing a request per keystroke needs an `EventTransformer`, which only `Bloc` has. Promote instead of hand-rolling timers in a Cubit. |
| "`bloc_test` is too slow, I'll just pump widgets" | `blocTest` runs in milliseconds with no widget tree; `pumpWidget` needs a binding, providers, and theme. Widget tests are the slow ones, and they assert pixels rather than transitions — a passing widget test says nothing about the second emit in a sequence. |
| "Every event can be a payload-free marker; the bloc reads what it needs" | A payload-free event forces the bloc to reach for outside mutable state, destroying replayability. The event *is* the record: if the log can't reconstruct the input, the audit trail is fiction. |
| "`context.watch<MyBloc>()` in every build is simpler than BlocBuilder" | `watch` rebuilds the whole enclosing widget on *any* state change. `BlocBuilder` with `buildWhen` rebuilds one subtree on the changes that matter — on a list screen, the difference between 1 and 60 rebuilds per scroll. |
| "I'll add Equatable later, it's just boilerplate" | Without `props`, every emit is a new identity, so `buildWhen`, `listenWhen`, and `blocTest`'s `expect` all silently misbehave. It is the equality contract the whole library is built on. |
| "Riverpod is simpler, we should have used it" | Maybe — that is exactly why Riverpod is the documented alternative. But in a `flutter_bloc` project, mixing paradigms costs more than the ceremony. Pick one per project and stay consistent. |

## Red Flags

- Mutable fields in a state class (`List<Task>` mutated in place, non-`final` fields) — mutation bypasses equality and the UI never updates.
- `emit(...)` called outside an `on<Event>` handler or Cubit method — an `Emitter` captured in a closure and used after the handler completes throws.
- Events or states without `Equatable` (or equivalent `==`/`hashCode`) — duplicate emits become rebuild storms.
- `BlocProvider(create: ...)` inside a `build()` that reruns — every rebuild constructs and drops a bloc, losing state and leaking subscriptions.
- `context.read<T>()` during `build()` to derive UI, or `context.watch<T>()` inside a callback — stale snapshots or wrong subscriptions.
- Navigation, snackbars, or dialogs triggered from `BlocBuilder.builder` — builders run repeatedly and will double-push routes.
- A single god-bloc holding unrelated features' state, or every bloc hoisted to the app root.
- Business logic left in the widget while the bloc merely forwards values.
- Reaching for Bloc on a screen with one boolean toggle where local widget state or Riverpod would do.
- `await` on a repository call with no `try`/`catch` or `on` clause, letting an exception escape into `onError` as an unhandled crash.
- Mixing `ConsumerWidget` and `BlocProvider` in the same subtree, or adding a second state-management library to an existing project.

## Verification

- [ ] Every state and event class is immutable (all fields `final`) and extends `Equatable` with a complete `props` list.
- [ ] `emit` is only called from inside an `on<Event>` handler or a Cubit method, never after an `await` on a closed bloc.
- [ ] Every handler branch — success, empty, failure — has a `blocTest` asserting the ordered state sequence.
- [ ] `BlocProvider` scope matches bloc lifetime: feature blocs under their route, app-wide blocs at the root, none created inside a rebuilding `build()`.
- [ ] Side effects (navigation, snackbars, dialogs, analytics) live in `BlocListener` / `BlocConsumer.listener`, never in a `builder`.
- [ ] `context.read` only in callbacks / `initState` / `create:`; `context.watch` or `context.select` only inside `build()`, with `buildWhen` / `listenWhen` wherever a widget needs only a subset of the state.
- [ ] A global `BlocObserver` is registered and forwards `onError` to the crash reporter without logging secrets.
- [ ] Repository collaborators are mocked with `mocktail`; no test touches the network.
- [ ] `dart format`, `flutter analyze`, and `flutter test` are all clean.
