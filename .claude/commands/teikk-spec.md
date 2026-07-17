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

## Open Questions gate (hard gate — before saving)

Track every unresolved item in the spec's `## Open Questions` section as you draft it. Before saving the final spec, every line must be `- [x] [question] → [resolution]` (asked directly in this session and resolved) or `- [~] [question] → deferred: [reason]` (user explicitly declined to decide now). Do NOT save a spec with any `- [ ]` (unresolved) line — ask it directly, one question at a time with your best guess attached (same pattern as `interview-me`), before proceeding. This is a hard gate, not a suggestion.

## Output files

Save to `.teikk/spec/SPEC.md` (this is a path change from pre-3.1 installs, which wrote `.teikk/SPEC.md` at the root — commands reading the spec check `.teikk/spec/SPEC.md` first and fall back to `.teikk/SPEC.md` for older projects, so no manual migration is required). Then write three companion files in the same folder (skip if exist):

**1. `.teikk/spec/PROJECT.yaml`** — Extract from spec:
```yaml
name: <from Objective>
platforms: [android|ios|flutter]
domain: finance|health|auth|generic
ci: github-actions|gitlab-ci|bitrise|circle-ci|fastlane|none
e2e: none|Maestro|XCUITest|integration_test
budgets: {startup_cold_ms, memory_mb, jank_frames}  # platform defaults
logging: {library}  # timber (Android) | oslog (iOS) | logger (Flutter) — platform default unless spec says otherwise; /teikk-build reads this to instrument logging inline
```

**2. `.teikk/spec/QUICKSTART.md`** — First-run guide (workflow diagram, what `.teikk/` is, what to commit, MCP setup, command reference).

**3. `.teikk/spec/WORKFLOW.md`** — Decision tree: "Where are you now?" → "What command next?" (one task vs all tasks vs end-to-end modes, troubleshooting, pro tips).

## Architecture decision → DECISIONS.md

If the architecture gate ran (new project, or a feature with no inherited architecture), append one entry to `.teikk/DECISIONS.md` recording the chosen architecture and the rejected alternatives (create the file with its header if it doesn't exist yet — format in the teikk-agents-skills:documentation-and-adrs skill). Skip if the project inherited an existing architecture.

## Tech stack by platform

- **Android Phase 0:** Hilt DI + Version Catalog before features
- **iOS Phase 0:** SPM + SwiftLint + logging before features  
- **Flutter Phase 0:** flavors + state management + logging before features
</content>
