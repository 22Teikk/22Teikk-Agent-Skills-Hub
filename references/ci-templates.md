# CI Templates — Reference Appendix

> **When to use this file.** Read on-demand by the `ci-cd-and-automation` skill when you need a copy-paste-ready pipeline template. The skill itself stays lean (pipeline diagram + feedback-loop narrative + decision rules); this file owns the YAML.
>
> The skill is loaded on every CI touch; this file is loaded only when actually writing/modifying a workflow. Estimated savings: ~5-6 KB tokens per skill load.

---

## Basic CI Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle

      - name: Grant execute permission for gradlew
        run: chmod +x gradlew

      - name: Lint
        run: ./gradlew lint

      - name: Test
        run: ./gradlew test

      - name: Build
        run: ./gradlew assembleDebug
```

## With Local Integration Tests

```yaml
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle
      - name: Run Integration Tests
        run: ./gradlew testDebugUnitTest --tests "*IntegrationTest"
```

> **Note:** Even for CI-only test databases, use GitHub Secrets for credentials rather than hardcoding values. This builds good habits and prevents accidental reuse of test credentials in other contexts.

## E2E Tests

```yaml
  ui-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Run instrumentation tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 29
          script: ./gradlew connectedDebugAndroidTest
```

## Preview Deployments (Firebase App Distribution)

Deploy debug build to Firebase App Distribution on PR:

```yaml
deploy-preview:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v4
    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
        cache: gradle
    - name: Assemble Debug APK
      run: ./gradlew assembleDebug
    - name: Upload to Firebase App Distribution
      uses: wzieba/Firebase-App-Distribution@v1
      with:
        appId: ${{ secrets.FIREBASE_APP_ID }}
        token: ${{ secrets.FIREBASE_CLI_TOKEN }}
        groups: qa-testers
        file: app/build/outputs/apk/debug/app-debug.apk
```

## Rollback Workflow

```yaml
name: Rollback
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Rollback deployment
        run: |
          # Deploy the specified previous version
          npx vercel rollback ${{ inputs.version }}
```

## Dependabot / Renovate (`.github/dependabot.yml`)

```yaml
version: 2
updates:
  - package-ecosystem: gradle
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

## Caching + Parallelism

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with: { java-version: '17', distribution: 'temurin', cache: 'gradle' }
      - run: ./gradlew lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with: { java-version: '17', distribution: 'temurin', cache: 'gradle' }
      - run: ./gradlew test
```

## Feature Flag Pattern (Kotlin Remote Config)

```kotlin
// Simple Remote Config feature flag pattern
if (remoteConfig.getBoolean("new_checkout_flow")) {
    launchNewCheckoutFlow()
} else {
    launchLegacyCheckoutFlow()
}
```

---

## Adaptation notes

- All Android-flavored examples use Gradle; for iOS adjust to `xcodebuild` / `fastlane` and for Flutter to `flutter test` / `flutter build apk`.
- `actions/setup-java@v4` → `actions/setup-node@v4` for web stacks.
- Pin third-party actions to a major version (`@v4`, not `@main`) for supply-chain safety.
- The skill's `## CI Optimization` section still owns the *strategies* (cache, parallel, path-filter, matrix); this file owns the *templates*.
