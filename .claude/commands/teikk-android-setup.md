---
description: Set up Android foundation — Hilt, Gradle, Version Catalog, CI hooks
---

Invoke the teikk-agents-skills:android-di-and-build skill.

Use at project start or when DI/build config is missing. Also read `skills/observability-and-instrumentation/SKILL.md` for Timber/Crashlytics setup in the same foundation pass.

Deliverables:
- `@HiltAndroidApp`, Hilt modules, `@HiltViewModel` pattern
- Version Catalog for all dependencies (no hardcoded versions)
- `./gradlew assembleDebug` + `./gradlew test` pass

After completion, update `.teikk/tasks/plan.md` Phase 0 Foundation checkpoint if a plan exists.
