# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Antigravity, etc.) when working with code in this repository.

## Repository Overview

A collection of skills for Claude.ai and Claude Code for senior software engineers. Skills are packaged instructions and scripts that extend Claude and your coding agents capabilities.

## OpenCode Integration

OpenCode uses a **skill-driven execution model** powered by the `skill` tool and this repository's `/skills` directory.

### Core Rules

- If a task matches a skill, you MUST invoke it
- Skills are located in `skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly (do not partially apply them)

### Intent → Skill / Persona Mapping

The agent should automatically map user intent to skills and personas.

**Platform routing (read this first).** This framework is platform-agnostic at its core; the mobile-specific rows below are conditional. Before applying any platform-specific mapping, read the `platform:` field from `.teikk/spec/PROJECT.yaml` (falling back to `.teikk/PROJECT.yaml` for pre-3.1 projects):

- `platform: android` → apply only the **Android** rows (Kotlin/Compose/Hilt/Gradle, `kotlin-specialist`, `android-*` skills, `android-performance-auditor`).
- `platform: ios` → apply only the **iOS** rows (`swift-expert`, SwiftUI/SPM/XCTest).
- `platform: flutter` → apply only the **Flutter** rows (`flutter-expert`, Riverpod/BLoC, `integration_test`).
- `platform:` absent, `generic`, or non-mobile (e.g. `backend`, `web`, `cli`, `library`) → apply **only the platform-neutral rows**; skip every mobile-specific skill and persona. Do not assume Android.

The **platform-neutral core always applies regardless of platform**: `interview-me`, `idea-refine`, `spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`, `context-engineering`, `source-driven-development`, `doubt-driven-development`, `api-and-interface-design`, `debugging-and-error-recovery`, `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `documentation-and-adrs`, `deprecation-and-migration`, `observability-and-instrumentation`, and the `code-reviewer` / `adversarial-reviewer` / `security-auditor` / `test-engineer` personas. Rows tagged with a specific platform stack (Android/iOS/Flutter) are applied **only** when `PROJECT.yaml` selects that platform.

**Define**
- Underspecified ask / "interview me" → `interview-me`
- Rough idea needing exploration → `idea-refine`
- New project / feature / significant change → `spec-driven-development`
- Platform selection (native vs cross-platform) → `mobile-app-developer` persona

**Plan**
- Spec exists, need tasks → `planning-and-task-breakdown`
- Android projects: Phase 0 = Hilt + observability before features
- iOS projects: Phase 0 = SPM setup + SwiftLint + logging before features
- Flutter projects: Phase 0 = flavor config + Riverpod/BLoC + logging before features

**Build**
- Implementing code → `incremental-implementation` + `test-driven-development`
- Better context / rules setup → `context-engineering`
- Verify against official docs → `source-driven-development`
- High-stakes / irreversible decisions → `doubt-driven-development`
- API or module boundaries → `api-and-interface-design`
- UI work (Kotlin/Compose) → `android-ui-kotlin` + `kotlin-specialist` persona
- UI work (Java/XML) → `android-ui-java`
- Concurrency & DB (Kotlin) → `android-data-and-concurrency-kotlin`
- Concurrency & DB (Java) → `android-data-and-concurrency-java`
- DI, Gradle, Version Catalog (Android) → `android-di-and-build`
- iOS / SwiftUI feature → `swift-expert` persona
- Flutter feature → `flutter-expert` persona
- Logging, Crashlytics, analytics → `observability-and-instrumentation`
- Cross-platform shared patterns (push, deep link, offline) → `mobile-app-developer` persona

**Verify** (fast — the core TDD loop)
- Tests / TDD → `test-driven-development`
- Android tests (Kotlin) → `android-testing-and-benchmark-kotlin`
- Android tests (Java) → `android-testing-and-benchmark-java`
- iOS unit tests (XCTest) → `swift-expert` persona
- Flutter widget tests → `flutter-expert` persona
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Android performance (startup, jank) → `android-performance-auditor` persona

**QA** (optional, slow — opt-in, pulled out of the verify loop; via `/teikk-qa`)
- E2E journeys — Android (Maestro, opt-in) → `android-e2e-maestro`
- E2E journeys — iOS (XCUITest) → `swift-expert` persona
- E2E journeys — Flutter (integration_test) → `flutter-expert` persona
- UI/UX flow testing, spacing audits → `ui-ux-tester` persona

**Review**
- Code review → `code-review-and-quality` + `code-reviewer` persona, **then the mandatory `adversarial-reviewer` pass** (falsify each AC; verdict = AND of both)
- Domain correctness (finance money type, etc.) → load `references/domain-guardrails.md` from the SPEC `Domain:` field
- SPEC→Test traceability (each AC needs a behavioral test; mock-only/boilerplate = zero) → hard gate at `/teikk-ship`
- Refactoring / simplification → `code-simplification`
- Security → `security-and-hardening` + `security-auditor` persona

**Ship**
- Commits / branching → `git-workflow-and-versioning`
- CI/CD pipelines → `ci-cd-and-automation`
- Documentation / ADRs → `documentation-and-adrs`
- Deprecation / migration → `deprecation-and-migration`
- Store submission readiness (both platforms) → `mobile-app-developer` persona
- Deploy / launch checklist → `shipping-and-launch`

### Lifecycle Mapping (Implicit Commands)

OpenCode does not support slash commands like `/teikk-spec` or `/teikk-planning`.

Instead, the agent must internally follow this lifecycle. **Apply the platform-routing rule from the Intent → Skill mapping above first** — the Phase-0 and BUILD rows tagged with a platform apply only when `.teikk/spec/PROJECT.yaml`'s `platform:` selects it; a `generic`/absent/non-mobile platform runs the DEFINE→SHIP lifecycle with the platform-neutral core only and skips the mobile Phase-0 and mobile BUILD rows entirely:

- **DEFINE** → `interview-me` (if unclear) → `idea-refine` (if exploring) → `mobile-app-developer` persona (**mobile platforms only**, if native-vs-cross-platform choice needed) → `spec-driven-development`
- **PLAN** → `planning-and-task-breakdown`
  - Platform Phase 0 (applies only to the selected mobile platform):
    - Android: Hilt + observability before features
    - iOS: SPM + SwiftLint + logging before features
    - Flutter: flavor config + state management + logging before features
  - Generic/non-mobile: no mandated mobile Phase 0 — establish the project's own foundation (build tooling, DI/config, logging) as the plan's first tasks.
- **BUILD** → `incremental-implementation` + `test-driven-development` + (platform-selected domain skills/personas):
  - Android: `android-ui-kotlin`, `android-data-and-concurrency-kotlin`, `android-di-and-build`, `kotlin-specialist`
  - iOS: `swift-expert`
  - Flutter: `flutter-expert`
  - Shared mobile: `mobile-app-developer`, `observability-and-instrumentation`, `api-and-interface-design`
  - Generic/non-mobile: `observability-and-instrumentation` + `api-and-interface-design` only (no mobile stack skills).
- **VERIFY** (fast, core loop) → `debugging-and-error-recovery`, platform unit/widget test skills (mobile platforms only; generic uses `test-driven-development` alone)
- **QA** (optional, slow — `/teikk-qa`) → `android-e2e-maestro`, E2E via `swift-expert`/`flutter-expert`, `ui-ux-tester` persona for flow/UX testing
- **REVIEW** → `code-review-and-quality`, `code-simplification`, `security-and-hardening`
- **SHIP** → `mobile-app-developer` (store readiness), `observability-and-instrumentation`, `documentation-and-adrs`, `ci-cd-and-automation`, `git-workflow-and-versioning`, `shipping-and-launch`

### Execution Model

For every request:

1. Determine if any skill applies (even 1% chance)
2. Invoke the appropriate skill using the `skill` tool
3. Follow the skill workflow strictly
4. Only proceed to implementation after required steps (spec, plan, etc.) are complete

### Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I’ll gather context first"

Correct behavior:

- Always check for and use skills first

This ensures OpenCode behaves similarly to Claude Code with full workflow enforcement.

## Orchestration: Personas, Skills, and Commands

This repo has three composable layers. They have different jobs and should not be confused:

- **Skills** (`skills/<name>/SKILL.md`) — workflows with steps and exit criteria. The *how*. Mandatory hops when an intent matches.
- **Personas** (`agents/<role>.md`) — roles with a perspective and an output format. The *who*.
- **Slash commands** (`.claude/commands/teikk-*.md`) — user-facing entry points. The *when*. The orchestration layer.

Composition rule: **the user (or a slash command) is the orchestrator. Personas do not invoke other personas.** A persona may invoke skills.

The only multi-persona orchestration pattern this repo endorses is **parallel fan-out with a merge step** — used by `/teikk-ship` to run `code-reviewer`, `adversarial-reviewer`, `security-auditor`, `test-engineer`, and `ui-ux-tester` concurrently and synthesize their reports. The final verdict is the **AND** of the constructive personas and the disconfirming `adversarial-reviewer` (a REFUTED verdict blocks GO). Do not build a "router" persona that decides which other persona to call; that's the job of slash commands and intent mapping.

See [agents/README.md](agents/README.md) for the decision matrix and [references/orchestration-patterns.md](references/orchestration-patterns.md) for the full pattern catalog.

**Claude Code interop:** the personas in `agents/` work as Claude Code subagents (auto-discovered from this plugin's `agents/` directory) and as Agent Teams teammates (referenced by name when spawning). Two platform constraints align with our rules: subagents cannot spawn other subagents, and teams cannot nest. Plugin agents silently ignore the `hooks`, `mcpServers`, and `permissionMode` frontmatter fields.

## Creating a New Skill

### Directory Structure

```
skills/
  {skill-name}/           # kebab-case directory name
    SKILL.md              # Required: skill definition
    scripts/              # Required: executable scripts
      {script-name}.sh    # Bash scripts (preferred)
  {skill-name}.zip        # Required: packaged for distribution
```

### Naming Conventions

- **Skill directory**: `kebab-case` (e.g. `web-quality`)
- **SKILL.md**: Always uppercase, always this exact filename
- **Scripts**: `kebab-case.sh` (e.g., `deploy.sh`, `fetch-logs.sh`)
- **Zip file**: Must match directory name exactly: `{skill-name}.zip`

### SKILL.md Format

```markdown
---
name: {skill-name}
description: {One sentence describing what the skill does, followed by one or more "Use when" trigger conditions. Include trigger phrases like "Deploy my app" or "Check logs" when helpful.}
---

# {Skill Title}

{Brief overview of what the skill does and why it matters.}

## How It Works

{Numbered list explaining the skill's workflow}

Equivalent headings like `Workflow`, `Core Process`, or `When to Use` are fine when they communicate the same structure clearly.

## Usage (Optional)

Include this section only if the skill ships runnable helpers under `scripts/`. Markdown-only skills can omit both the section and the directory entirely.

```bash
bash /mnt/skills/user/{skill-name}/scripts/{script}.sh [args]
```

**Arguments:**
- `arg1` - Description (defaults to X)

**Examples:**
{Show 2-3 common usage patterns}

## Output

{Show example output users will see}

## Present Results to User

{Template for how Claude should format results when presenting to users}

## Troubleshooting

{Common issues and solutions, especially network/permissions errors}
```

### Best Practices for Context Efficiency

Skills are loaded on-demand — only the skill name and description are loaded at startup. The full `SKILL.md` loads into context only when the agent decides the skill is relevant. To minimize context usage:

- **Keep SKILL.md under 500 lines** — put detailed reference material in separate files
- **Write specific descriptions** — helps the agent know exactly when to activate the skill
- **Use progressive disclosure** — reference supporting files that get read only when needed
- **Prefer scripts over inline code** — script execution doesn't consume context (only output does)
- **File references work one level deep** — link directly from SKILL.md to supporting files

### Script Requirements

- Use `#!/bin/bash` shebang
- Use `set -e` for fail-fast behavior
- Write status messages to stderr: `echo "Message" >&2`
- Write machine-readable output (JSON) to stdout
- Include a cleanup trap for temp files
- Reference the script path as `/mnt/skills/user/{skill-name}/scripts/{script}.sh`

### Creating the Zip Package

After creating or updating a skill:

```bash
cd skills
zip -r {skill-name}.zip {skill-name}/
```

### End-User Installation

Document these two installation methods for users:

**Claude Code:**
```bash
cp -r skills/{skill-name} ~/.claude/skills/
```

**claude.ai:**
Add the skill to project knowledge or paste SKILL.md contents into the conversation.

If the skill requires network access, instruct users to add required domains at `claude.ai/settings/capabilities`.
