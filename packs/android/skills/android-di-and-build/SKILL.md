---
name: android-di-and-build
description: Configures Android dependency injection and build environments. Use when setting up Hilt injection, editing Gradle Kotlin DSL (KTS) build scripts, adding libraries to the Version Catalog, or defining GitHub Actions/Firebase App Distribution workflows.
version: 1.0.0
platform: android
---

# Android Dependency Injection and Build Configuration

## Overview

Standardize the build scripts, dependency management, continuous integration, and distribution processes. Configure type-safe, compile-time checked dependency injection using Hilt, maintain builds via Gradle KTS and Version Catalog, and automate testing/deployment using GitHub Actions and Firebase App Distribution.

## When to Use

- Use when configuring or modifying Dependency Injection (Hilt) bindings, modules, scopes, or entry points.
- Use when adding, updating, or removing dependencies in the Version Catalog (`libs.versions.toml`).
- Use when configuring Gradle build scripts (`build.gradle.kts` files).
- Use when setting up or modifying GitHub Actions CI/CD workflows for Android.
- Use when configuring automated APK/AAB distribution via Firebase App Distribution.

## Core Process

### 1. Dependency Injection with Hilt
- **Application Class**: Must be annotated with `@HiltAndroidApp`.
- **Activities & Fragments**: Must be annotated with `@AndroidEntryPoint`.
- **Hilt Modules**: Use `@Module` and specify the scope with `@InstallIn` (e.g. `SingletonComponent::class`, `ActivityComponent::class`).
- **Injecting ViewModels**: Use `@HiltViewModel` on ViewModels and `@Inject constructor` for parameters.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BODY))
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://api.example.com/")
            .client(okHttpClient)
            .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
            .build()
    }
}
```

### 2. Dependency Management with Version Catalog
- Define all plugins and library dependencies inside `gradle/libs.versions.toml`.

```toml
# gradle/libs.versions.toml
[versions]
ktx = "1.12.0"
hilt = "2.50"
retrofit = "2.9.0"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "ktx" }
hilt-android = { group = "com.google.dagger.hilt", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger.hilt", name = "hilt-compiler", version.ref = "hilt" }
retrofit-core = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }

[plugins]
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```

- Consume dependencies in `app/build.gradle.kts`:

```kotlin
// app/build.gradle.kts
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.hilt)
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
    implementation(libs.retrofit.core)
}
```

### 3. CI/CD with GitHub Actions
- Define build and test workflows in `.github/workflows/android.yml`.

```yaml
name: Android CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
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
      - name: Lint and Test
        run: ./gradlew lint test
      - name: Build Debug APK
        run: ./gradlew assembleDebug
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just add the dependency directly in build.gradle.kts without the Version Catalog" | Doing this causes version mismatch, drifts across modules, and breaks centralized version control. Centralize everything in `libs.versions.toml`. |
| "Hilt Modules are unnecessary boilerplate, I'll just instantiate class dependencies manually" | Manual instantiation makes unit-testing difficult, creates tight coupling, and loses Hilt's scoping advantages. |
| "Signing credentials are fine in build.gradle.kts since it's a private repo" | Private repositories can be compromised or leaked. Keystore aliases and passwords must always be loaded dynamically from `local.properties` or environment variables. |

## Red Flags

- Hardcoded library version strings in any `build.gradle.kts` files (not using version catalogs).
- Activities or Fragments missing `@AndroidEntryPoint` while attempting to inject dependencies.
- Committing `local.properties` or release `.keystore` / `.jks` files to git.
- Mixing annotation processors (e.g. using both `kapt` and `ksp` for the same library redundantly).
- Hardcoded release build keys and aliases inside the `android.signingConfigs` Gradle block.

## Verification

- [ ] Gradle build runs successfully without warnings or errors: `./gradlew assembleDebug`.
- [ ] Centralized Version Catalog is used for all dependency definitions.
- [ ] Hilt compiler completes with no dependency cycle errors.
- [ ] Signing passwords and paths are loaded from local properties, not committed to git.
- [ ] Continuous Integration (GitHub Actions) runs and compiles the project successfully.
