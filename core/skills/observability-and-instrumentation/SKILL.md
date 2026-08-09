---
name: observability-and-instrumentation
description: Instruments Android and Flutter application code so that runtime behavior, crashes, and performance issues are visible and diagnosable. Use when adding logging, analytics events, custom crash keys, or performance traces.
version: 1.0.0
platform: generic
depends-on: [security-and-hardening, shipping-and-launch]
---

# Observability and Instrumentation (Android + Flutter)

## Overview

Guidelines for instrumenting Android and Flutter applications. Since mobile apps run on thousands of fragmented user devices offline or under unstable networks, having robust telemetry (logs, analytics, crash reports, and performance metrics) is the only way to diagnose bugs, performance regressions, and user friction remotely.

## When to Use

- Building any user-facing screen or feature in Android.
- Implementing network calls, offline storage operations, database queries, or background workers (WorkManager).
- Adding error handling or catching exceptions.
- Setting up user analytics and conversion funnels.
- Diagnosing user-reported issues from the field.

**NOT for:**
- CPU/Memory profiling during local development — use the `android-performance-auditor` agent with local profiling tools (Profiler, Macrobenchmark).
- Launch-day Play Store checklist and rollout rules — see `shipping-and-launch`.

## Inline logging during `/teikk-build` (all platforms)

`/teikk-android-setup`, `/teikk-ios-setup`, and `/teikk-flutter-setup` each plant a logging library and record its name as `logging.library` in `.teikk/spec/PROJECT.yaml` (Android default `timber`; iOS default `oslog`; Flutter default `talker`). `/teikk-build` reads that value and instruments each task's own logging inline as part of GREEN — there is no separate call needed for routine per-task logging. This file's code examples are Android/Timber; apply the same hygiene (strip debug in release, custom keys on captured exceptions, no PII, bounded-cardinality analytics) with the equivalent primitive on iOS (`os_log`/`Logger` or CocoaLumberjack) or Flutter (`talker`/`talker_flutter`).

Use `/teikk-observability` directly only to retrofit logging onto pre-existing code that has none, or for analytics/perf work spanning more than one task's scope — see that command's scope note.

## The Process

### 1. Define "What Matters" Before Instrumenting

Before adding telemetry, define 2–3 questions an engineer will ask when a bug is reported or when analyzing a feature:

```
FEATURE: Checkout Payment Retry
QUESTIONS TO ANSWER:
1. What percentage of payments succeed on the first try vs. after a retry?
2. When a payment fails permanently, is it due to network timeout, API error, or user cancellation?
3. What is the latency of payment processing from the user's perspective?
→ Every analytics event, custom log, and performance trace must help answer these.
```

### 2. Pick the Right Signal

| Signal | Purpose | Tooling (Android) | Example |
|---|---|---|---|
| **Crash Reports & Non-Fatals** | Unhandled crashes and captured errors. | Firebase Crashlytics | `recordException(exception)` |
| **Structured Logs** | Breadcrumbs showing the user path leading to an error. | Timber / Crashlytics custom logs | `FirebaseCrashlytics.log("State updated to...")` |
| **Analytics Events** | Aggregations of user actions and business conversions. | Firebase Analytics / GA | `logEvent("checkout_completed")` |
| **Performance Traces** | Measuring app startup, screen rendering, or network latency. | Firebase Performance Monitoring | Custom `Trace` / OkHttp Interceptor |

---

## Logging Patterns

### 1. Release Logging Hygiene (Timber)

Never print raw logs to standard Logcat in release builds. Use Timber to automatically strip debug logs in release while keeping error logs.

```kotlin
// In your Application class (Initialize Timber)
if (BuildConfig.DEBUG) {
    Timber.plant(Timber.DebugTree())
} else {
    Timber.plant(ReleaseLoggingTree()) // Custom tree that routes warn/error to Crashlytics
}

// In your code
Timber.d("User clicked submit button") // Stripped in release
Timber.e(exception, "Failed to load payment options") // Logged via ReleaseLoggingTree
```

### 2. Crashlytics Breadcrumbs and Custom Keys

When capturing exceptions (non-fatals), attach key-value context (Custom Keys) to make them searchable and diagnosable.

```kotlin
try {
    processPayment()
} catch (e: PaymentException) {
    // GOOD: Attach context before recording exception
    val crashlytics = FirebaseCrashlytics.getInstance()
    crashlytics.setCustomKey("payment_amount", payment.amount)
    crashlytics.setCustomKey("payment_provider", payment.providerName)
    crashlytics.setCustomKey("retry_attempt", payment.retryCount)
    crashlytics.recordException(e)
}
```

*Note: Use Crashlytics `log()` for a sequence of events ("breadcrumbs") leading up to the error. This helps reconstruct the user's flow prior to crashing.*

---

## Analytics Instrumentation

Log user behaviors using structured events with key-value parameters.

```kotlin
// GOOD: Standardized event with parameters
firebaseAnalytics.logEvent("purchase_retry_succeeded") {
    param("item_id", sku)
    param("retry_count", attempt.toLong())
    param("network_type", getNetworkType(context))
}
```

**Cardinality Warning**: Never pass unique, unbounded values (such as user IDs, timestamps, or raw exception stack trace strings) as event parameter keys or values. Group them into discrete categories.

---

## Performance Instrumentation

Track latency and execution times on key network boundaries and operations.

### 1. Custom Performance Traces

Measure how long critical blocks of code take (e.g. database setup, local image processing).

```kotlin
import com.google.firebase.perf.FirebasePerformance

val trace = FirebasePerformance.startTrace("local_db_migration_trace")
try {
    runMigration()
} finally {
    trace.stop()
}
```

### 2. Network Monitoring

OkHttp client should be configured with `FirebasePerformanceInterceptor` to automatically record HTTP network request latencies, payload sizes, and failure rates:

```kotlin
val okHttpClient = OkHttpClient.Builder()
    .addInterceptor(FirebasePerformanceInterceptor())
    .build()
```

---

## Flutter: Talker Instrumentation (the pack default)

Flutter apps in this hub default to `talker` (`logging.library = talker` in `.teikk/spec/PROJECT.yaml`). Talker **supplements — never replaces — the crash reporter**: crashes still go to `firebase_crashlytics` (Sentry also acceptable). Talker adds structured debug logs, Dio/Bloc coverage, and a dev overlay.

### Initialization

```dart
import 'package:talker_flutter/talker_flutter.dart';

// In main(), before runApp:
final talker = TalkerFlutter.init(safeMode: !kDebugMode);
```

`safeMode` hides the Talker overlay UI in release builds. Console logging is controlled via `TalkerConfig` (e.g. `enableConsoleLogs: kDebugMode`, `logLevel`). In release you still want error logs — keep them flowing to the crash reporter (see Crash context below), not the console.

### Log calls

```dart
talker.debug('User clicked submit button'); // stripped in release
talker.info('State updated to checkout_retry');
talker.warning('Payment provider slow to respond');
talker.error(e, st, 'checkout'); // error(Object error, [StackTrace? stackTrace, String? message])
```

### Dio

```dart
import 'package:talker_dio_logger/talker_dio_logger.dart';

dio.interceptors.add(TalkerDioLogger(talker: talker));
```

Request/response/error logging is built in — never log Authorization headers or request/response bodies (they can contain tokens and PII).

### Bloc/Cubit

```dart
import 'package:talker_bloc_logger/talker_bloc_logger.dart';

Bloc.observer = TalkerBlocObserver(talker: talker);
```

Every event, transition, and error flows into Talker automatically.

### Crash context

Before forwarding to Crashlytics/Sentry in `FlutterError.onError` / `PlatformDispatcher.instance.onError`, log via `talker.error(...)` with a short context string (screen, operation, feature flag state). Never log tokens or PII.

### Combined example

```dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final talker = TalkerFlutter.init(safeMode: !kDebugMode);

  Bloc.observer = TalkerBlocObserver(talker: talker);

  final dio = Dio()
    ..interceptors.add(TalkerDioLogger(talker: talker));

  FlutterError.onError = (details) {
    talker.error(details.exception, details.stack, 'flutter-error');
    // forward to FirebaseCrashlytics / Sentry
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    talker.error(error, stack, 'platform-error');
    return true;
  };

  runApp(App(talker: talker, dio: dio));
}
```

---

## See Also

- For security rules regarding logging sensitive data, see `security-and-hardening`.
- For performance and benchmarking metrics, see references/performance-checklist.md.
- For the framework's own telemetry/benchmark scoring model, see references/observability-and-benchmark.md.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll add analytics events later" | If you add them later, you'll have no baseline data to verify whether a new release improved or degraded user behavior. |
| "I'll just log the exception message" | An exception message without custom keys (such as screen state, network type, or feature flag state) is rarely enough to reproduce a bug. |
| "Let's log the full network response body" | Logging full responses will leak PII (passwords, emails, address info) into your Crashlytics/Logging servers, violating privacy policies. |
| "`debugPrint`/`print` in release is fine" | `print` survives into release builds; route through Talker (`safeMode`) so console output is stripped while errors still reach the crash reporter. |
| "Talker UI is only for dev, harmless if left enabled" | in release builds `safeMode: !kDebugMode` must hide the overlay — leaving it enabled leaks internal logs to users. |

## Red Flags

- Hardcoded `Log.d` or `System.out.println` calls in code.
- Recording exceptions in Crashlytics without setting any custom diagnostic keys.
- Passing dynamic keys or user IDs as analytics parameter keys.
- Not initializing Crashlytics/Analytics in the main Application class.
- Catching exceptions silently (`catch (e: Exception) {}`) without any log or tracking.
- `print(...)`/`debugPrint(...)` calls left in release code paths.
- `TalkerFlutter.init()` without `safeMode` in a release build.

## Verification

After instrumenting:

- [ ] Timber logging is configured to strip debug logs in release build configurations.
- [ ] Captured exceptions (`recordException`) include custom keys for diagnostic state.
- [ ] No secrets, passwords, or PII are logged to Logcat or Crashlytics.
- [ ] Custom performance traces are stopped in a `finally` block or handled safely.
- [ ] Firebase DebugView was verified locally to ensure analytics events fire correctly.
- [ ] Talker is initialized with `safeMode: !kDebugMode`; console logging stripped in release, errors still reach the crash reporter.
- [ ] `TalkerDioLogger` attached to the shared `Dio`; no Authorization headers or bodies logged.
- [ ] `Bloc.observer` wired to `TalkerBlocObserver`; no tokens or PII in logged event payloads.
