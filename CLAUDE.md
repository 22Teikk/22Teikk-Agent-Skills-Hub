# teikk-agents-skills

Personal engineering skills pack for AI coding agents. Android-first (Kotlin, Compose, Hilt, Timber).

Repository: [22Teikk/22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub)

## Project Structure

Primary targets: **Claude Code**, **Antigravity (IDE + CLI)**, **OpenCode**. Cursor and Gemini CLI are also supported.

```
skills/       → 29 skills (SKILL.md per directory)
agents/       → 10 specialist personas (code-reviewer, adversarial-reviewer, test-engineer,
                security-auditor, android-performance-auditor, kotlin-specialist, swift-expert,
                flutter-expert, mobile-app-developer, ui-ux-tester)
hooks/        → Session lifecycle hooks
.claude/      → Slash commands (19)                 [Claude Code]
.agents/      → Rules (6) + workflows (19)          [Antigravity]
commands/     → TOML slash commands (19)            [OpenCode / Antigravity CLI]
.cursor/      → Rules (6) + commands (19)           [Cursor]
.gemini/      → TOML commands (19)                  [Gemini CLI]
references/   → Supplementary checklists
docs/         → Setup guides per IDE
```

## Skills by Phase

**Define:** interview-me, idea-refine, spec-driven-development
**Plan:** planning-and-task-breakdown
**Build:** incremental-implementation, test-driven-development, context-engineering, source-driven-development, doubt-driven-development, android-ui-kotlin, android-ui-java, android-data-and-concurrency-kotlin, android-data-and-concurrency-java, android-di-and-build, api-and-interface-design, observability-and-instrumentation
**Verify (fast, core loop):** android-testing-and-benchmark-kotlin, android-testing-and-benchmark-java, debugging-and-error-recovery
**QA (optional, slow — not the core loop):** android-e2e-maestro, ui-ux-tester persona
**Review:** code-review-and-quality (+ mandatory adversarial-reviewer pass), code-simplification, security-and-hardening
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, shipping-and-launch

## Commands

19 slash commands — see README.md for workflow guide.

Key lifecycle: `/teikk-spec` → `/teikk-planning` → `/teikk-build` → `/teikk-review` → `/teikk-ship`

Foundation setup: `/teikk-android-setup` + `/teikk-observability` (also Phase 0 in plans)

QA (optional, slow — pulled out of the verify loop): `/teikk-qa` runs E2E + UI/UX testing before a release. Also available individually: `/teikk-e2e` (SPEC: `E2E: none` | `Maestro` | `XCUITest` | `integration_test`) and `/teikk-ux-test`. Never run inside `/teikk-build` or `/teikk-test`.

## Conventions

- Every skill lives in `skills/<name>/SKILL.md`
- YAML frontmatter with `name` and `description`
- Spec covers nine areas including Architecture and Observability
- Android plans require Phase 0 Foundation before feature slices
- **All workflow output goes under `.teikk/`** (SPEC.md, tasks/, spec/, maestro/flows/, cache/) — one gitignored dir, no scatter
- **Install is additive** — symlinks land beside user files (`.claude/commands/` only, never the whole `.claude/`); it never deletes user config

## Boundaries

- Always: Follow skill workflows; Hilt + Timber defaults for Android; Version Catalog for deps
- Never: Add skills that are vague advice instead of actionable processes
