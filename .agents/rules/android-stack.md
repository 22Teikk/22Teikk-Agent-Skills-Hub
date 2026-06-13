# Android Stack Defaults

Apply when working on Kotlin/Java Android projects unless SPEC.md or the user overrides.

## Architecture

- MVVM + Clean Architecture: `ui` → `domain` → `data`
- ViewModels: `@HiltViewModel` + `@Inject constructor`
- Repositories: interface in domain, `@Inject` impl in data
- Composables stateless; state hoisted to ViewModel `StateFlow`

## Dependency Injection

- Hilt default — no manual instantiation in production code
- `@HiltAndroidApp` on Application class
- Modules: `@Module` + `@InstallIn(SingletonComponent::class)` (or appropriate scope)
- New deps → Version Catalog (`libs.versions.toml`)

## Observability

- Timber — `DebugTree` in debug, custom `ReleaseLoggingTree` in release
- Non-fatals: `FirebaseCrashlytics.recordException` with custom keys
- No `Log.d` / `println` in production code; no PII in logs

## Skills by layer

| Work | Skill |
|------|-------|
| UI (Kotlin/Compose) | `android-ui-kotlin` |
| UI (Java/XML) | `android-ui-java` |
| Data/Coroutines | `android-data-and-concurrency-kotlin` |
| DI/Gradle/CI | `android-di-and-build` |
| Tests | `android-testing-and-benchmark-kotlin` |
| Logging/telemetry | `observability-and-instrumentation` |
