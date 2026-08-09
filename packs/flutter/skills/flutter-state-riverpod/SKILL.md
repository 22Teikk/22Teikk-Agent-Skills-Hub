---
name: flutter-state-riverpod
description: "Implements Riverpod 3.x state management in Flutter Dart 3+ projects. Use when writing Notifier/AsyncNotifier classes, @riverpod codegen providers, family/autoDispose/select modifiers, ProviderScope configuration, or Riverpod-as-DI wiring. Do NOT use for event-driven state machines (flutter-state-bloc), legacy ChangeNotifier apps (flutter-state-provider), or raw setState local widget state."
version: 1.0.0
platform: flutter
depends-on: [flutter-data-and-concurrency, flutter-di-and-build]
---

# Flutter State Management: Riverpod 3.x

## Overview

Riverpod 3.x is the default state-management layer for this pack. It replaces `provider`'s runtime `InheritedWidget` lookups with a **compile-time-safe provider graph**: a provider is a top-level `final` (or generated) declaration, so a missing dependency is a compile error rather than a `ProviderNotFoundException` at runtime.

Three properties drive every rule below:

- **Async-first.** `AsyncNotifier` / `FutureProvider` model loading, data, and error as one `AsyncValue<T>` instead of hand-rolled `isLoading` booleans.
- **Unified `Ref`.** In 3.x there is a single non-generic `Ref` across widgets and providers — `ref.watch`, `ref.read`, `ref.listen`, `ref.onDispose`, `ref.invalidate` behave identically wherever you are.
- **Declared lifecycle.** Disposal is explicit (`autoDispose`, `ref.onDispose`, `ref.keepAlive()`), never implicit. State that outlives its screen does so because someone wrote it down.

`StateProvider`, `StateNotifierProvider`, and `ChangeNotifierProvider` are **legacy** in 3.x (they now live behind a `legacy.dart` import). Do not reach for them in new code.

## When to Use

- Use when adding, refactoring, or reviewing Riverpod providers in a Flutter Dart 3+ app.
- Use when writing `Notifier`, `AsyncNotifier`, `StreamNotifier`, or `@riverpod` codegen providers.
- Use when choosing between `.family`, `.autoDispose`, `keepAlive`, and `select`.
- Use when wiring services/repositories as dependencies (Riverpod-as-DI) and overriding them in tests.
- Use when a widget rebuilds too often and the fix is a scoped subscription.
- Do NOT use for event-driven state machines with an explicit event bus — that is the BLoC sibling, `flutter-state-bloc`.
- Do NOT use for legacy `ChangeNotifier` codebases — that is `flutter-state-provider`.
- Do NOT use for purely ephemeral widget-local state (scroll offset, focus, text controllers); `setState` inside a `StatefulWidget` is correct there. Widget composition rules live in `flutter-ui`.

## Core Process

### 1. Providers: `Notifier` and `AsyncNotifier`

Pick the smallest provider that expresses the job:

| Need | Provider |
|---|---|
| Immutable value or service instance (DI) | `Provider<T>` |
| One-shot async read, no mutations | `FutureProvider<T>` |
| Continuous async source (sockets, Firestore, sensors) | `StreamProvider<T>` |
| Mutable synchronous state with methods | `NotifierProvider<N, T>` |
| Mutable state whose initial load is async | `AsyncNotifierProvider<N, T>` |
| Mutable state backed by a stream | `StreamNotifierProvider<N, T>` |

`ProviderScope` must wrap the app exactly once, at the root:

```dart
void main() => runApp(const ProviderScope(child: MyApp()));
```

Hand-written form:

```dart
final taskRepositoryProvider = Provider<TaskRepository>(
  (ref) => TaskRepository(ref.watch(dioProvider)),
);

class TaskListNotifier extends AsyncNotifier<List<Task>> {
  @override
  Future<List<Task>> build() async =>
      ref.watch(taskRepositoryProvider).fetchAll();

  Future<void> add(TaskDraft draft) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(taskRepositoryProvider).create(draft);
      return ref.read(taskRepositoryProvider).fetchAll();
    });
  }
}

final taskListProvider =
    AsyncNotifierProvider<TaskListNotifier, List<Task>>(TaskListNotifier.new);
```

Codegen form (`riverpod_annotation` + `riverpod_generator`) is preferred for new code — it derives the provider type, the family parameters, and the `Ref` from the signature:

```dart
part 'task_list.g.dart';

@riverpod
class TaskList extends _$TaskList {
  @override
  Future<List<Task>> build() async =>
      ref.watch(taskRepositoryProvider).fetchAll();
}
```

Generated providers are `autoDispose` by default; opt out explicitly with `@Riverpod(keepAlive: true)` for app-lifetime state such as auth session or feature flags. Run the generator with `dart run build_runner watch -d` and commit the `.g.dart` output only if the project already tracks generated files.

### 2. `AsyncValue`: loading, data, error

Never unwrap async state by hand. `AsyncValue<T>` is a sealed union of `AsyncData`, `AsyncLoading`, and `AsyncError`; render it exhaustively.

```dart
final tasks = ref.watch(taskListProvider);
return tasks.when(
  data: (items) => TaskListContent(items: items),
  loading: () => const LoadingSpinner(),
  error: (err, stack) => ErrorScreen(
    message: err.toString(),
    onRetry: () => ref.invalidate(taskListProvider),
  ),
);
```

- Wrap every mutation in `AsyncValue.guard` — it converts a thrown exception into `AsyncError` with the stack trace preserved, instead of an unhandled zone error.
- Use `ref.invalidate(provider)` (or `ref.invalidateSelf()` inside a notifier) to force a re-`build()` for pull-to-refresh and retry buttons.
- `AsyncError` is a **state**, not an exception: a screen that only handles `data` and `loading` silently shows a spinner forever when the network fails.
- Riverpod 3.x retries failed providers automatically with exponential backoff. Do not hand-roll a retry loop on top of it; if the failure is non-retryable (validation, 4xx), surface it and disable the automatic path via the provider's `retry` configuration.
- Prefer `valueOrNull` over `requireValue` unless you have already proven the provider is in the data state.

### 3. Modifiers: `family`, `autoDispose`, and disposal

- **`.family`** parameterizes a provider by an argument. The argument must have stable `==`/`hashCode` (an `int`, a `String`, or a Dart 3 record / `Equatable` value) — otherwise every rebuild allocates a new provider instance and leaks.
- **`.autoDispose`** destroys the provider state when the last listener goes away. Use it for screen-scoped state; do not use it for the auth session, the router, or a warm cache.
- Always pair a subscription with cleanup. `ref.onDispose` is the only place a stream subscription, `Timer`, or controller should be torn down.
- `ref.keepAlive()` inside an `autoDispose` provider pins the state after a successful load — the standard "cache the result, drop the in-flight request" pattern.

```dart
@riverpod
Stream<TaskDetail> taskDetail(Ref ref, String taskId) {
  final sub = ref.watch(socketProvider).subscribe(taskId);
  ref.onDispose(sub.cancel);          // mandatory: no cleanup = leaked socket
  final link = ref.keepAlive();       // survive brief navigation pops
  ref.onCancel(() => link.close());
  return sub.stream;
}
```

`family` + `autoDispose` together are correct for detail screens keyed by id, and wrong for a global cache — the second variant of the key spawns a second independent state tree.

### 4. `select`, and `ref.watch` vs `ref.read`

| Context | Call |
|---|---|
| Inside `build()` — the widget must rebuild on change | `ref.watch(provider)` |
| Inside `build()` — only one field matters | `ref.watch(provider.select((s) => s.field))` |
| Inside a callback (`onPressed`, `onTap`, form submit) | `ref.read(provider.notifier).method()` |
| Side effects on change (snackbar, navigation, analytics) | `ref.listen(provider, (prev, next) { ... })` |
| Inside another provider's `build()` — must react | `ref.watch(otherProvider)` |
| Inside another provider's method — one-shot read | `ref.read(otherProvider)` |

`select` is the primary rebuild-reduction tool: `ref.watch(cartProvider.select((c) => c.itemCount))` rebuilds the badge only when the count changes, not on every line-item edit. For async state, `selectAsync` awaits the narrowed value.

`ref.watch` inside a callback is always a bug — the callback runs outside the build phase, so the subscription is either ignored or throws. `ref.read` inside `build()` is the mirrored bug: it snapshots a stale value and never rebuilds.

### 5. Riverpod as dependency injection

Riverpod replaces a service locator. Every collaborator — `Dio`, repositories, clocks, analytics — is a `Provider<T>`, so tests swap implementations without touching production code.

```dart
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl));
  ref.onDispose(dio.close);
  return dio;
});

final clockProvider = Provider<Clock>((ref) => const SystemClock());
```

Providers that need a value only known at runtime (a bootstrapped `SharedPreferences`, a platform channel handle) declare `throw UnimplementedError()` in their body and are overridden at the root `ProviderScope`. That keeps the "must be overridden" contract loud instead of silently returning a null-ish default. Repository and HTTP-client construction details belong to `flutter-data-and-concurrency`.

### 6. Testing with overrides

```dart
test('loads tasks from the repository', () async {
  final container = ProviderContainer.test(
    overrides: [
      taskRepositoryProvider.overrideWithValue(FakeTaskRepository()),
    ],
  );

  expect(container.read(taskListProvider), const AsyncLoading<List<Task>>());
  await container.read(taskListProvider.future);
  expect(container.read(taskListProvider).requireValue, hasLength(3));
});
```

- `ProviderContainer.test()` disposes itself at the end of the test; if you construct a plain `ProviderContainer`, register `addTearDown(container.dispose)` in the same statement.
- Await `provider.future` (not an arbitrary `pump` duration) before asserting on async state.
- Widget tests wrap the subject in `ProviderScope(overrides: [...], child: widget)` — never boot the real network stack in a widget test.
- Assert on state transitions, not on notifier internals; a test that reaches into `.notifier` to read private fields breaks on every refactor. Test-suite structure and coverage gates live in `flutter-testing-and-benchmark`.

## State machine alternative

Riverpod models state as a **graph of values**, not as a transition table. When the feature is genuinely event-driven — a checkout flow with an explicit event log, a wizard where illegal transitions must be unrepresentable, or a domain where analytics consumes the event stream — an event/state machine is the better fit and the pack sibling `flutter-state-bloc` documents it.

| Signal | Choose |
|---|---|
| State derives from data sources and user input | Riverpod `Notifier` / `AsyncNotifier` |
| Every change is a named, replayable event | BLoC `Bloc<Event, State>` |
| Dependency injection is the primary need | Riverpod `Provider<T>` |
| Illegal transitions must be a compile/runtime guard | BLoC with a sealed event + state family |

Pick one per project. Never mix `ConsumerWidget` and `BlocProvider` in the same subtree.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "`ref.read` everywhere is fine — it always returns the value" | `ref.read` does not subscribe. In `build()` it silently freezes the UI at the first value read, and the bug surfaces as "the screen doesn't update" days later. Watch in `build`, read in callbacks. |
| "Put `autoDispose` on every provider — it's safer" | `autoDispose` on the auth session or the router destroys state on the first frame where nothing is mounted (during a route transition), forcing a re-login or a re-fetch. Lifecycle is a decision, not a default. |
| "Watching the whole provider is simpler than `select`" | Watching a 40-field state object rebuilds the widget on every unrelated field change. `select` is one line and turns an O(all mutations) rebuild into O(this field). |
| "`StateNotifier` is still the way — it works" | `StateNotifier`, `StateProvider`, and `ChangeNotifierProvider` are legacy in Riverpod 3.x and only reachable through a legacy import. New code uses `Notifier`/`AsyncNotifier`; migrating one provider at a time is supported. |
| "Codegen is extra ceremony, I'll write providers by hand" | Hand-written families and `autoDispose` combinations are where the type errors and leaked keys live. `@riverpod` derives all of it and fails at build time instead of runtime. |

## Red Flags

- A provider is read in a tree with no `ProviderScope` above it (or a second `ProviderScope` nested mid-tree, silently forking all state).
- `ref.watch` called inside `onPressed`, `onTap`, a `Timer` callback, or any non-`build` code path.
- A provider that creates a `StreamSubscription`, `Timer`, `TextEditingController`, or `Dio` instance with no matching `ref.onDispose`.
- `StateNotifierProvider` / `StateProvider` / `ChangeNotifierProvider` in new code without a written migration reason.
- `.family` keyed by a non-value object (a closure, a mutable model without `==`) — every rebuild allocates a fresh provider.
- `.autoDispose` applied to app-lifetime state (session, router, feature flags), or omitted on a per-detail-screen `family`.
- An `AsyncValue` consumed with `.value!`, `requireValue`, or a `data`/`loading`-only `when` — the error state is unhandled.
- A widget rebuilding on a whole state object where a single field is used (`select` missing).
- Business logic inside `build()` of a `ConsumerWidget` rather than inside a notifier method.

## Verification

- [ ] `ProviderScope` wraps the app exactly once at the root; runtime-bootstrapped providers are overridden there.
- [ ] Every provider's disposal is handled: `autoDispose` chosen deliberately, and `ref.onDispose` present for every subscription, timer, or controller.
- [ ] `ref.watch` appears only in `build()` / provider bodies; callbacks use `ref.read(...)` or `ref.listen`.
- [ ] `select` (or `selectAsync`) is used wherever a widget consumes a subset of a large state object.
- [ ] Every `AsyncValue` consumer handles `data`, `loading`, **and** `error`, with a retry path via `ref.invalidate`.
- [ ] Every mutation that can throw is wrapped in `AsyncValue.guard`.
- [ ] Tests override providers via `ProviderContainer.test(overrides: ...)` or `ProviderScope(overrides: ...)`; no real network in unit or widget tests.
- [ ] No legacy `StateNotifierProvider` / `StateProvider` / `ChangeNotifierProvider` introduced.
- [ ] `dart run build_runner build` succeeds, `flutter analyze` is clean, and `flutter test` passes.
