---
name: flutter-error-handling
description: Handles errors in Flutter apps. Use when wiring global error handlers (FlutterError.onError, PlatformDispatcher.onError, runZonedGuarded), designing Result types with sealed classes, or deciding try/catch vs Result for repository and domain layers.
version: 1.0.0
platform: flutter
depends-on:
  - flutter-data-and-concurrency
  - flutter-ui
---

# Flutter Error Handling

## Overview

Handle Flutter errors across **three surfaces**: framework errors (`FlutterError.onError`), async/plugin errors (`PlatformDispatcher.instance.onError`), and a zone catch-all (`runZonedGuarded`). Model expected failures as **sealed-class Result types** in repository/domain layers for compile-time exhaustive handling; reserve try/catch for simple one-off operations. Always keep `FlutterError.presentError` so framework errors still reach the logs.

## When to Use

- Use when setting up global error handling in `main()` (crash reporting, logging).
- Use when designing repository/service APIs that can fail.
- Use when deciding between exceptions, sealed Result types, or records for a data flow.
- Use when adding a user-facing error widget for build-phase failures.
- Do NOT use for Android/Kotlin error handling (use `android-data-and-concurrency-kotlin`) or Java.

## Core Process

### 1. Wire the Three Global Surfaces in main()
- **`FlutterError.onError`**: errors caught by the framework (build, layout, paint, framework callbacks). Always call `FlutterError.presentError(details)` so logs are preserved.
- **`PlatformDispatcher.instance.onError`**: errors NOT caught by Flutter (async `onPressed`, plugin calls, `MethodChannel.invokeMethod`). **Must `return true`** to suppress the default crash behavior.
- **`runZonedGuarded`**: zone-level catch-all for async errors that escape both channels — the standard wiring for crash-reporting services (Sentry, Crashlytics).

Logging flows through the pack default Talker: call `talker.error(e, st, 'context')` inside `FlutterError.onError`, `PlatformDispatcher.instance.onError`, and the `runZonedGuarded` handler **before** forwarding to Sentry/Crashlytics — Talker supplements crash reporting, it does not replace it.

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await myErrorsHandler.initialize();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    myErrorsHandler.onErrorDetails(details);
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    myErrorsHandler.onError(error, stack);
    return true; // suppress default crash behavior
  };

  runZonedGuarded(
    () => runApp(const MyApp()),
    (error, stack) => myErrorsHandler.onError(error, stack),
  );
}
```

### 2. User-Facing Error Widget (Build-Phase Fallback)
- Customize `ErrorWidget.builder` for build-phase failures (debug shows red error UI by default, release shows gray).
- Prefer handling expected errors in state instead — the error widget is the last-resort fallback.

```dart
MaterialApp(
  builder: (context, child) => child!,
  ...
);
// Optional: override ErrorWidget.builder for release
ErrorWidget.builder = (details) => const CustomErrorScreen();
```

### 3. Result Types with Sealed Classes (Default for Repositories/Domain)
- Dart 3 sealed classes + exhaustive switch make failures **explicit in signatures** and force handling at compile time.
- Prefer over throwing exceptions in repository/service APIs — exceptions are invisible in signatures and easy to forget.
- `fpdart`/`dartz` `Either`/`TaskEither` are the functional-programming alternative; adopt only when the team already uses that style.

```dart
sealed class Result<T> {}

class Success<T> extends Result<T> {
  const Success(this.data);
  final T data;
}

class Failure<T> extends Result<T> {
  const Failure(this.error);
  final AppError error;
}

// Repository API
Future<Result<List<Task>>> getTasks();

// Call site — compiler enforces both cases
final result = await repo.getTasks();
switch (result) {
  case Success(:final data):
    return data;
  case Failure(:final error):
    throw UserFacingException(error.message);
}
```

### 4. When try/catch Still Wins
- Use plain try/catch for simple one-off operations with uniform handling (e.g., a single decode, a single plugin call).
- Keep exceptions for programmer errors / invariants; Result types for expected, recoverable failures.
- Never use bare `catch (e) {}` — always log or rethrow; null-safety idioms (`?.`, `??`, `!`) belong to data access, not error suppression.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll wrap everything in try/catch" | Exceptions are invisible in signatures — callers don't know a function can fail. Sealed Result types make failure explicit and exhaustive (Dart 3 switch patterns). |
| "fpdart Either is the community standard" | In 2026 the community default is plain sealed classes; fpdart/dartz is the FP niche. The language is even considering first-class `Result<E, T>`. |
| "PlatformDispatcher.onError is enough, skip runZonedGuarded" | They cover different surfaces: `PlatformDispatcher` catches framework-dispatched async errors; `runZonedGuarded` catches everything else escaping the zone. Production setups wire all three. |
| "ErrorWidget.builder will handle build errors" | It only covers build-phase failures and is a last resort — expected failures belong in state (loading/error UI), not in the error widget. |

## Red Flags

- Missing `FlutterError.presentError(details)` inside a custom `FlutterError.onError` (silently swallows framework logs).
- `PlatformDispatcher.instance.onError` not returning `true` (default crash behavior still fires).
- Repository/service methods that `throw` expected failures without a Result type.
- Bare `catch (e) {}` / `catch (_) {}` that logs nothing and swallows errors.
- Sealed `Result` handling via `if (result is Success)` casting instead of exhaustive switch patterns.
- No global error wiring in `main()` in a production app.

## Verification

- [ ] `main()` wires `FlutterError.onError` (calls `presentError`), `PlatformDispatcher.instance.onError` (returns true), and `runZonedGuarded`.
- [ ] Crash-reporting service receives framework, async, and zone errors.
- [ ] Repository/domain APIs returning expected failures use sealed `Result<T>` with exhaustive switch handling.
- [ ] try/catch blocks log or rethrow; no silent swallows.
- [ ] No `catch (e) {}` empties in new code.
- [ ] `flutter analyze` and `flutter test` pass.
