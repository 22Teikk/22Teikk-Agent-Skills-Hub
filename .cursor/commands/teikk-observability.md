# Add logging, crash reporting, analytics, and performance traces

Read and follow `skills/observability-and-instrumentation/SKILL.md`.

Use when instrumenting a feature or setting up project telemetry. For security rules on PII in logs, also read `skills/security-and-hardening/SKILL.md`.

Typical deliverables:
- Timber planted (`DebugTree` debug / `ReleaseLoggingTree` release)
- Crashlytics non-fatals with custom keys
- Analytics events with bounded cardinality
- Firebase Performance traces on critical paths

Verify: no raw `Log.d`, no PII in logs, release build strips debug timber.
