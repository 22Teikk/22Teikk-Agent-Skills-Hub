---
name: flutter-state-provider
description: Maintains and migrates legacy Flutter apps built on the Provider 6.x package (ChangeNotifier-based, maintenance-mode). Use when a project already declares provider ^6.x and you must change a screen that reads ChangeNotifierProvider, context.watch/context.read, MultiProvider, ProxyProvider, or Consumer, or when planning a Provider → Riverpod migration OUT. Do NOT use to introduce Provider into a new project — use the flutter-state-riverpod skill; do NOT use for event-driven apps — use the flutter-state-bloc skill.
version: 1.0.0
platform: flutter
depends-on: [flutter-state-bloc, flutter-state-riverpod, flutter-ui]
  - flutter-data-and-concurrency
  - flutter-di-and-build
---

# Flutter State Management — Provider 6.x (Legacy Maintenance)

## Overview

`provider` 6.x is the `InheritedWidget` wrapper that dominated Flutter state management from 2019 to roughly 2023. It is now in **maintenance mode**: the 6.1.x line is the final feature line, receiving compatibility and bugfix releases only, and its author steers new work to Riverpod. It is still stable and still ships in a large number of production apps, so there is no urgency to rip it out.

The honest framing for this skill: **do not write new features on Provider.** New code belongs on Riverpod (`flutter-state-riverpod`) or, for event-sourced flows, BLoC (`flutter-state-bloc`). This skill exists to (a) keep an existing Provider codebase correct and idiomatic while it is maintained, and (b) migrate it feature-by-feature to Riverpod without a big-bang rewrite. The migration section is not an appendix — it is half the value of this skill.

## When to Use

- Use when a project already declares `provider: ^6.x` in `pubspec.yaml` and you must change a screen that reads from it.
- Use when debugging `ProviderNotFoundException`, rebuild storms, or missing-`notifyListeners` bugs in an existing tree.
- Use when writing or fixing tests around an existing `ChangeNotifier`.
- Use when planning or executing an incremental Provider → Riverpod migration (see the dedicated migration section below).
- Do NOT use to introduce Provider into a project that does not already have it — use the `flutter-state-riverpod` skill.
- Do NOT use for event-driven / event-sourced state — that is the `flutter-state-bloc` skill's territory.
- Do NOT use for widget-tree composition rules — those live in the `flutter-ui` skill.

## Core Process

### 1. ChangeNotifier + ChangeNotifierProvider

A model extends `ChangeNotifier`, mutates private fields, then calls `notifyListeners()`. Expose immutable views (`UnmodifiableListView`, getters) so widgets cannot mutate behind the notifier's back.

```dart
class CartModel extends ChangeNotifier {
  CartModel(this._repository);
  final CartRepository _repository;

  final List<Item> _items = [];
  bool _loading = false;

  List<Item> get items => UnmodifiableListView(_items);
  bool get isLoading => _loading;
  int get total => _items.fold(0, (sum, i) => sum + i.priceCents);

  Future<void> load() async {
    _loading = true;
    notifyListeners();               // enter loading
    _items
      ..clear()
      ..addAll(await _repository.fetch());
    _loading = false;
    notifyListeners();               // publish result — never skip this
  }

  void add(Item item) {
    _items.add(item);
    notifyListeners();
  }
}
```

Register it above every widget that reads it — typically at the feature route root, not at `MaterialApp` unless it is genuinely app-scoped:

```dart
ChangeNotifierProvider(
  create: (context) => CartModel(context.read<CartRepository>())..load(),
  child: const CartScreen(),
)
```

Use `ChangeNotifierProvider.value` **only** for a notifier whose lifetime you own elsewhere (tests, an already-created instance). `create:` disposes the notifier for you; `.value` does not.

### 2. Reading: `context.watch` / `context.read` / `context.select` / `Consumer`

| API | Rebuilds on notify? | Where it is legal |
|---|---|---|
| `context.watch<T>()` | yes, whole `build()` | inside `build()` only |
| `context.read<T>()` | no | callbacks, `initState`, `create:` |
| `context.select<T, R>(sel)` | yes, only when `R` changes | inside `build()` |
| `Consumer<T>` | yes, only the builder subtree | inside `build()`, to narrow the rebuild |

The single most common Provider bug is **`watch` in a callback**:

```dart
// BAD: watch inside onPressed — throws at runtime, or subscribes the whole screen.
onPressed: () => context.watch<CartModel>().add(item),

// GOOD: read in callbacks — no subscription, no rebuild.
onPressed: () => context.read<CartModel>().add(item),
```

Narrow rebuilds with `Consumer` (or `Selector`) instead of watching at the top of a large screen. The `child` argument is built once and passed through untouched:

```dart
Consumer<CartModel>(
  builder: (context, cart, child) => Column(
    children: [Text('${cart.total}'), if (child != null) child],
  ),
  child: const ExpensiveStaticFooter(),   // built once, never rebuilt
)

// Or rebuild on one field only:
final total = context.select<CartModel, int>((c) => c.total);
```

Note: `provider` does **not** ship `ConsumerWidget` / `ConsumerStatefulWidget` — those are Riverpod's equivalents. The provider package's rebuild-scoping primitive is `Consumer<T>` (also usable as a base class: `class Foo extends Consumer<CartModel>`). Treat "use a `ConsumerWidget`" as a Riverpod instruction; the provider-side translation is `Consumer` / `Selector`, and the mapping is spelled out in the migration section.

### 3. MultiProvider + ProxyProvider

`MultiProvider` flattens nesting; order matters — a provider may only `read` providers declared **above** it.

```dart
MultiProvider(
  providers: [
    Provider<ApiClient>(create: (_) => ApiClient()),
    Provider<CartRepository>(
      create: (context) => CartRepository(context.read<ApiClient>()),
    ),
    ChangeNotifierProvider(
      create: (context) => AuthModel(context.read<ApiClient>()),
    ),
    // Derived: rebuilds/updates whenever AuthModel notifies.
    ChangeNotifierProxyProvider<AuthModel, CartModel>(
      create: (context) => CartModel(context.read<CartRepository>()),
      update: (context, auth, cart) => cart!..onUserChanged(auth.userId),
    ),
  ],
  child: const App(),
)
```

Use `ProxyProvider` for a plain derived value and `ChangeNotifierProxyProvider` when the dependent object is itself a notifier. Never construct a *new* object inside `update:` for a `ChangeNotifierProxyProvider` — mutate the existing one, or every dependency change leaks the old notifier's listeners.

### 4. Lifecycle: dispose, `create` vs `lazy`, `Provider.of`

- `ChangeNotifierProvider(create: ...)` calls `dispose()` on the notifier when the provider leaves the tree. Your notifier must override `dispose()` to cancel `StreamSubscription`s, `Timer`s, `TextEditingController`s, and platform listeners it owns, then call `super.dispose()`.
- Providers are **lazy** by default — `create:` runs on first read. Pass `lazy: false` when construction must happen eagerly (analytics session, socket connect).
- `Provider.of<T>(context)` is the pre-extension API and defaults to `listen: true`. In a callback it must be `Provider.of<T>(context, listen: false)`; prefer `context.read<T>()` in new edits for readability.

```dart
@override
void dispose() {
  _subscription.cancel();
  _debounce?.cancel();
  super.dispose();          // always last
}
```

### 5. Testing

Unit-test the notifier with no widgets at all — it is a plain Dart object:

```dart
test('load publishes items and clears loading', () async {
  final model = CartModel(FakeCartRepository([itemA]));
  var notifications = 0;
  model.addListener(() => notifications++);

  await model.load();

  expect(model.items, [itemA]);
  expect(model.isLoading, isFalse);
  expect(notifications, 2);       // loading -> loaded
  model.dispose();
});
```

Widget-test by overriding the provider with a fake above the widget under test:

```dart
await tester.pumpWidget(
  ChangeNotifierProvider<CartModel>.value(
    value: FakeCartModel(items: [itemA]),
    child: const MaterialApp(home: CartScreen()),
  ),
);
expect(find.text('1 item'), findsOneWidget);
```

Use `.value` in tests so the test owns the fake's lifetime, and dispose it in `tearDown` if it holds resources.

## Migration: Provider → Riverpod

Migrate **per feature**, never all at once. `ProviderScope` and `MultiProvider` can coexist in the same app during the transition — put `ProviderScope` above `MultiProvider` at the root and convert one route subtree at a time. Keep a running migration note per feature (converted, or explicitly deferred with a reason) so a future agent never re-asks "which parts are still on Provider?".

### When to keep vs migrate

| Situation | Decision |
|---|---|
| Actively developed feature, touched in this task | Migrate it now — conversion is cheaper while you are already editing that subtree. |
| App is near end-of-life / frozen, no new features expected | Keep Provider; maintain in place. Migration budget is not justified. |
| Read-only / legacy screen, no planned change | Keep. Convert it only when a change touches it. |
| New feature in a Provider codebase | Build it on Riverpod alongside (via the root `ProviderScope`) — do not add new Provider nodes. |

### Mapping table

| Provider 6.x | Riverpod equivalent |
|---|---|
| `ChangeNotifier` | `Notifier<T>` / `AsyncNotifier<T>` with immutable state |
| `ChangeNotifierProvider` | `NotifierProvider` (codegen: `@riverpod`) |
| `Provider<T>` (plain DI) | `Provider<T>` (Riverpod) |
| `Provider.family` / `ProxyProvider` | a provider whose body calls `ref.watch(otherProvider(param))` — families are the natural replacement for parameterized factories |
| `context.watch<T>()` | `ref.watch(provider)` |
| `context.read<T>()` | `ref.read(provider.notifier)` (or `ref.read(provider)` for a value) |
| `context.select<T, R>(sel)` | `ref.watch(provider.select(sel))` |
| `Consumer<T>` | `ConsumerWidget` / `ConsumerStatefulWidget` (or `Consumer`) |
| `MultiProvider` | one `ProviderScope` at the app root |
| `dispose()` override | `ref.onDispose(...)` |
| `ChangeNotifierProvider.value` | not needed — tests override the provider directly |

### Conversion steps per feature

1. Convert the `ChangeNotifier` to an immutable state class + `Notifier` / `AsyncNotifier`. The mutable `_field + notifyListeners()` body becomes a single `state = ...` assignment; `AsyncNotifier` gives `AsyncValue` (`loading` / `data` / `error`) for free instead of hand-rolled `bool _loading`.
2. For a parameterized notifier (`Provider.family`, or a notifier constructed per-id), map to `NotifierProvider.family` — the family parameter replaces the factory argument.
3. Swap widget reads to `ref.watch` / `ref.read`; replace `Consumer<T>` with `ConsumerWidget` / `ConsumerStatefulWidget`.
4. Delete the feature's entry from `MultiProvider` and its `ChangeNotifier` file once nothing references them.
5. Run the feature's tests — the Riverpod test overrides the provider directly (no `.value` scaffolding).
6. Record the feature as migrated in the migration note.

Riverpod's own legacy `ChangeNotifierProvider` bridge exists but is deprecated — use it only as a temporary scaffold inside a single migration PR, never as an endpoint.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Provider is fine, it still works" | It works, and that is the only argument for it. It gets no new features, has no compile-time safety against a missing provider, and every new hire will ask why the codebase has two paradigms. Maintain it; do not extend it. |
| "`context.watch` everywhere is OK, Flutter is fast" | `watch` at the top of a screen rebuilds the entire subtree on every `notifyListeners()`. On a list screen that is a frame-budget bug, not a style opinion. Use `select` / `Consumer` to scope it. |
| "We'll migrate to Riverpod later" | "Later" never arrives as a dedicated sprint. Migration only happens as a per-feature tax paid while you are already editing that feature. Convert the screen you are touching, today. |
| "I'll just add the provider at `MaterialApp` so it's always found" | A root-scoped notifier never disposes and keeps stale state across logout/login. Scope the provider to the route that owns it. |
| "The model is small, immutable state is overkill" | A mutable notifier means any listener can observe a half-applied mutation between field writes. That is exactly the class of bug that immutable state plus one `state =` assignment removes. |
| "We already have Provider, I'll just use it for this new screen too" | Adding a Provider node to a new feature is a regression, not maintenance. The root `ProviderScope` is already there — build the new screen on Riverpod. |

## Red Flags

- `context.watch<T>()` or `Provider.of<T>(context)` (listening) inside `onPressed`, `initState`, or any callback — rebuild storm or `ProviderNotFoundException`.
- A `ChangeNotifier` owning a `StreamSubscription`, `Timer`, `AnimationController`, or `TextEditingController` with no `dispose()` override.
- `ProviderNotFoundException` at runtime — the provider is not an ancestor of the reading `BuildContext` (commonly: reading in the same `build()` that creates it, or reading above a `Navigator` push).
- Provider being introduced into a **new** feature or a new module — that is a regression, not maintenance.
- A mutation path that changes a field and never calls `notifyListeners()` — the UI silently keeps the old value.
- `ChangeNotifierProvider.value(value: MyModel())` — constructing inline with `.value` leaks, because `.value` never disposes.
- `notifyListeners()` called after `dispose()` (typically from an async callback) — throws `FlutterError: A CartModel was used after being disposed`.
- Getters that return the mutable `List`/`Map` field directly instead of an unmodifiable view.
- `MultiProvider` ordering that requires a provider to read one declared below it.
- A migration note that claims a feature was converted but its `ChangeNotifier` file and `MultiProvider` entry still exist.
- A `ProxyProvider.family` / parameterized factory written as a fresh `ChangeNotifier` per id with no `dispose` — the migration target is `NotifierProvider.family`, not more manual factories.

## Verification

- [ ] Every `ChangeNotifier` that owns a subscription, timer, or controller overrides `dispose()` and calls `super.dispose()` last.
- [ ] `context.read` is used in every callback / `initState`; `context.watch` or `context.select` appears only inside `build()`.
- [ ] Large screens use `Consumer` / `Selector` to scope rebuilds instead of one top-level `watch`.
- [ ] Every mutating method ends in `notifyListeners()`; verified by a unit test that counts notifications.
- [ ] Providers are scoped to the route/feature that owns them, not blanket-registered at `MaterialApp`.
- [ ] `ChangeNotifierProvider.value` is used only with an externally-owned instance (tests, pre-built objects).
- [ ] No new feature code was added on Provider; anything new is on Riverpod.
- [ ] The touched feature has a documented migration note (converted, or explicitly deferred with a reason).
- [ ] Converted features show no residual `MultiProvider` entry or `ChangeNotifier` file; reads go through `ref.watch` / `ref.read`.
- [ ] `flutter analyze` is clean and `flutter test` passes.
