---
description: Start spec-driven development — write a structured specification before writing code
---

Invoke the teikk-agents-skills:spec-driven-development skill.

Begin by understanding what the user wants to build. Ask clarifying questions about:
1. The objective and target users
2. Core features and acceptance criteria
3. **Platform** — Android (Kotlin/Compose), iOS (Swift/SwiftUI), Flutter, or cross-platform? If unsure, invoke `agents/mobile-app-developer.md` to evaluate trade-offs first
4. Tech stack defaults by platform:
   - Android → Kotlin + Compose, Hilt, Room, Timber/Crashlytics
   - iOS → Swift + SwiftUI, SPM, Core Data / SwiftData, os_log + Crashlytics
   - Flutter → Dart + Flutter 3, Riverpod or BLoC, GoRouter, logging plugin
5. Architecture (layers, modules, DI framework)
6. Observability (logging, crash reporting, analytics — define before coding)
7. E2E testing opt-in: `E2E: none` (default) | `E2E: Maestro` (Android) | `E2E: XCUITest` (iOS) | `E2E: integration_test` (Flutter)
8. Boundaries (always do / ask first / never do)

Generate a spec covering all nine core areas from the skill: objective, tech stack, architecture, observability, commands, project structure, code style, testing strategy, and boundaries.

Surface any platform assumptions explicitly and ask the user to confirm or correct before writing the spec.

Save the spec as `.teikk/SPEC.md` (the tool auto-creates and gitignores `.teikk/`) and confirm with the user before proceeding.

After writing `.teikk/SPEC.md`, also write `.teikk/PROJECT.yaml`. Extract the following values from the spec you just wrote:

- `name` — the project or app name from the Objective section
- `platforms` — list derived from Tech Stack (one or more of: android, ios, flutter)
- `domain` — the `Domain:` field from the Objective section (finance | health | auth | generic)
- `ci` — the CI platform used by this project (github-actions | gitlab-ci | bitrise | circle-ci | fastlane | none). If the project has no CI pipeline, use `none` — /teikk-ship will skip CI checks.
- `e2e` — the `E2E:` field from the Testing Strategy section (none | Maestro | XCUITest | integration_test)
- `budgets` block: use platform defaults unless the spec stated explicit values:
  - Android: startup_cold_ms: 2000, memory_mb: 100, jank_frames: 5
  - iOS: startup_cold_ms: 1500, memory_mb: 150, jank_frames: 5
  - Flutter: startup_cold_ms: 2000, memory_mb: 120, jank_frames: 5
  - Generic (no platform match): omit the budgets block

Write the file in this exact YAML structure:

```yaml
name: <extracted>
platforms: [<extracted>]
domain: <extracted>
ci: <extracted>
e2e: <extracted>

budgets:
  startup_cold_ms: <platform default or spec value>
  memory_mb: <platform default or spec value>
  jank_frames: <platform default or spec value>
```

Do not invent values; use `generic` for domain and `none` for ci/e2e when not stated.

Then, check whether `.teikk/QUICKSTART.md` already exists. If it does NOT exist, write it using this fixed template (do not customize it — the content is intentional):

```markdown
# teikk-agents-skills — Quick Start

## Workflow

```
DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP
/teikk-spec  /teikk-planning  /teikk-build  /teikk-test  /teikk-review  /teikk-ship
```

You just ran `/teikk-spec`. Your next command is `/teikk-planning`.

## What is `.teikk/`?

All workflow outputs live here — spec, tasks, ideas, ADRs, E2E flows, hook caches. It is gitignored automatically on install. Do not commit it; do not edit files in it by hand unless instructed.

## What to commit

- Commit `.teikk-agents-skills.json` — this is your install manifest (version, targets, owned files list).
- Do NOT commit `.teikk/` — it is gitignored by the installer.

## MCP servers

`/teikk-qa` requires the `mobile-mcp` MCP server for UI/UX testing on iOS simulators and Android emulators. Install it separately; without it, Stage 2 of `/teikk-qa` cannot take screenshots or drive the device. All other commands work without any MCP server.

## Command reference

| Command | When to use |
|---------|-------------|
| `/teikk-spec` | Start here — write the spec before any code |
| `/teikk-planning` | Break the spec into tasks with acceptance criteria |
| `/teikk-build` | Implement one task (TDD: red → green → commit) |
| `/teikk-test` | Run the full test suite and fix failures |
| `/teikk-review` | Five-axis code review + adversarial pass |
| `/teikk-ship` | Pre-launch checklist — produces a go/no-go verdict |
| `/teikk-qa` | Deep QA with E2E + UI/UX testing (opt-in, slow) |
| `/teikk-docs` | Write or update ADRs and README |
| `/teikk-idea` | Refine a rough concept before speccing it |
```

If `.teikk/QUICKSTART.md` already exists, skip this step silently — do not overwrite it.
