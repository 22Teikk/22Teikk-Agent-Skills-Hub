---
name: flutter-data-and-concurrency
description: Handles data operations and concurrency in Flutter Dart 3+ projects. Use when writing Dart isolates, Stream/Future pipelines, dio HTTP requests, JSON serialization with json_serializable/freezed, drift relational queries, Hive key-value boxes, or Riverpod AsyncValue providers.
version: 1.0.0
platform: flutter
depends-on:
  - observability-and-instrumentation
  - flutter-ui
---

# Flutter Data and Concurrency (Dart 3+, Riverpod)

## Overview

Manage asynchronous data streams, networking, serialization, and local persistence in Flutter using Dart 3+. Follow clean architecture by separating `data sources` (network, database, platform) from `repositories` (domain-shaped API) from `providers` (DI wiring). Riverpod is the **default** state holder; BLoC is documented inline where the data-layer pattern diverges (see end of this skill).

## When to Use

- Use when implementing the data layer (network sources, local databases, repositories) in a Flutter app.
- Use when designing HTTP requests with `dio` (preferred) or `package:http`.
- Use when serializing/deserializing JSON with `json_serializable` or `freezed` (`@freezed` classes).
- Use when configuring a local relational database with `drift` (or `sqflite` for simpler cases) or key-value storage with `hive` / `hive_ce`.
- Use when writing `Stream`-based or `Future`-based providers, isolates, or background work.
- Do NOT use when only changing UI code — see `flutter-ui`.

## Core Process

### 1. Concurrency: `Future`, `Stream`, and `Isolate`

- `Future` / `async-await` for one-shot async work (HTTP request, single DB read).
- `Stream` for continuous updates (DB query that re-emits on change, WebSocket, push notifications).
- **`Isolate`** only for CPU-heavy, blocking work — image processing, JSON parsing of huge payloads, crypto. Never reach for an isolate for a typical HTTP/DB call; Dart's event loop already does the right thing.
- Use `Isolate.run` (Dart 2.19+) for a one-shot spawn — it returns a `Future` and reuses the isolate pool. Use `Isolate.spawn` only for long-lived workers that need bidirectional `SendPort`/`ReceivePort` messaging.

```dart
// Heavy work off the main isolate.
Future<List<Transaction>> parseHugePayload(String rawJson) {
  return Isolate.run(() {
    final list = jsonDecode(rawJson) as List<dynamic>;
    return list.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
  });
}
```

### 2. Streams with proper resource management

- Streams created in a provider **must** be disposed. With Riverpod, return `Stream.autoDispose` providers and use `ref.onDispose(streamSubscription.cancel)` for manually-managed subscriptions.
- Prefer **`Stream.fromFuture`** for one-shot async work, **`async*` generators** for continuous sequences, and **`StreamController`** only when an external push API (e.g. push notifications) requires it. Always `close()` `StreamController` instances.

```dart
final transactionFeedProvider = StreamProvider.autoDispose<List<Transaction>>((ref) {
  final controller = StreamController<List<Transaction>>();
  final sub = ref.watch(transactionRepositoryProvider).watchAll().listen(controller.add);

  ref.onDispose(() {
    sub.cancel();
    await controller.close();
  });

  return controller.stream;
});
```

### 3. HTTP with `dio` (preferred) or `http`

- `dio` is preferred: built-in interceptors, request/response transformers, cancellation, and typed error handling via `DioException`.
- Configure a **single** `Dio` instance behind a Riverpod provider; never instantiate `Dio()` per call.
- Interceptors handle auth (`Authorization` header), logging (only in debug), and retry-on-401 (refresh token).

```dart
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: const String.fromEnvironment('API_BASE', defaultValue: 'https://api.example.com'),
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Accept': 'application/json'},
  ));
  dio.interceptors.add(LogInterceptor(
    requestBody: kDebugMode,
    responseBody: kDebugMode,
    logPrint: (line) => ref.read(loggerProvider).d(line),
  ));
  return dio;
});
```

### 4. JSON serialization with `freezed` + `json_serializable`

- Model all DTOs and entities as `@freezed` classes; `freezed` gives you value-equality, `copyWith`, sealed unions for free. Combine with `json_serializable` for `fromJson` / `toJson`.
- Run `dart run build_runner build --delete-conflicting-outputs` after every model change. Commit the `*.g.dart` and `*.freezed.dart` files unless the project policy forbids it (rare; most projects commit).

```dart
@freezed
class TransactionDto with _$TransactionDto {
  const factory TransactionDto({
    required String id,
    required int amountMinor,         // cents — see guardrail below
    required String currency,
    required DateTime createdAt,
  }) = _TransactionDto;

  factory TransactionDto.fromJson(Map<String, dynamic> json) =>
      _$TransactionDtoFromJson(json);
}
```

### 5. Local persistence — relational: `drift` (preferred) / key-value: `hive`

- **Relational data, joins, queries, migrations** → `drift`. Schema lives as typed Dart classes; queries are type-safe at compile time.
- **Simple key-value blobs, settings, cached JSON** → `hive` / `hive_ce` (community-maintained fork) or `shared_preferences`.
- Access the database only through a repository; never expose a `Database` / `Box` directly to a widget or provider.

```dart
// drift database definition (lib/data/local/app_database.dart)
@DriftDatabase(tables: [Transactions])
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.e);
  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) => m.createAll(),
    onUpgrade: (m, from, to) async {
      if (from < 2) await m.addColumn(transactions, transactions.merchantName);
    },
  );
}
```

### 6. Riverpod providers as the data-layer seam

- A `Repository` is exposed as a `Provider`. The provider owns **wiring** (database, dio, logger) and **lifecycle**; the repository owns **business logic**.
- `AsyncNotifier` / `FutureProvider` / `StreamProvider` give you `AsyncValue` (`loading` / `data` / `error`) for free — the UI `switch`es on it.

```dart
// lib/data/repositories/transaction_repository.dart
class TransactionRepository {
  TransactionRepository(this._db, this._api);
  final AppDatabase _db;
  final Dio _api;

  Stream<List<Transaction>> watchAll() => (_db.select(_db.transactions)
        ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
      .watch()
      .map((rows) => rows.map(Transaction.fromRow).toList());

  Future<void> sync() async {
    final remote = await _api.get<List<dynamic>>('/transactions');
    await _db.transaction(() async {
      await _db.batch((b) {
        b.insertAll(
          _db.transactions,
          remote.data!.cast<Map<String, dynamic>>().map(TransactionDto.fromJson).map((d) =>
              TransactionsCompanion.insert(
                id: d.id,
                amountMinor: d.amountMinor,
                currency: d.currency,
                createdAt: d.createdAt,
              )),
        );
      });
    });
  }
}

final transactionRepositoryProvider = Provider<TransactionRepository>((ref) {
  return TransactionRepository(ref.watch(appDatabaseProvider), ref.watch(dioProvider));
});
```

### 7. BLoC variant (where data layer meets state holder)

In a `flutter_bloc` project, repositories stay the same (no DI/architecture shift), but the state holder is a `Bloc<Event, State>`:

```dart
class TransactionListBloc extends Bloc<TransactionListEvent, TransactionListState> {
  TransactionListBloc(this._repo) : super(const Loading()) {
    on<Load>(_onLoad);
  }
  final TransactionRepository _repo;
  Future<void> _onLoad(Load e, Emitter<TransactionListState> emit) async {
    await emit.forEach(_repo.watchAll(), onData: Data.new, onError: (err, _) => Error(err.toString()));
  }
}
```

The two variants should **never** be mixed inside the same feature subtree.

### 8. Error handling

- Network errors (`DioException`) and DB errors must surface as typed exceptions or sealed `Failure` classes — not bare `print`/`debugPrint`. Catch them at the provider boundary with `AsyncValue.guard` or a `try/catch` in the `Notifier`/`Bloc` event handler.
- Never swallow exceptions in a `try/catch {}` with an empty body. At minimum, log them with the project's logging library (default `logger`).

## Data-layer guardrails (block on these before ship)

These mirror the Android skill's hard rules — adapted to Flutter idioms:

- **`schemaVersion` bumped with no migration** is a data-loss trap. When `schemaVersion` increases in a shipped app, users with the old schema crash or fall back to destructive recreation. Always ship a `MigrationStrategy.onUpgrade` for every version bump, and prove it with a drift schema test (insert under v1 → migrate → assert under v2).
- **Never store money as `double` / `num` with fractional values.** Use `int` minor units (cents) end-to-end. A `SELECT SUM(amount)` query in drift must be declared to return `Expression<int>`, not `Expression<double>` — a `SUM()` over a `REAL` column will silently drift on the device. See `references/domain-guardrails.md` for the finance rules.
- **Prove the schema with a real in-memory database test, not a mocked repository.** Mocking the repository that returns the value you assert proves nothing — the SQL, the schema, and the column type never ran. Use `NativeDatabase.memory()` (or `drift_dev`'s in-memory helper) in the test. See `flutter-testing-and-benchmark`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just `await` everything on the UI isolate — Dart is single-threaded, it's fine" | Dart's event loop is non-blocking only for I/O. JSON parsing of a multi-MB payload on the main isolate will jank. Use `Isolate.run` for CPU-bound work, even though there is only "one thread". |
| "I'll instantiate `Dio()` inside each call" | You lose interceptors, timeouts, base URL, and connection pooling. One configured `Dio` per process, behind a provider. |
| "Drift is overkill, I'll just use `sqflite` raw queries" | `sqflite` is fine for one table; the second join is the regret. Drift's type-safe DSL catches schema drift at compile time. |
| "I don't need a migration — I'll just `bumpSchemaAndRecreate`" | That works the day you ship, on the day a user updates: their data is gone. Always write a migration. |
| "I'll use `Hive` for everything, even relational data" | Hive is a key-value store. The moment you want a JOIN or a typed query, you're rebuilding a database. Pick drift for relational, hive for blobs. |
| "Mocking the repository proves the data layer works" | A mock that returns the expected value and a test that asserts that value is tautological. It never runs the SQL, never sees a `REAL`/`INTEGER` mismatch, never hits a drift query bug. Test against an in-memory database. |

## Red Flags

- `Dio()` instantiated inside a method instead of via the shared provider.
- A `StreamController` that is never `close()`d, or a provider that does not `ref.onDispose` its subscriptions.
- `Isolate.spawn` used for a one-off computation when `Isolate.run` would do.
- A `Future` chain that calls `setState` (or `state = ...`) after `await` without a `mounted`/lifecycle guard.
- JSON parsed via `Map<String, dynamic>` round-trips inside widgets (no `freezed` model).
- `drift` schema bumped with `onUpgrade: (m, from, to) async => m.deleteAllTables()` — silent data loss on update.
- Hive used for data that has a natural shape (lists of related entities, indexed lookups).
- Money or any exact-value column stored as `REAL` / `double`, or a `SUM()` returning `Expression<double>`.
- A data layer "covered" only by mocked-repository tests; no drift in-memory DAO test.

## Verification

- [ ] No DB or HTTP code runs without going through a repository.
- [ ] `Stream` providers are `autoDispose` and dispose their subscriptions via `ref.onDispose`.
- [ ] A single `Dio` instance is configured in a provider; no per-call instantiation.
- [ ] All DTOs are `@freezed` classes with `fromJson`/`toJson`.
- [ ] `drift` `schemaVersion` increases always ship a matching `MigrationStrategy.onUpgrade`.
- [ ] Money values use `int` minor units end-to-end; `SUM()` over money columns returns `int`.
- [ ] Network/DB errors surface as typed exceptions or sealed `Failure`s, never `print`.
- [ ] At least one drift in-memory DAO test exists for every relational schema.
- [ ] `dart run build_runner build` is clean and committed `.g.dart`/`.freezed.dart` files are up to date.
