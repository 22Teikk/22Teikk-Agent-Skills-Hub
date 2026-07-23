---
description: Onboard an existing codebase — reverse-engineer the .teikk/spec/ files from the code instead of hand-writing a spec
---

Invoke the teikk-agents-skills:map-code-base skill.

Use this on an EXISTING / legacy codebase adopting this skills pack when there is no `.teikk/spec/SPEC.md` yet. Instead of interviewing you to write a spec forward (that is `/teikk-spec`), this scans the code you already have and reverse-engineers the same artifacts. For a brand-new project with no code, use `/teikk-spec`.

## Scan first (read-only, evidence-first)

Detect platform + stack from build manifests (extend `source-driven-development` detection to all three):
- `build.gradle(.kts)` / `libs.versions.toml` / `settings.gradle.kts` → android (Kotlin/Java, Compose vs XML, min/target SDK, Hilt/Room/Retrofit)
- `Package.swift` / `*.xcodeproj` / `*.xcworkspace` / `Podfile` → ios (Swift/SwiftUI, SPM vs CocoaPods)
- `pubspec.yaml` → flutter (Dart, Riverpod/BLoC, GoRouter)
- none → generic

Also collect: inherited architecture (from source layout — name it, don't menu it), real build/test/lint commands, structure, testing frameworks + locations, observability libraries, CI provider, E2E tooling, domain guess.

## Detect, then confirm

Present an `ASSUMPTIONS I'M MAKING` block from the scan and wait for veto/correction before writing. You inherit what the code committed to; you don't choose it.

## Write under `.teikk/spec/`

Same drop-in artifacts as `/teikk-spec`, plus a project map:
- **SPEC.md** — nine areas from code; Architecture = inherited pattern, named; Traceability Matrix reconstructed from existing tests (AC with no behavioral test = gap → Open Question).
- **PROJECT.yaml** — same schema. `platforms` detected; `budgets`/`logging` = platform defaults (Android 2000/100/5 + timber, iOS 1500/150/5 + oslog, Flutter 2000/120/5 + logger), omit both for generic. `domain`/`ci`/`e2e` derived or `generic`/`none`. `model_tiers` blank. Don't invent values.
- **QUICKSTART.md** + **WORKFLOW.md** — fixed templates, verbatim; skip silently if present.
- **PROJECT-MAP.md** — per-area map of existing code (purpose, key files, pattern) in the `context-engineering` "Project Map" shape.

## Open Questions gate (hard gate — before saving)

Everything the code can't tell you (true domain, intended budgets, an AC with no test, ambiguous architecture) goes in `## Open Questions`. Before finishing, every line must be `- [x] … → [resolution]` (asked and resolved this session) or `- [~] … → deferred: [reason]`. Do NOT leave any `- [ ]` line — ask it directly, one at a time with your best guess attached (the `interview-me` pattern).

## DECISIONS.md — usually skip

A legacy project inherits its architecture (nothing new decided), so do NOT append an architecture entry to `.teikk/DECISIONS.md`. Only record a genuine hard-to-reverse reconstruction judgment as an observation.

Do not modify any source file — read-only over the codebase; only write under `.teikk/spec/`. Never overwrite an existing `SPEC.md`, `QUICKSTART.md`, or `WORKFLOW.md`.
