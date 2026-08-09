---
name: flutter-data-persistence
description: Handles local persistence in Flutter Dart 3+ projects. Use when choosing between drift, hive, shared_preferences, and sqflite for on-device storage, defining drift tables and typed queries, wiring drift_dev/build_runner codegen, adding drift migrations (schemaVersion, MigrationStrategy, stepByStep), consuming reactive query streams (watch()/WatchStream), opening hive boxes with TypeAdapters, or reading/writing shared_preferences settings. Persistence only — networking lives in flutter-data-networking.
version: 1.0.0
platform: flutter
depends-on: [flutter-data-networking, flutter-di-and-build, flutter-error-handling, flutter-testing-and-benchmark, flutter-ui, security-and-hardening]
---

# Flutter Data Persistence (drift, Hive, shared_preferences, sqflite)

## Overview

Local persistence is a **decision table, not a default library**. `drift` (typed SQL over SQLite) is the 2026 default for anything structured: relational queries, joins, aggregations, migrations, reactive streams. `hive` is for key-value boxes of small/mid-size objects with no SQL shape. `shared_preferences` is for tiny settings keys **only**. `sqflite` is the raw-SQL escape hatch when drift is too heavy or legacy code already owns raw queries. Everything behind a repository — widgets and state holders never touch a `Database`, `Box`, or `prefs` handle.

This skill deep-dives the persistence layer. The repository/provider seam that consumes it, and the drift/hive *summary* that lives with the data layer, are in `flutter-data-and-concurrency` — do not duplicate its section 5 here. Networking is `flutter-data-networking`; reactive providers that watch query streams are `flutter-state-riverpod`. In-memory DAO tests belong to `flutter-testing-and-benchmark`.

## When to Use

- Use when an app stores anything locally on device — the persistence decision table applies to every such app.
- Use when relational data (tables, relationships, typed queries, joins, migrations) is needed — `drift`.
- Use when storing key-value blobs, cached JSON, or small object graphs with no query shape — `hive`.
- Use when persisting a handful of app settings or a feature flag — `shared_preferences` (and `flutter_secure_storage` for tokens, see `security-and-hardening`).
- Use when raw SQLite is already in use and drift is not worth the migration — `sqflite`.
- Use when a persisted entity changes shape and the schema must evolve without wiping user data — drift migrations.
- Do NOT use for networking (HTTP, uploads, streams) — see `flutter-data-networking`.
- Do NOT use when only changing UI code — see `flutter-ui`.

## Core Process

### 1. Pick the layer: decision table

| Need | Choice | Why / When |
|---|---|---|
| Typed queries, JOINs, aggregations, relations, migrations, reactive updates | **drift** | DEFAULT for anything beyond trivial. Compile-time-checked SQL, schema in Dart, `watch()` streams. |
| Small/mid key-value objects, cached blobs, no query shape | **hive** (or `hive_ce` fork) | Boxes + `TypeAdapter`, no native deps beyond dart:io; fine up to a few thousand entries. |
| A few settings / feature flags / booleans | **shared_preferences** | Tiny, synchronous-feeling key-value; wraps `NSUserDefaults`/`SharedPreferences`. Never for sensitive data. |
| Raw SQLite already in use; drift is overkill | **sqflite** | Hand-written SQL + versioned `onUpgrade`. Only when the raw layer already owns the schema. |
| ~~Isar~~ | — | Maintenance status is questionable in 2026 — treat as deprecated; do not start new work on it. |

**One rule above all:** anything relational, or that will ever need a query, starts in drift. Hive-for-everything dies the moment a JOIN is needed.

### 2. drift setup: `drift_dev` + `build_runner` + `drift_flutter`

Add the runtime deps and the codegen toolchain, then run `build_runner`. `drift_flutter`'s `driftDatabase()` helper wires the SQLite file and platform libraries for you (no manual `path_provider`/`sqlite3_flutter_libs` wiring).

```yaml
# pubspec.yaml
dependencies:
  drift: ^2.0.0
  drift_flutter: ^0.2.0
  path_provider: ^2.0.0          # needed by driftDatabase for the file location
dev_dependencies:
  drift_dev: ^2.0.0
  build_runner: ^2.0.0
```

```dart
// lib/data/local/app_database.dart
import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

class Transactions extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get merchantName => text().withLength(min: 1, max: 120)();
  IntColumn get amountMinor => integer()(); // cents — never REAL (see flutter-data-and-concurrency)
  TextColumn get currency => text().withLength(min: 3, max: 3)();
  DateTimeColumn get createdAt => dateTime()();
}

@DriftDatabase(tables: [Transactions, Categories])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? _openConnection());
  AppDatabase.forTesting(super.e);

  static QueryExecutor _openConnection() {
    return driftDatabase(name: 'app'); // app.sqlite in documents dir
  }

  @override
  int get schemaVersion => 1;
}
```

Generate with: `dart run build_runner build --delete-conflicting-outputs` (see `flutter-di-and-build` for the build step). Commit the generated `app_database.g.dart`.

### 3. drift typed queries: `Selectable` API

Every table exposes a generated `select(table)` builder. The result is a `Selectable<T>` — fetch once with `get()/getSingle()/getSingleOrNull()`, reactively with `watch()/watchSingle()/watchSingleOrNull()`. Filter with Dart expressions; the SQL is type-checked at compile time.

```dart
// One-shot read + reactive read, both typed.
Future<Transaction?> getById(int id) =>
    (select(transactions)..where((t) => t.id.equals(id))).getSingleOrNull();

Stream<List<Transaction>> watchRecent() {
  final q = select(transactions)
    ..where((t) => t.amountMinor.isBiggerOrEqualValue(0))
    ..orderBy([(t) => OrderingTerm.desc(t.createdAt)])
    ..limit(50);
  return q.watch(); // re-emits when transactions (or related tables) change
}
```

- **Joins**: `select(transactions).join([innerJoin(categories, categories.id.equalsExp(transactions.categoryId))])`, then `row.readTable(transactions)`.
- **Raw SQL**: `customSelect('SELECT ...', variables: [Variable.withInt(id)], readsFrom: {transactions})` — declare `readsFrom` so `watch()` still auto-updates.
- **Insert**: `into(transactions).insert(TransactionsCompanion.insert(merchantName: 'Acme', amountMinor: 1234, currency: 'USD'))`. Bulk + atomicity: wrap in `transaction(() async { ... })` and use `batch((b) => b.insertAll(transactions, companions))`.

### 4. drift reactive streams: `watch()` and `WatchStream`

`watch()` on a `Selectable` gives a fresh auto-updating stream per call. When the **same query is watched from many places** (list screen + badge count + notification logic), wrap it in the database's `WatchStream` (drift 2.20+; formerly `StreamQueryStore`) — it dedupes identical queries and shares one underlying stream across all listeners instead of running the query N times.

```dart
// lib/data/local/app_database.dart
Stream<List<Transaction>> watchRecentShared() {
  final q = select(transactions)
    ..where((t) => t.amountMinor.isBiggerOrEqualValue(0))
    ..orderBy([(t) => OrderingTerm.desc(t.createdAt)])
    ..limit(50);
  return watchStream.watch(q); // one query stream, N listeners
}
```

Consumers stay in `flutter-state-riverpod`: `StreamProvider.autoDispose` watches the repository's stream and disposes it via `ref.onDispose`. Never leak a `watch()` subscription that the widget created by hand.

### 5. drift migrations: `schemaVersion` + `MigrationStrategy`

Every `schemaVersion` bump on a shipped app MUST ship a matching migration or users lose data (drift falls back to destructive recreation when no step exists). Generate a step-by-step migration with `dart run drift_dev make-migrations` (writes `app_database.steps.dart`), then wire it:

```dart
import 'package:drift/drift.dart';
part 'app_database.g.dart';

@DriftDatabase(tables: [Transactions, Categories])
class AppDatabase extends _$AppDatabase {
  // ... constructor as in step 2 ...

  @override
  int get schemaVersion => 2; // bumped for the new column

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (m) => m.createAll(),
      onUpgrade: stepByStep(
        from1To2: (m, schema) async {
          await m.addColumn(schema.transactions, schema.transactions.categoryId);
        },
      ),
      beforeOpen: (details) async {
        await customStatement('PRAGMA foreign_keys = ON');
      },
    );
  }
}
```

- `stepByStep(from1To2: ..., from2To3: ...)` — each step references the schema **at that version**, so history stays correct.
- Keep the in-memory test as proof: build `AppDatabase.forTesting(NativeDatabase.memory())`, insert under v1 schema, upgrade, assert under v2 (see `flutter-testing-and-benchmark`).
- Schema drift on the `INTEGER`/`REAL` boundary silently corrupts money math — money columns are `integer()` minor units, end-to-end.

### 6. hive: `Box` + `TypeAdapter`

Call `Hive.initFlutter()` before `runApp()`. Open a box, read/write synchronously-ish (it's `dart:io`-backed, no native plugin). For custom classes, generate a `TypeAdapter` with `hive_generator` — storing unadapter-registered objects throws at runtime.

```dart
// main.dart
WidgetsFlutterBinding.ensureInitialized();
await Hive.initFlutter();
Hive.registerAdapter(CachedQuoteAdapter()); // generated by hive_generator
final box = await Hive.openBox<CachedQuote>('quotes'); // typed box
runApp(MyApp());
```

```dart
// lib/data/local/cached_quote.dart
@HiveType(typeId: 1)
class CachedQuote {
  @HiveField(0) final String symbol;
  @HiveField(1) final double price;
  CachedQuote(this.symbol, this.price);
}

// usage
await box.put('AAPL', CachedQuote('AAPL', 213.45));
final q = box.get('AAPL');       // CachedQuote?
await box.delete('AAPL');
box.toMap();                     // iterate/export whole box
```

- `hive` (original) is in maintenance mode; `hive_ce` is the actively-maintained community fork with the same API — prefer it for new projects.
- Boxes are untyped JSON maps until you add a `TypeAdapter` — always register adapters and use typed `openBox<T>()`.
- Relational shape? Not hive — back to drift (decision table).

### 7. shared_preferences: settings keys only

For a handful of app settings (theme, onboarding seen, last-used account id). The modern 2.x surface is `SharedPreferencesAsync` / `SharedPreferencesWithCache`; the classic `getInstance()` singleton still works.

```dart
final prefs = await SharedPreferences.getInstance();
await prefs.setBool('dark_mode', true);
final dark = prefs.getBool('dark_mode') ?? false;
await prefs.remove('onboarding_done');
```

- **NEVER store tokens, passwords, PII, or payment data** — prefs is plaintext and unencrypted on every platform. That is `flutter_secure_storage` territory (see `security-and-hardening`).
- Not for relational data, lists of entities, or anything queried — that's drift or hive.
- Read/write from a repository; do not scatter `SharedPreferences.getInstance()` through widgets.

### 8. sqflite: raw SQL fallback

Only when drift is too heavy for the schema, or a legacy codebase already runs raw SQL and the migration cost is not worth it. Versioned `openDatabase` with manual `onCreate`/`onUpgrade` — you own every migration by hand.

```dart
final db = await openDatabase('legacy.db', version: 2,
  onCreate: (db, v) async {
    await db.execute('CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL, currency TEXT NOT NULL)');
  },
  onUpgrade: (db, oldV, newV) async {
    if (oldV < 2) await db.execute('ALTER TABLE transactions ADD COLUMN merchant_name TEXT');
  },
);

final rows = await db.query('transactions', where: 'currency = ?', whereArgs: ['USD']);
```

- `sqflite` is mobile-native only; use `sqflite_common_ffi` for desktop/tests.
- Prefer drift for **new** schema work — hand-written `ALTER TABLE` strings drift silently; drift's typed migration steps do not.

### 9. Repository seam and boundaries

Persistence is reached **only** through a repository (the seam lives in `flutter-data-and-concurrency`). The repository is exposed as a provider from `flutter-di-and-build` / `flutter-state-riverpod`; widgets `ref.watch` an `AsyncValue` over the stream. DB/Box/prefs failures surface as typed exceptions or sealed `Failure`s (see `flutter-error-handling`) — never `print`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll use `shared_preferences` for everything — it's built in" | It's plaintext, unversioned key-value storage. Relational data, migrations, and reactive queries need a real store. It's for settings keys only. |
| "Hive is faster than drift, I'll store everything in boxes" | Hive is fast for key-value blobs; the moment you want a JOIN or a typed filter you are rebuilding a database by hand. Pick by shape, not by benchmark. |
| "Drift is overkill — `sqflite` raw SQL is simpler" | Fine for one table. The second join or the first silent schema drift is the regret — drift's typed DSL catches both at compile time. |
| "I'll bump `schemaVersion` and let drift recreate" | On the day you ship, a user updates and their data is gone. `stepByStep` + a migration for every bump, proven with an in-memory test. |
| "Isar was the 2022 choice, I'll keep it" | Its maintenance status is questionable in 2026. Do not start new work on it; migrate to drift for relational data. |
| "I'll store the token in `shared_preferences` — it's just for dev" | Plaintext tokens on disk are a credential leak. Tokens go in `flutter_secure_storage`, always. |
| "Every widget can open its own box/database handle" | N handles, N connections, no single lifecycle, no migration ownership. One database/box per process, behind a repository. |

## Red Flags

- `SharedPreferences.getInstance()` (or token/credential storage) used for anything beyond settings — and tokens stored there at all.
- Hive used for data with relational shape, or custom classes stored without a registered `TypeAdapter`.
- `sqflite` used for a **new** schema when drift would type-check the queries and migrate them.
- `schemaVersion` bumped with no `stepByStep`/`onUpgrade` step — silent data loss on update.
- Money columns declared as `REAL`/`double`, or `SUM()` over money returning a float — `integer()` minor units end-to-end.
- `watch()` subscriptions created in widgets and never disposed; query streams not going through a repository.
- Multiple `driftDatabase()`/`openBox()`/`openDatabase()` instances instead of one behind a provider.
- Persistence code written that is "covered" only by a mocked repository — the SQL and schema never ran (use `NativeDatabase.memory()`, see `flutter-testing-and-benchmark`).
- A `Box`, `Database`, or `prefs` handle passed directly into a widget or state holder.

## Verification

- [ ] The persistence layer was chosen from the decision table (drift / hive / shared_preferences / sqflite), and the choice is defensible for the data shape.
- [ ] Relational schema lives in `drift` with `drift_dev` codegen; `dart run build_runner build --delete-conflicting-outputs` is clean and `*.g.dart` is committed.
- [ ] Every `schemaVersion` increase ships a matching `stepByStep` migration, generated by `dart run drift_dev make-migrations`.
- [ ] A drift in-memory DAO test (`NativeDatabase.memory()`) exercises insert → query → migrate for at least one version bump.
- [ ] Money values are `int` minor units end-to-end; money columns are `integer()`, never `REAL`.
- [ ] Hive boxes are typed (`openBox<T>()`) and every custom class has a registered `TypeAdapter`.
- [ ] `shared_preferences` holds settings only; tokens/credentials/PII live in `flutter_secure_storage`.
- [ ] No widget or state holder touches a `Database`/`Box`/`prefs` handle — all reads and writes go through a repository.
- [ ] Reactive query streams are consumed via Riverpod `StreamProvider.autoDispose` and disposed with `ref.onDispose`; shared queries use the database's `WatchStream`.
- [ ] Errors from DB/Box/prefs surface as typed exceptions or sealed `Failure`s — never `print`/`debugPrint`.
