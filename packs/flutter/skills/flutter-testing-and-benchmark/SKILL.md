---
name: flutter-testing-and-benchmark
description: Implements unit testing and performance benchmarking in Flutter Dart 3+ projects. Use when writing flutter_test WidgetTester tests, mocktail unit tests, Riverpod ProviderContainer tests, widget golden tests, integration_test driver tests, or Timeline-based performance benchmarks.
version: 1.0.0
platform: flutter
depends-on:
  - flutter-ui
  - flutter-data-and-concurrency
---

# Flutter Testing and Benchmarking (Dart 3+, Riverpod)

## Overview

Ensure correctness and performance stability. Write robust `flutter_test` widget/unit tests, golden tests for visual regression, `integration_test` driver tests for end-to-end flows, and `Timeline`-based performance benchmarks for jank/startup metrics. Replace Macrobenchmark with `Timeline.startSync` + Performance overlays; mention Patrol as an opt-in for native-gesture flows.

## When to Use

- Use when writing unit tests for Dart code, `Notifier`s, repositories, or use cases.
- Use when writing widget tests with `WidgetTester` (`pumpWidget`, `pumpAndSettle`, `find.byType`).
- Use when setting up test doubles with `mocktail` (preferred over hand-rolled fakes).
- Use when authoring golden tests for visual regression.
- Use when measuring startup time, scroll jank, or frame timing via `Timeline` / Performance overlay.
- Do NOT use for Java/Android-specific or iOS-Swift-specific tests.
- For multi-screen journey tests, prefer `integration_test` (official) — Patrol is opt-in for native gestures only.

## Core Process

### 1. Dart unit testing with `test` + `mocktail`

- Use `mocktail` for mocks (`when(...)`). For Riverpod, override providers with `ProviderContainer(overrides: [...])` instead of mocking the provider itself.
- Keep repositories tested against **real** in-memory databases (see §3); mock only the network surface or external platform plugins.

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockApi extends Mock implements TaskApi {}

void main() {
  late _MockApi api;
  late TaskRepository repo;

  setUp(() {
    api = _MockApi();
    repo = TaskRepository(api);
  });

  test('fetchAll returns mapped tasks on success', () async {
    when(() => api.fetchTasks()).thenAnswer(
      (_) async => [TaskDto(id: '1', title: 'Test', isCompleted: false)],
    );

    final tasks = await repo.fetchAll();

    expect(tasks, hasLength(1));
    expect(tasks.first.title, 'Test');
    verify(() => api.fetchTasks()).called(1);
  });

  test('fetchAll throws ApiException on 5xx', () async {
    when(() => api.fetchTasks()).thenThrow(DioException(
      requestOptions: RequestOptions(path: '/tasks'),
      response: Response(statusCode: 500, requestOptions: RequestOptions(path: '/tasks')),
    ));
    expect(repo.fetchAll, throwsA(isA<ApiException>()));
  });
}
```

### 2. Widget tests with `flutter_test` and Riverpod overrides

- Use `pumpWidget` for synchronous content, `pumpAndSettle` when waiting for animations / async to finish. Use `pump(Duration(milliseconds: ...))` for explicit time advance — never `Future.delayed` inside a test.
- Override providers with `ProviderScope(overrides: [...])` to inject fakes; never read network or DB inside a widget test.

```dart
testWidgets('TaskListContent renders tasks from provider', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        taskListNotifierProvider.overrideWith(() => _FakeTaskListNotifier()),
      ],
      child: const MaterialApp(home: TaskListScreen()),
    ),
  );
  await tester.pumpAndSettle();

  expect(find.text('Buy Milk'), findsOneWidget);
  expect(find.byType(CircularProgressIndicator), findsNothing);
});

class _FakeTaskListNotifier extends TaskListNotifier {
  @override
  Future<TaskListUiState> build() async => Data([Task(id: '1', title: 'Buy Milk')]);
}
```

### 3. Drift in-memory DAO tests (mandatory for the data layer)

- The data layer must have **≥1 test against a real in-memory drift database**, not a mocked repository. A mock that returns `[Transaction(amount: 25.50)]` and then asserts `25.50` proves nothing — it never touches SQL, so a wrong column type, a bad `SUM`, or a broken query ships green. Use `NativeDatabase.memory()` (fast, real).

```dart
import 'package:drift/native.dart';

void main() {
  late AppDatabase db;
  late TransactionDao dao;

  setUp(() {
    db = AppDatabase(NativeDatabase.memory());
    dao = db.transactionDao();
  });

  tearDown(() async => db.close());

  test('insertThenSum returns exact total in minor units', () async {
    await dao.insert(TransactionsCompanion.insert(
      id: '1', amountMinor: 2550, currency: 'USD', createdAt: DateTime(2026, 1, 1),
    ));
    await dao.insert(TransactionsCompanion.insert(
      id: '2', amountMinor: 1099, currency: 'USD', createdAt: DateTime(2026, 1, 2),
    ));

    final total = await dao.totalMinor().getSingle();

    expect(total, 3649); // exact — no double drift
  });
}
```

This is the test that catches money-as-`double`: with `REAL` columns the sum drifts; with `INTEGER` minor units it is exact. See `references/domain-guardrails.md` for the finance rules.

### 4. Golden (visual regression) tests

- Run on a fixed-size surface (e.g. `tester.binding.window.physicalSizeTestValue = Size(800, 1200)`) to keep snapshots stable.
- Lock the font and theme to avoid CI flakes: pump with a deterministic `ThemeData` and disable ambient font scaling.

```dart
testWidgets('TaskTile golden', (tester) async {
  await tester.binding.setSurfaceSize(const Size(400, 200));
  await tester.pumpWidget(MaterialApp(
    theme: _testTheme(),
    home: const TaskTile(task: Task(id: '1', title: 'Buy Milk')),
  ));

  await expectLater(
    find.byType(TaskTile),
    matchesGoldenFile('goldens/task_tile.png'),
  );
});
```

- Re-baseline with `flutter test --update-goldens` only when the change is intentional; commit the regenerated `.png` files.

### 5. Riverpod `ProviderContainer` for non-widget unit tests

- Test a `Notifier` / `AsyncNotifier` in isolation by overriding its dependencies and reading `container.read(provider.notifier)`.

```dart
test('refresh sets AsyncLoading then AsyncData', () async {
  final container = ProviderContainer(overrides: [
    taskRepositoryProvider.overrideWithValue(_FakeRepo()),
  ]);
  addTearDown(container.dispose);

  await container.read(taskListNotifierProvider.future); // initial load
  await container.read(taskListNotifierProvider.notifier).refresh();

  expect(container.read(taskListNotifierProvider), isA<AsyncData<TaskListUiState>>());
});
```

### 6. Bloc variant — `bloc_test`

If the project uses `flutter_bloc`, use `bloc_test` to drive events and assert emitted states. Repository mocking is the same as above.

```dart
blocTest<TransactionListBloc, TransactionListState>(
  'emits [Loading, Data] on Load',
  build: () => TransactionListBloc(_FakeRepo()),
  act: (bloc) => bloc.add(const Load()),
  expect: () => [const Loading(), Data([Transaction(id: '1', amountMinor: 2550)])],
);
```

### 7. `integration_test` for cross-screen journeys (officially supported)

- Lives under `integration_test/` as a separate "test app" — `flutter test integration_test/foo_test.dart -d <device>` runs it as a real device build.
- Use `find.byType` / `find.text` / `find.byTooltip` like widget tests; use `tester.tap`, `tester.enterText`, `tester.pumpAndSettle`.

```dart
import 'package:integration_test/integration_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('create task then see it in the list', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('fab_add_task')));
    await tester.enterText(find.byKey(const Key('field_title')), 'Buy Milk');
    await tester.tap(find.byKey(const Key('btn_save')));
    await tester.pumpAndSettle();

    expect(find.text('Buy Milk'), findsOneWidget);
  });
}
```

### 8. Patrol (opt-in) for native gestures

Patrol adds custom native gestures (`tester.scrollUntilVisible` with platform fling, biometric prompts, permission dialogs) on top of `integration_test`. Reach for it only when a flow cannot be expressed with Flutter-level `WidgetTester` calls.

- Do **not** default to Patrol for every project. If `integration_test` is enough, stop there. See `references/domain-guardrails.md` and `ci-cd-and-automation`.

### 9. Performance: Timeline + Performance overlay (replaces Macrobenchmark)

There is no first-party Macrobenchmark equivalent in Flutter. Use one of:

- **`Timeline.startSync(...)`** for fine-grained per-frame measurement in a `flutter test` widget test:

```dart
testWidgets('scroll jank stays under 16ms per frame', (tester) async {
  final timeline = Timeline.startSync('scroll_jank');
  await tester.pumpWidget(MaterialApp(home: TaskListScreen()));
  await tester.fling(find.byType(ListView), const Offset(0, -600), 1000);
  await tester.pumpAndSettle();
  timeline.finish();

  final snapshots = await timeline
      .asyncTimelineStream.firstWhere((t) => t.isFinished)
      .then((t) => t.events);
  final frames = snapshots.where((e) => e.name == 'Frame').toList();
  expect(frames.every((f) => f.duration < const Duration(milliseconds: 17)), isTrue);
});
```

- **DevTools Performance overlay** for interactive profiling (`flutter run --profile`, then the Performance tab). Run on a real device, profile mode, with a known workload (cold start, scrolling, image decode).

- **Robolectric / flutter_test --profile flag** is not a substitute — only the device + profile mode yields numbers close to user-perceived performance.

### 10. Mocking rules

- **Mock only what you own** (your repository, your API client). Do not mock classes you don't own (`Dio`, `Navigator`, `BuildContext`, `drift`'s `Database`).
- **Mock-verification tests are zero coverage.** A test that mocks the very component under test and then asserts the mocked value is tautological — delete it.
- **Boilerplate template tests** left in `test/` (`expect(1+1, 2)`) — delete them; they count for nothing.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Unit tests with mocked repositories are enough" | A mocked repo test never runs the SQL. Drift type mismatches, bad `SUM` semantics, and migration bugs only surface against a real in-memory database. |
| "I'll just `await Future.delayed` inside the widget test" | `Future.delayed` in a test is racy and slow. Use `tester.pump(Duration(...))` or `pumpAndSettle()` instead. |
| "I'll skip goldens, the screenshots look right on my machine" | Without committed goldens, every "it looks right" is an unverifiable claim. Goldens are cheap once you set the surface size. |
| "Performance in debug mode is fine to measure" | Debug mode has assertions on, JIT-compiled hot paths, and Observatory overhead. Numbers in debug are noise. Profile mode is the only honest number. |
| "I'll mock `BuildContext`" | `BuildContext` is a handle owned by the framework. Mocking it proves nothing about real widget tree behavior. Drive a real `WidgetTester`. |

## Red Flags

- Tests relying on `Future.delayed` or `sleep` to wait for async work to complete.
- Mocking classes you do not own (`Dio`, `Navigator`, `BuildContext`, `Database`).
- **Mock-verification tests** — mocking the very component under test and asserting the mocked value. Tautological; counts as zero coverage.
- **Boilerplate template tests** left in `test/` (the default `1+1==2` smoke) — delete them.
- Data layer "tested" only through mocked repositories, with no drift in-memory DAO test.
- Golden tests that vary surface size or ambient font scaling between runs.
- Performance measurements taken in **debug** mode and treated as ground truth.
- `pumpWidget` without a `MaterialApp`/`CupertinoApp` ancestor — widget lookups for theme/MediaQuery fail.
- UI tests that assert via `tester.tapAt(const Offset(x, y))` instead of `find.byKey`/`find.byType`.

## Verification

- [ ] All unit tests pass: `flutter test`.
- [ ] At least one drift in-memory DAO test per relational schema (mandatory for the data layer).
- [ ] Widget tests use `WidgetTester` with `pumpWidget` and `pumpAndSettle`; no `Future.delayed`.
- [ ] Goldens are committed and regenerated intentionally via `--update-goldens`.
- [ ] Integration test on a real device or emulator: `flutter test integration_test/ -d <device>`.
- [ ] Performance measurements recorded in profile mode on a real device, not in debug.
- [ ] `flutter analyze` clean and `flutter test` green before merge.
