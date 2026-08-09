---
name: flutter-data-and-concurrency
description: Handles Dart/Flutter async and concurrency in Flutter Dart 3+ projects. Use when writing Future/async-await pipelines, Streams and StreamControllers, isolates (Isolate.run, Isolate.spawn, compute), handling errors in async contexts, or consuming FutureBuilder/StreamBuilder. This is the data-layer entry point — repositories expose Future/Stream APIs; deep networking lives in flutter-data-networking and local persistence in flutter-data-persistence.
version: 1.0.0
platform: flutter
depends-on: [flutter-data-networking, flutter-data-persistence, flutter-error-handling, flutter-state-bloc, flutter-state-riverpod, flutter-testing-and-benchmark, flutter-ui]
---

# Flutter Data and Concurrency (Dart 3+)

## Overview

This skill owns the **async/concurrency core** of the Flutter data layer: Dart's `Future`/`Stream`/`Isolate` primitives and how they behave in a Flutter app. Data sources (network, database) sit **behind repositories**, and the repositories expose `Future`- and `Stream`-shaped APIs that state holders and widgets consume.

Wave-1 split: the deep networking stack (`dio`/`retrofit`/`freezed` DTOs) moved to `flutter-data-networking`, and local persistence (`drift`/`hive`/`shared_preferences`/`sqflite`) moved to `flutter-data-persistence`. This skill keeps a one-section summary plus pointer for each and concentrates on the language-level async machinery both depend on. State holders (BLoC default) are `flutter-state-bloc`; Riverpod projects use `flutter-state-riverpod`; global error handlers and `Result`/`Failure` types are `flutter-error-handling`.

## When to Use

- Use when writing or reviewing `Future`/`async-await` pipelines, `Stream`s, or `StreamController`s.
- Use when moving CPU-heavy work off the main isolate with `Isolate.run`, `Isolate.spawn`, or `compute`.
- Use when handling errors that occur in asynchronous contexts (failed Futures, stream `onError`, unhandled zone errors).
- Use when designing a repository whose API is `Future`/`Stream` shaped.
- Use when a widget needs `FutureBuilder`/`StreamBuilder` for a simple one-off async value.
- Do NOT use for `dio` requests, interceptors, retrofit clients, or DTO codegen — see `flutter-data-networking`.
- Do NOT use for drift tables, hive boxes, migrations, or `shared_preferences` — see `flutter-data-persistence`.
- Do NOT use when only changing UI code — see `flutter-ui`.

## Core Process

### 1. `Future` / `async-await`: one-shot async work

- Default to `async`/`await` over `.then()` chains; reach for `.then` only when transforming a one-shot without nesting.
- Use `Future.wait` when independent Futures can run in **parallel** — sequential `await`s of independent calls are strictly slower.
- Bound runaway work with `.timeout(Duration(...))`; a hung Future otherwise stalls the `await` forever.
- A Future that completes with an error and has no listener/rejection handler becomes an **unhandled async error** in the enclosing zone (see section 4).

```dart
// Independent one-shots run concurrently, not one after another.
final results = await Future.wait([fetchAccount(), fetchProfile()]);
final account = results[0] as Account;

final quick = await slowCall().timeout(const Duration(seconds: 5));
```

### 2. `Stream`: continuous async values

- `Stream` is the right shape for anything that re-emits: a database query that updates on change, a WebSocket, push notifications, progress reporting.
- Single-subscription streams deliver each event to **one** listener; call `asBroadcastStream()` when several consumers must share one source.
- Prefer `Stream.fromFuture` for a one-shot, `async*` generators for sequences you compute, and `StreamController` only when an external push API requires it — and always `close()` it.
- Every `StreamSubscription` must eventually be cancelled. In a Riverpod provider that is `ref.onDispose(sub.cancel)` (see `flutter-state-riverpod`).

```dart
Stream<int> countdown(int from) async* {
  for (var i = from; i >= 0; i--) {
    yield i;
    await Future.delayed(const Duration(seconds: 1));
  }
}

// A push API needs a controller — close it on dispose or it leaks forever.
final controller = StreamController<List<Transaction>>();
final sub = repository.watchAll().listen(controller.add);
ref.onDispose(() async {
  await sub.cancel();
  await controller.close();
});
return controller.stream;
```

### 3. Isolates: CPU-heavy work off the main isolate

- Dart's event loop is non-blocking for **I/O** (HTTP, DB, files) — you do not need an isolate for those.
- Reach for an isolate only for **CPU-bound** work: parsing a multi-MB JSON payload, image processing, hashing/crypto, large list transforms.
- `Isolate.run` (Dart 2.19+): one-shot spawn that returns a `Future` and reuses the isolate pool — the default choice.
- `compute()` (from `package:flutter/foundation.dart`): Flutter's wrapper for the same one-shot pattern; runs the callback in a new isolate and returns a `Future`. On web (no isolates) it runs on the main isolate.
- `Isolate.spawn`: only for long-lived workers that need bidirectional `SendPort`/`ReceivePort` messaging.
- The closure and its argument must be sendable across isolates (JSON-able / transferable) — no captured mutable state.

```dart
import 'dart:isolate';

Future<List<Transaction>> parseHugePayload(String rawJson) {
  return Isolate.run(() {
    final list = jsonDecode(rawJson) as List<dynamic>;
    return list.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
  });
}

// Flutter flavour — same contract, via package:flutter/foundation.dart.
final parsed = await compute(_parseJson, rawJson);

List<Transaction> _parseJson(String rawJson) {
  final list = jsonDecode(rawJson) as List<dynamic>;
  return list.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
}
```

### 4. Error handling in async contexts

- Wrap `await` in `try/catch` where the caller must react to failure; convert to typed exceptions or sealed `Failure`/`Result` at the repository boundary (see `flutter-error-handling`).
- Stream errors are **asynchronous**: a `try/catch` around `stream.listen(...)` catches nothing. Handle them in the `onError` callback, or `await for (event in stream)` inside a `try/catch`.
- A Future you intentionally ignore (fire-and-forget) still surfaces its error later. Mark it with `unawaited(future)` (from `dart:async`) so the intent is explicit and the `unawaited_futures` lint is satisfied.
- Errors that escape every handler land in the enclosing **Zone**; `runZonedGuarded` is where the app installs its global catch-all (owned by `flutter-error-handling`).
- Never swallow exceptions in an empty `catch {}`. At minimum log with the project's logging library (`talker`).

```dart
// Stream errors arrive on the subscription, not in the surrounding scope.
final sub = stream.listen(
  controller.add,
  onError: (Object e, StackTrace st) => talker.error(e, st, 'watch failed'),
);
ref.onDispose(sub.cancel);

// Fire-and-forget that can fail — be explicit about ignoring it.
unawaited(ref.read(syncProvider.notifier).sync());
```

### 5. Async in widgets: `FutureBuilder` / `StreamBuilder`

- For a single widget-scoped async value (a one-shot read that lives with one widget), `FutureBuilder`/`StreamBuilder` are fine.
- In a BLoC app the default is a `Cubit`/`Bloc` emitting `Loading | Data | Error` states; Riverpod apps use `AsyncValue` — both model the three states with retry, which a hand-rolled `setState` + FutureBuilder does not (see `flutter-state-bloc` for BLoC, `flutter-state-riverpod` for Riverpod).
- If you do use `FutureBuilder`, never call `setState` inside `builder`, and give the Future a stable identity — a Future created inside `build()` refetches on every rebuild.

```dart
FutureBuilder<List<Transaction>>(
  future: repository.fetchAll(), // hoisted — created once, not in build()
  builder: (context, snap) => switch (snap.connectionState) {
    ConnectionState.waiting => const CircularProgressIndicator(),
    _ when snap.hasError => ErrorText(snap.error.toString()),
    _ => ListView(children: [for (final t in snap.data ?? const []) TransactionTile(t)]),
  },
)
```

### 6. The repository seam

- Data sources (the dio client, the drift database) are reached **only** through a repository; widgets and state holders never touch `Dio` or a `Database`/`Box` handle.
- The repository exposes the async API: one-shot reads return `Future`, reactive reads return `Stream`. Wiring (get_it registrations, or providers in Riverpod projects) is `flutter-di-and-build`; state-holder wiring is `flutter-state-bloc` (default) or `flutter-state-riverpod`; the concrete HTTP and DB mechanics are the two split skills.

```dart
class TransactionRepository {
  TransactionRepository(this._api, this._db);
  final ApiClient _api;   // constructed in flutter-data-networking
  final AppDatabase _db;  // constructed in flutter-data-persistence

  Future<Transaction?> getById(String id) async =>
      (await _api.getTransaction(id)).toDomain();
  Stream<List<Transaction>> watchAll() => _db.watchRecent(); // drift watch()
  Future<void> sync() async {
    final remote = await _api.fetchTransactions(); // dio call
    await _db.replaceAll(remote);                  // drift batch insert
  }
}
```

### 7. Networking — split to `flutter-data-networking`

`dio` 5.x HTTP (one configured `Dio` per process behind a provider, interceptors for auth/logging/error, `Duration` timeouts), `retrofit` type-safe clients (`@RestApi`/`@GET`/`@POST`), `freezed` + `json_serializable` DTOs with `fromJson`/`toJson`, streaming downloads/uploads, and `CancelToken` cancellation all live in `flutter-data-networking`. Route any networking work there. The networking layer still sits behind a repository exposing `Future` APIs per section 6.

### 8. Persistence — split to `flutter-data-persistence`

Local storage choice — `drift` for relational/typed queries with `watch()` reactive streams and step-by-step migrations, `hive`/`hive_ce` for key-value boxes with `TypeAdapter`s, `shared_preferences` for settings keys only, `sqflite` as the raw-SQL fallback — is decided and implemented in `flutter-data-persistence`. Route any persistence work there. Its reactive `watch()` streams are consumed through the repository per section 6 and watched by the state layer: BLoC apps consume the stream in a `Cubit`/`Bloc` via `emit.forEach` (see `flutter-state-bloc`); Riverpod apps use `StreamProvider.autoDispose` (see `flutter-state-riverpod`).

### 9. BLoC variant (where the data layer meets the state holder)

In a `flutter_bloc` project, repositories stay identical; only the state holder changes. Consume the repository's `Stream` with `emit.forEach` so data/error map to states, and never mix the Riverpod and BLoC variants in the same feature subtree.

```dart
Future<void> _onLoad(Load e, Emitter<TransactionListState> emit) async {
  await emit.forEach(_repo.watchAll(), onData: Data.new, onError: (err, _) => Error(err.toString()));
}
```

## Data-layer guardrails (block on these before ship)

- **Never store money as `double` / `num` with fractional values.** Use `int` minor units (cents) end-to-end. A drift `SUM()` over money must be declared `Expression<int>`, not `Expression<double>` — a `REAL` column silently drifts on device. (Both split skills reference this rule back here.)
- **`schemaVersion` bumps always ship a migration.** Increasing `schemaVersion` on a shipped app without a matching `MigrationStrategy.onUpgrade` wipes user data on update. Deep guidance: `flutter-data-persistence`.
- **Prove the schema with a real in-memory database test**, not a mocked repository — a mock that returns the asserted value never runs the SQL. Use `NativeDatabase.memory()`. See `flutter-testing-and-benchmark`.

## Relationship to other skills

Wave-1 split moved deep content out of this skill:

| Topic (was here) | Now owned by |
|---|---|
| `dio` HTTP, `retrofit` clients, `freezed`/`json_serializable` DTOs | `flutter-data-networking` |
| `drift`/`hive`/`shared_preferences`/`sqflite`, migrations | `flutter-data-persistence` |
| Riverpod `AsyncValue` providers, provider lifecycle | `flutter-state-riverpod` |
| Global error handlers, `Result`/`Failure` types | `flutter-error-handling` |
| `pubspec.yaml`, DI wiring (get_it default), `build_runner` codegen | `flutter-di-and-build` |
| In-memory DAO tests, mocktail, golden tests | `flutter-testing-and-benchmark` |

This skill keeps the async/concurrency core, the repository seam, and the cross-cutting money/migration rules that the two data skills reference.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just `await` everything on the UI isolate — Dart is single-threaded, it's fine" | The event loop is non-blocking only for I/O. JSON parsing of a multi-MB payload on the main isolate janks. Use `Isolate.run`/`compute` for CPU-bound work, even though there is only "one thread". |
| "I'll spawn an `Isolate` for this HTTP call" | The event loop already does I/O without blocking. Isolates are for CPU-bound work; spawning one for I/O adds messaging overhead for nothing. |
| "I'll fire this Future and ignore the result" | An ignored Future still surfaces its error later as an unhandled async error — and the failure is invisible. `unawaited()` makes the intent explicit. |
| "I'll `try/catch` around `stream.listen(...)`" | Stream errors are delivered asynchronously to the subscription's `onError` (or thrown by `await for`). The surrounding synchronous `try/catch` never sees them. |
| "Mocking the repository proves the data layer works" | A mock returning the expected value is tautological — the SQL/schema never runs. Test against an in-memory database (see `flutter-testing-and-benchmark`). |
| "I'll re-implement the `dio` call here — it's just one request" | That duplicates the configured client, interceptors, and error mapping. Route it through `flutter-data-networking`. |

## Red Flags

- `Isolate.spawn` used for a one-off computation when `Isolate.run`/`compute` would do.
- A `StreamController` never `close()`d, or a `StreamSubscription` never cancelled (`ref.onDispose` missing).
- `setState` (or `state = ...`) after `await` without a `mounted`/lifecycle guard.
- A Future created **inside** `FutureBuilder.build()` — it refetches on every rebuild.
- `try/catch` around `Stream.listen` as if it caught asynchronous delivery errors.
- Unhandled async errors: a Future or `async*` generator error with no listener/`onError`.
- `dio`/`drift` code re-implemented in this skill's territory instead of routed to the split skills.
- Money stored as `double`, or a drift `SUM()` returning `Expression<double>`.
- A data layer "covered" only by mocked-repository tests; no in-memory DAO test.

## Verification

- [ ] CPU-bound work runs via `Isolate.run`/`compute`, never on the main isolate; isolates are not used for pure I/O.
- [ ] Every `StreamController` is `close()`d and every `StreamSubscription` is cancelled (`ref.onDispose`).
- [ ] `Future`/`Stream` errors surface as typed exceptions or sealed `Failure`s — never `print`.
- [ ] Fire-and-forget Futures use `unawaited()`; no silently-ignored Futures.
- [ ] `FutureBuilder`/`StreamBuilder` only for widget-scoped one-shots; app-level async state uses the BLoC state layer (or Riverpod `AsyncValue` in Riverpod projects) with a handled error state.
- [ ] Networking and persistence work is routed to `flutter-data-networking` / `flutter-data-persistence`, not re-implemented here.
- [ ] Repositories expose `Future`/`Stream` APIs and hide `Dio`/`Database`/`Box` handles from widgets and state holders.
- [ ] Money values use `int` minor units end-to-end; `SUM()` over money columns returns `int`.
- [ ] `schemaVersion` increases ship a matching `MigrationStrategy.onUpgrade` (see `flutter-data-persistence`).
- [ ] At least one drift in-memory DAO test exists for every relational schema.
