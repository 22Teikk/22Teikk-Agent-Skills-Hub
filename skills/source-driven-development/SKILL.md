---
name: source-driven-development
description: Grounds every implementation decision in official documentation. Use when you want authoritative, source-cited code free from outdated patterns. Use when building with any Android framework, Jetpack library, or SDK where correctness matters.
---

# Source-Driven Development (Android)

## Overview

Every Android-specific code decision must be backed by official documentation. Don't implement from memory — verify, cite, and let the user see your sources. Training data goes stale, Android SDK APIs get deprecated, and Google/Kotlin best practices evolve (e.g. View-based XML to Jetpack Compose, RxJava to Coroutines Flow).

## When to Use

- The user wants code that follows current best practices for a given Jetpack library or SDK version.
- Building boilerplate, custom UI components, database repositories, or network service configurations.
- Implementing features where Android's recommended approach matters (State management, Compose navigation, Activity Results, Dependency Injection, Room migrations).
- Reviewing or improving code that uses framework-specific patterns.
- Any time you are about to write Android API code from memory.

**When NOT to use:**

- Correctness does not depend on a specific version (renaming variables, fixing typos, moving files).
- Pure logic that works the same across all versions (loops, standard collections, math logic).

## The Process

```
DETECT ──→ FETCH ──→ IMPLEMENT ──→ CITE
  │          │           │            │
  ▼          ▼           ▼            ▼
 What       Get the    Follow the   Show your
 stack?     relevant   documented   sources
            docs       patterns
```

### Step 1: Detect Stack and Versions

Read the Android project's build and dependency files to identify exact library versions:

```
libs.versions.toml       → Android Version Catalog (dependencies and plugin versions)
build.gradle.kts         → Kotlin Gradle script (compileSdk, targetSdk, dependencies)
build.gradle             → Groovy Gradle script (compileSdk, targetSdk, dependencies)
settings.gradle.kts      → Gradle repositories and project structure
```

State what you found explicitly:

```
STACK DETECTED:
- Kotlin 1.9.22 (from libs.versions.toml)
- Jetpack Compose 1.6.0 (Compose Compiler version / BOM)
- Hilt 2.50
- Retrofit 2.9.0
→ Fetching official docs for the relevant patterns.
```

If versions are missing or ambiguous, **ask the user**. Don't guess — the version determines which patterns and APIs are correct.

### Step 2: Fetch Official Documentation

Fetch the specific documentation page for the feature you're implementing.

**Source hierarchy (in order of authority):**

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Official Android Guides | developer.android.com/guide, developer.android.com/jetpack |
| 2 | Official API Reference | developer.android.com/reference, kotlinlang.org/api |
| 3 | Android/Kotlin Blogs | android-developers.googleblog.com, blog.jetbrains.com/kotlin |
| 4 | Web/Language Standards | kotlinlang.org/docs |

**Not authoritative — never cite as primary sources:**
- Stack Overflow answers
- Medium posts, tutorials, or dev.to blogs (unless written by official Google/Kotlin developers)
- AI-generated documentation or summaries
- Your own training data (verify it first)

**Be precise with what you fetch:**
```
BAD:  Fetch the developer.android.com homepage
GOOD: Fetch developer.android.com/reference/androidx/activity/result/ActivityResultLauncher

BAD:  Search "android activity results tutorial"
GOOD: Fetch developer.android.com/training/basics/intents/result
```

### Step 3: Implement Following Documented Patterns

Write code that matches what the documentation shows:
- Use the API signatures from the docs, not from memory.
- If the docs show a new way to do something, use the new way.
- If the docs deprecate an API, don't use it (e.g. use `registerForActivityResult` instead of the deprecated `startActivityForResult`).

**When docs conflict with existing project code:**

```
CONFLICT DETECTED:
The existing codebase uses startActivityForResult to pick an image,
but Android Jetpack Activity docs recommend registerForActivityResult / ActivityResultContracts.
(Source: developer.android.com/training/basics/intents/result)

Options:
A) Use the modern Jetpack Activity Results API — consistent with current docs
B) Match existing code (startActivityForResult) — consistent with codebase
→ Which approach do you prefer?
```

Surface the conflict. Don't silently pick one.

### Step 4: Cite Your Sources

Every Android API or Jetpack pattern gets a citation.

**In code comments:**

```kotlin
// Launch Activity for Result using modern Activity Results API
// Source: https://developer.android.com/training/basics/intents/result#launch
val pickContactLauncher = registerForActivityResult(
    ActivityResultContracts.PickContact()
) { contactUri ->
    // Handle the contact URI
}
```

**In conversation:**

```
I'm using registerForActivityResult instead of the deprecated
startActivityForResult / onActivityResult pattern. Jetpack Activity
now decouples the result contract from the Activity class itself.

Source: https://developer.android.com/training/basics/intents/result
"The Activity Result APIs provide a robust, type-safe contract
to register for a result and handle it."
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'm confident about this API" | Confidence is not evidence. Jetpack libraries evolve quickly, deprecating older practices (e.g., Accompanist permissions moving to official Compose). Verify. |
| "Fetching docs wastes tokens" | Hallucinating an API wastes more. The user debugs a compilation or crash error, only to find the class was relocated in a newer library version. |
| "The docs won't have what I need" | If the docs don't cover it, the pattern may not be officially supported or recommended. |
| "This is a simple task, no need to check" | Simple tasks with wrong patterns become copy-paste templates. The user copies your deprecated API calls into ten other components. |

## Red Flags

- Writing Android SDK code without checking the docs for that API version.
- Using "I believe" or "I think" about a library API instead of citing the source.
- Citing Stack Overflow or blog posts instead of official Google/Kotlin documentation.
- Using deprecated APIs because they appear in training data.
- Not reading `libs.versions.toml` or `build.gradle.kts` before implementing.
- Delivering code without source citations for Android-specific decisions.

## Verification

After implementing:

- [ ] Gradle / Version Catalog versions were identified.
- [ ] Official documentation was fetched for Android/Jetpack patterns.
- [ ] All sources are official documentation, not random blog posts or training data.
- [ ] Code follows the patterns shown in the current version's documentation.
- [ ] Non-trivial decisions include source citations with full URLs.
- [ ] No deprecated APIs are used (e.g., checked against compiler warnings / Android Lint).
- [ ] Conflicts between docs and existing code were surfaced to the user.
