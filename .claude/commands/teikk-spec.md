---
description: Start spec-driven development — write a structured specification before writing code
---

Invoke the teikk-agents-skills:spec-driven-development skill.

Ask clarifying questions about: objective, target users, core features, acceptance criteria, **platform** (Android/iOS/Flutter), tech stack, architecture, observability, E2E opt-in, boundaries.

**Platform defaults:**
- Android → Kotlin + Compose, Hilt, Room, Timber/Crashlytics
- iOS → Swift + SwiftUI, SPM, Core Data, os_log + Crashlytics
- Flutter → Dart + Flutter 3, Riverpod/BLoC, GoRouter, logging

Generate spec covering: objective, tech stack, architecture, observability, commands, project structure, code style, testing strategy, boundaries.

Surface platform assumptions explicitly. Ask user to confirm before writing.

## Output files

Save to `.teikk/SPEC.md`. Then write three companion files (skip if exist):

**1. `.teikk/PROJECT.yaml`** — Extract from spec:
```yaml
name: <from Objective>
platforms: [android|ios|flutter]
domain: finance|health|auth|generic
ci: github-actions|gitlab-ci|bitrise|circle-ci|fastlane|none
e2e: none|Maestro|XCUITest|integration_test
budgets: {startup_cold_ms, memory_mb, jank_frames}  # platform defaults
```

**2. `.teikk/QUICKSTART.md`** — First-run guide (workflow diagram, what `.teikk/` is, what to commit, MCP setup, command reference).

**3. `.teikk/WORKFLOW.md`** — Decision tree: "Where are you now?" → "What command next?" (one task vs all tasks vs end-to-end modes, troubleshooting, pro tips).

## Tech stack by platform

- **Android Phase 0:** Hilt DI + Version Catalog before features
- **iOS Phase 0:** SPM + SwiftLint + logging before features  
- **Flutter Phase 0:** flavors + state management + logging before features
