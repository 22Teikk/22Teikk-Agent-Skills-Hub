---
name: flutter-di
description: Configures runtime dependency injection in Flutter Dart 3+ projects using get_it (default) with constructor injection, and Riverpod providers as the variant for Riverpod projects. Use when registering services, repositories, or third-party SDKs with GetIt (registerSingleton/registerLazySingleton/registerFactory), wiring setupLocator() in main(), choosing between Riverpod providers and get_it for a dependency, or resetting the service locator in tests.
version: 1.0.0
platform: flutter
depends-on: [flutter-di-and-build, flutter-state-bloc]
  - flutter-di-and-build
  - flutter-state-riverpod
---

# Flutter Runtime Dependency Injection (get_it + Riverpod hybrid)

## Overview

This skill covers **runtime** dependency injection in Flutter: *who constructs an object, when, and how it reaches the code that needs it*. It sits next to `flutter-di-and-build`, which covers the **build** side (pubspec dependency pinning, flavors, `build_runner`, asset bundling, CI). The split: `flutter-di-and-build` configures the toolchain that produces the app; `flutter-di` wires the objects the running app depends on. Both reference the same object graph — a provider or service locator registration consumes the dependencies declared in `pubspec.yaml` — but neither duplicates the other.

The confirmed DI pattern for Flutter is **get_it with constructor injection**:

- **get_it** — the default DI container for this pack: repositories, services, and third-party SDKs registered once and injected through constructors.
- **Riverpod providers** (`Provider`, `NotifierProvider`, `FutureProvider`) — the variant, used only in projects that already use Riverpod for state: for anything that needs reactive state, widget lifecycle, or per-scope disposal.

**Prefer constructor injection for testability.** Service location (`GetIt.instance<Foo>()` reached deep inside a class) is a fallback, not a default: any class that can take its dependencies in its constructor should, so tests construct it directly without a locator at all.

## When to Use

- Use when registering services, repositories, SDKs, or platform wrappers that are used app-wide but hold no reactive state.
- Use when a widget or service needs a dependency injected at runtime rather than fetched by hand.
- Use when wiring `setupLocator()` in `main()` before `runApp()`.
- Use when deciding whether a dependency belongs in a Riverpod provider (reactive/lifecycle) or in get_it (pure service).
- Use when tests need a clean object graph: `getIt.reset()` between test cases, or fake registrations.
- Do NOT use for build configuration (flavors, codegen, pubspec) — see `flutter-di-and-build`.
- Do NOT use for reactive state holders, view models, or anything the UI watches — see `flutter-state-bloc` (the pack default state layer).

## Core Process

### 1. Choose the right container: Riverpod vs get_it

The default is **get_it + constructor injection**; reach for a Riverpod provider only when the project already uses Riverpod for state. Ask two questions before registering anything:

1. **Does the project use Riverpod for state, and does this object need reactive state or widget lifecycle?** A `Notifier` that the UI watches, a `Dio` instance owned per-scope, a database that must close on dispose → **Riverpod provider** (`flutter-state-riverpod`) — only in Riverpod projects; never introduce Riverpod into a non-Riverpod project (avoid mixing two state-management libraries).
2. **Is it a pure, stateless service consumed imperatively?** A `PaymentGateway`, `AnalyticsService`, `ImagePicker` wrapper, a third-party SDK handle → **get_it**.

```dart
// Riverpod: reactive + lifecycle. UI watches it, riverpod_generator owns wiring.
@Riverpod(keepAlive: true)
AppDatabase appDatabase(Ref ref) {
  final db = AppDatabase(_openConnection());
  ref.onDispose(db.close);
  return db;
}

// get_it: pure service, no reactive state. Registered once, injected by constructor.
final locator = GetIt.instance;
locator.registerLazySingleton<AnalyticsService>(() => AnalyticsService());
```

### 2. Set up the locator at app startup

Create one `setupLocator()` function (typically `lib/di/locator.dart`), call it at the top of `main()` **before** `runApp()`. Registration order matters: register dependencies before the services that consume them, or use lazy registrations so order is irrelevant.

```dart
// lib/di/locator.dart
final locator = GetIt.instance;

void setupLocator() {
  // registerLazySingleton: created on first access (default for most services).
  locator.registerLazySingleton<ApiClient>(() => ApiClient(dio: locator<Dio>()));
  locator.registerLazySingleton<AnalyticsService>(() => AnalyticsService());

  // registerSingleton: created eagerly at startup — only for hot-path deps
  // that are always used, or that must exist before first frame.
  locator.registerSingleton<CrashReporter>(CrashReporter());

  // registerFactory: a NEW instance per resolve — stateful short-lived objects.
  locator.registerFactory<Session>(() => Session());
}

// lib/main.dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  setupLocator();
  runApp(const MyApp());
}
```

- `registerLazySingleton` — one instance, created on first access. Default choice; keeps startup fast.
- `registerSingleton` — one instance, created immediately. Use when the object must exist before anything resolves it.
- `registerFactory` — a fresh instance per call. Use for stateful, per-operation objects (a session, a request context).
- `setupLocator()` runs before `runApp()`; if the project uses Riverpod for state, its `ProviderScope` wraps the app in `main()` too — the two coexist: providers watch the object graph, services resolve from the locator.

### 3. Prefer constructor injection over service location

Service location hides dependencies: a class that calls `GetIt.instance<Foo>()` internally is untestable without the full graph registered. Push dependencies through constructors and keep `GetIt.instance` at composition edges — the code that builds the graph, and the widget boundary that needs a locator escape hatch.

```dart
// GOOD — testable: dependencies are explicit parameters.
class CheckoutService {
  CheckoutService({required this.api, required this.analytics});
  final ApiClient api;
  final AnalyticsService analytics;

  Future<void> placeOrder(Order order) async {
    await api.post('/orders', order);
    analytics.track('order_placed');
  }
}

// BAD — hidden dependency: cannot construct in a test without the locator.
class CheckoutService {
  Future<void> placeOrder(Order order) async {
    await GetIt.instance<ApiClient>().post('/orders', order);
    GetIt.instance<AnalyticsService>().track('order_placed');
  }
}
```

Registration then collapses to a thin wiring function:

```dart
locator.registerLazySingleton<CheckoutService>(
  () => CheckoutService(api: locator<ApiClient>(), analytics: locator<AnalyticsService>()),
);
```

### 4. Resolve at the widget boundary, not inside widgets

Widgets should take a resolved service once — via a constructor/parameter (or a provider in Riverpod projects) — rather than calling `GetIt.instance` inside `build`. When get_it is unavoidable at the widget layer, resolve it into the widget's state or pass it down explicitly:

```dart
class OrderScreen extends StatelessWidget {
  OrderScreen({super.key}) : checkout = GetIt.instance<CheckoutService>();
  final CheckoutService checkout;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: () => checkout.placeOrder(Order.empty()),
      child: const Text('Place order'),
    );
  }
}
```

### 5. Reset and override the locator in tests

`getIt.reset()` unregisters everything, so each test starts from a clean graph. Register fakes with the same API, then `pushNewScope()` / `popScope()` when you need to isolate nested registrations without destroying the base set.

```dart
setUp(() {
  getIt.reset(); // or: locator.pushNewScope() to keep a shared base set
  locator.registerLazySingleton<ApiClient>(() => FakeApiClient());
  locator.registerLazySingleton<AnalyticsService>(() => NoopAnalytics());
});

tearDown(() {
  locator.popScope();
});
```

Constructor injection makes most tests locator-free entirely: `CheckoutService(api: fakeApi, analytics: noop)` needs no registration at all.

### 6. Keep get_it out of Riverpod provider internals

A Riverpod provider that reaches into `GetIt.instance` couples the two containers and defeats Riverpod's override mechanism (`ProviderScope(overrides: [...])` in tests). If a provider needs a service, expose the service via a provider and `ref.watch` it:

```dart
// GOOD — provider graph is self-contained and overridable.
final checkoutProvider = Provider<CheckoutService>((ref) {
  return CheckoutService(
    api: ref.watch(apiClientProvider),        // Riverpod-owned
    analytics: ref.watch(analyticsProvider),  // Riverpod-owned
  );
});

// BAD — GetIt inside a provider body bypasses overrides.
final checkoutProvider = Provider<CheckoutService>((ref) {
  return GetIt.instance<CheckoutService>();
});
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just use a `static` field, it's basically DI" | A hand-written global singleton is a locator with none of the guarantees: no registration order, no reset for tests, no factory/lazy distinction. Use get_it or a provider. |
| "get_it is enough, why do I need Riverpod?" | get_it is a service locator, not a reactivity system. The moment a widget must rebuild on state change, you need Riverpod. The hybrid exists precisely because one container can't do both well. |
| "I'll call `GetIt.instance<Foo>()` inside the class — it's only one call" | That one call makes the class untestable in isolation and hides the dependency from every reader. Constructors are free. |
| "registerSingleton for everything, it's faster" | Eager singletons slow startup and can create order-of-initialization crashes (resolving a dependency before it's registered). Lazy is the default for a reason. |
| "I'll register everything in `runApp`" | Registration must happen before any widget resolves — which means before `runApp`. If a first-frame build resolves an unregistered type, you get a runtime `StateError`. |
| "I'll just `getIt.reset()` at the end of my test" | Reset per-test is right, but reset alone leaves the real registrations from a previous test if you forgot to re-register fakes. Reset in `setUp`, register fakes, and prefer constructor injection so most tests skip the locator entirely. |

## Red Flags

- `GetIt.instance` called inside class bodies or provider bodies instead of constructor-injected dependencies.
- A hand-rolled `static final foo = Foo()` singleton pattern used as the primary DI mechanism.
- `registerSingleton` used where `registerLazySingleton` would do — or any registration that resolves another service before it is registered.
- `setupLocator()` called after `runApp()` or not at all.
- A Riverpod provider body that reaches into `GetIt.instance` (bypasses `ProviderScope` overrides).
- `getIt.reset()` missing from test `setUp` — test-order flakiness from a shared graph.
- The same dependency registered both as a Riverpod provider and in get_it — pick one container per dependency.
- get_it used for reactive state that widgets watch — that's `flutter-state-bloc`'s job (the pack default), or `flutter-state-riverpod`'s in Riverpod projects.

## Verification

- [ ] `setupLocator()` is called in `main()` before `runApp()`; `ProviderScope` wraps the widget tree only in Riverpod projects.
- [ ] Every service, repository, and SDK is registered with `registerSingleton` / `registerLazySingleton` / `registerFactory` — never a `static` field or module-scope `final`.
- [ ] Every class that can takes its dependencies via constructor; `GetIt.instance` appears only at composition edges and widget boundaries.
- [ ] No Riverpod provider body calls `GetIt.instance` — provider graphs are fully `ProviderScope`-overridable.
- [ ] Each dependency lives in exactly one container (Riverpod **or** get_it), chosen by the reactive-state rule in Core Process step 1.
- [ ] Tests call `getIt.reset()` (or `pushNewScope()`) in `setUp` and register fakes; constructor-injected classes are tested without a locator.
- [ ] `flutter analyze` reports zero warnings; `flutter test` passes with no order-dependent failures.
- [ ] Nothing here overlaps `flutter-di-and-build`: build toolchain changes (pubspec, flavors, codegen, CI) stay in that skill.
