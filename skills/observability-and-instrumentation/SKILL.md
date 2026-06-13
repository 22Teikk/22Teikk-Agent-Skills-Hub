---
name: observability-and-instrumentation
description: Instruments Android application code so that runtime behavior, crashes, and performance issues are visible and diagnosable. Use when adding logging, analytics events, custom Crashlytics keys, or performance traces.
---

# Observability and Instrumentation (Android)

## Overview

Guidelines for instrumenting Android applications. Since mobile apps run on thousands of fragmented user devices offline or under unstable networks, having robust telemetry (logs, analytics, crash reports, and performance metrics) is the only way to diagnose bugs, performance regressions, and user friction remotely.

## When to Use

- Building any user-facing screen or feature in Android.
- Implementing network calls, offline storage operations, database queries, or background workers (WorkManager).
- Adding error handling or catching exceptions.
- Setting up user analytics and conversion funnels.
- Diagnosing user-reported issues from the field.

**NOT for:**
- CPU/Memory profiling during local development — use the `android-performance-auditor` agent with local profiling tools (Profiler, Macrobenchmark).
- Launch-day Play Store checklist and rollout rules — see `skills/shipping-and-launch/SKILL.md`.

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

## See Also

- For security rules regarding logging sensitive data, see `skills/security-and-hardening/SKILL.md`.
- For performance and benchmarking metrics, see `references/performance-checklist.md`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll add analytics events later" | If you add them later, you'll have no baseline data to verify whether a new release improved or degraded user behavior. |
| "I'll just log the exception message" | An exception message without custom keys (such as screen state, network type, or feature flag state) is rarely enough to reproduce a bug. |
| "Let's log the full network response body" | Logging full responses will leak PII (passwords, emails, address info) into your Crashlytics/Logging servers, violating privacy policies. |

## Red Flags

- Hardcoded `Log.d` or `System.out.println` calls in code.
- Recording exceptions in Crashlytics without setting any custom diagnostic keys.
- Passing dynamic keys or user IDs as analytics parameter keys.
- Not initializing Crashlytics/Analytics in the main Application class.
- Catching exceptions silently (`catch (e: Exception) {}`) without any log or tracking.

## Verification

After instrumenting:

- [ ] Timber logging is configured to strip debug logs in release build configurations.
- [ ] Captured exceptions (`recordException`) include custom keys for diagnostic state.
- [ ] No secrets, passwords, or PII are logged to Logcat or Crashlytics.
- [ ] Custom performance traces are stopped in a `finally` block or handled safely.
- [ ] Firebase DebugView was verified locally to ensure analytics events fire correctly.
