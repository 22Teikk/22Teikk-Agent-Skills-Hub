---
name: shipping-and-launch
description: Prepares production launches. Use when preparing to deploy to Google Play Store or Firebase App Distribution. Use when you need a pre-launch checklist, when setting up mobile monitoring (Crashlytics/Vitals), when planning a staged rollout, or when defining a remote rollback/kill-switch strategy.
---

# Shipping and Launch (Android)

## Overview

Guidelines for shipping Android applications safely. Mobile deployments are unique: once an APK or AAB is downloaded to a user's device, it cannot be instantly recalled. Therefore, launches require rigorous pre-release QA, staged rollouts, and runtime kill-switches (feature flags) to mitigate risks.

## When to Use

- Releasing a new app version to Google Play Store (Production or Testing tracks)
- Deploying a build to Firebase App Distribution for QA / Beta testers
- Enabling a new feature dynamically via Remote Config
- Any release containing database migrations (Room) or structural SDK updates

## The Pre-Launch Checklist

### 1. Code Quality & Build
- [ ] All unit, integration, and Compose/Espresso tests pass locally and in CI.
- [ ] **Every acceptance criterion maps to a behavioral test** (SPEC Traceability Matrix). Mock-only, boilerplate (`ExampleUnitTest`/`ExampleInstrumentedTest`), and label-only tests do **not** count — an AC without a real test is a blocker, not "PARTIAL pass".
- [ ] Boilerplate template tests (`ExampleUnitTest`, `ExampleInstrumentedTest`) are deleted, not counted as coverage.
- [ ] Build succeeds in release mode with no warnings or errors.
- [ ] Proguard/R8 rules are tested to ensure no classes or models are incorrectly stripped.
- [ ] No temporary debugging log statements (`Log.d`, `println`) or mock data in production code.

### 2. Android Security & Permissions
- [ ] Keystore credentials and API keys are not committed to git (stored in `local.properties` or CI secrets).
- [ ] No unnecessary permissions requested in `AndroidManifest.xml`.
- [ ] All exported components (`android:exported="true"`) are protected by appropriate permissions.
- [ ] Releases are signed using the official release key (or Play App Signing).

### 3. Mobile Performance & Database
- [ ] App startup time and frame rendering (jank) verified using Macrobenchmarks.
- [ ] No database operations (Room) or network operations (Retrofit) run on the Main (UI) Thread.
- [ ] Images, videos, and static assets are compressed and optimized.
- [ ] Room database migrations (`Migration` classes) are fully tested (no migration crash).
- [ ] `exportSchema = true` and a `Migration` exists for the shipped version — an app with `exportSchema = false` and no migration path loses user data on the next version bump (**production blocker**).
- [ ] The data layer has ≥1 Room in-memory DAO test (not just mocked repositories). Domain values that must be exact (money) are `Long` minor-units/`BigDecimal`, never `Double` — see `references/domain-guardrails.md`.

### 4. Accessibility
- [ ] Content descriptions are set for all decorative and interactive images in Compose/XML.
- [ ] Touch target sizes are at least 48x48 dp.
- [ ] Support for TalkBack screen reader verified.
- [ ] Contrast ratios and dynamic text scaling (font sizes) adapt correctly.

### 5. Distribution & Release Configuration
- [ ] App version code and version name updated in `build.gradle.kts` (or Version Catalog).
- [ ] Target SDK level is compliant with the latest Google Play policies.
- [ ] Google Play Console store listing, privacy policy, and classification details are updated.

---

## Two-tier ship verdict — demo/portfolio vs production

A build can be good enough to demo and nowhere near safe to ship to real users. Do not emit a single ambiguous "GO" that reads like production approval when the work is only demo-ready. Classify explicitly:

- **GO (production)** — 0 production blockers. Safe for real users and the store.
- **GO (demo / portfolio)** — presentable, but list every **PRODUCTION BLOCKER** that still stands. The reader must not mistake this for production-ready.
- **NO-GO** — a blocker prevents even a safe demo, or a required acceptance criterion is unproven.

**Production blockers** (each forces at most GO-demo, never GO-production) include, non-exhaustively:
- A domain invariant violated — e.g. money stored as `Double`/`Float`, `SUM()` returning `Flow<Double>` (`references/domain-guardrails.md`).
- `exportSchema = false` with no `Migration` path → user data loss on update.
- An acceptance criterion with no behavioral test (mock-only/boilerplate/label-only does not count).
- The data layer with no Room in-memory DAO test.

Even when you grant GO-demo, enumerate these blockers in the decision so the gap to production is explicit and honest.

---

## Feature Flag Strategy (Remote Config)

Use feature flags to decouple APK/AAB deployment from feature activation. If a feature crashes the app, you can disable it instantly without waiting for a Google Play update.

```kotlin
// Remote Config feature flag implementation
class FeatureToggle(private val remoteConfig: FirebaseRemoteConfig) {
    fun isTaskSharingEnabled(): Boolean {
        return remoteConfig.getBoolean("task_sharing_enabled")
    }
}

// In your Compose UI or Fragment
if (featureToggle.isTaskSharingEnabled()) {
    TaskSharingScreen()
} else {
    DefaultTaskScreen()
}
```

### Feature Flag Lifecycle
1. **Deploy with flag OFF** → Feature code is in the APK but inactive.
2. **Enable for internal testers** → Toggle the flag for internal QA users in production.
3. **Staged rollout via flag** → 5% → 25% → 50% → 100% of users in the remote config console.
4. **Monitor metrics** → Watch Firebase Crashlytics and Play Console for regressions.
5. **Clean up code** → Once fully rolled out and stable, remove the flag and dead code paths.

---

## Staged Rollout (Google Play Console)

Never release a new app version to 100% of users at once. Use Play Store's staged rollout feature:

```
[Release to 100% Staging/Internal Track]
    │
    ▼
[Release to 1% - 5% Production Users]
    │  └── Monitor Crashlytics for 24-48 hours
    ▼
[Release to 10% - 20% Production Users]
    │  └── Monitor for ANRs and slow rendering in Play Console Vitals
    ▼
[Release to 50% Production Users]
    │  └── Monitor business and engagement metrics
    ▼
[Full Release to 100% Users]
```

### Rollout Decision Thresholds

| Metric | Advance (green) | Hold / Investigate (yellow) | Halt Rollout (red) |
|--------|-----------------|-----------------------------|--------------------|
| Crash-Free Users | > 99.9% | 99.5% - 99.9% | < 99.5% |
| ANR Rate | < 0.47% (Play threshold)| 0.47% - 1.0% | > 1.0% |
| Slow Rendering | < 2.0% of frames | 2.0% - 5.0% | > 5.0% |
| Custom Exceptions | None reported | Low volume | High spike of critical reports |

---

## Monitoring and Observability (Mobile-Specific)

### What to Monitor
```
Firebase Crashlytics & Play Console:
├── Unhandled crashes (fatal exceptions)
├── ANRs (Application Not Responding)
├── Custom non-fatal exceptions (recorded via Firebase)
├── App Startup Latency (Cold, Warm, Hot)
└── Slow rendering & Frozen frames (jank)
```

### Error and Analytics Reporting

Instrument your app using Firebase Crashlytics to catch bugs before they escalate:

```kotlin
// Record a non-fatal exception with custom diagnostic keys
try {
    performNetworkSync()
} catch (e: Exception) {
    FirebaseCrashlytics.getInstance().apply {
        setCustomKey("sync_type", "periodic")
        setCustomKey("user_tier", user.tier.name)
        recordException(e)
    }
}
```

---

## Rollback Strategy for Mobile

Since you cannot force users to delete the app or downgrade instantly, "rolling back" on mobile consists of:

1. **Remote Kill-Switch (Primary)**: Toggle the feature flag to `false` in the Firebase Console. This takes effect within minutes on user devices.
2. **Halt Play Store Rollout**: If the staged rollout (e.g. at 5%) shows regressions, pause the rollout in the Google Play Console to prevent further downloads.
3. **Emergency Hotfix Release (Secondary)**: Revert the bug commit in git, increment the version code, build a new APK/AAB, and submit it to the Play Store for expedited review.

```markdown
## Rollback Plan for Version [X.Y.Z]

### Trigger Conditions
- Crash-free rate falls below 99.5%
- Crashlytics reports fatal regression in [Feature]
- Play Console reports significant increase in ANRs

### Rollback Steps
1. Turn OFF Remote Config flag `feature_x_enabled` in Firebase.
2. If the update is in a staged rollout, click "Halt Rollout" in Google Play Console.
3. For hard crashes outside feature flags, push hotfix build [X.Y.Z+1] to Play Store.
4. Notify the team and update release notes.
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This change is so small, we can release to 100% immediately" | Small changes can interact with device fragmentation (different OS versions, screen sizes) in unexpected ways. Always stage the rollout. |
| "A crash-free rate of 98% is fine" | An app with a 98% crash-free rate will be heavily downranked in the Play Store. Aim for at least 99.9% crash-free users. |
| "We will add Crashlytics logs in the next version" | A crash without logs or keys is almost impossible to debug on a user's remote device. Instrument before launch. |

## Red Flags

- Friday afternoon production releases (Google Play review queues might take longer, leaving users stuck with bugs over the weekend).
- Committing signing configs (e.g. `keystore.properties`) containing release passwords to git.
- Releasing a Room database schema change without testing migrations or providing a fallback.
- No remote kill-switch configured for major new features.

## Verification

### Before Launching:
- [ ] Staged rollout plan is defined (e.g. starting at 1% or 5%).
- [ ] Remote Config fallback values are verified in the app.
- [ ] Proguard mappings (`mapping.txt`) are generated and uploaded to Crashlytics.
- [ ] Testing track (Internal/Beta) has been verified by QA.

### After Launching:
- [ ] Monitor Firebase Crashlytics Realtime dashboard for the first 2 hours.
- [ ] Check Play Console Android Vitals dashboard for ANRs and rendering issues.
- [ ] Verify that custom events and non-fatal errors are logged correctly.
