# teikk-agents-skills

Personal engineering skills pack for AI coding agents. Android-first (Kotlin, Compose, Hilt, Timber).

Repository: [22Teikk/22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub)

## Project Structure

Primary targets: **Claude Code**, **Antigravity (IDE + CLI)**, **OpenCode**. Cursor and Gemini CLI are also supported.

```
skills/       → 29 skills (SKILL.md per directory)
agents/       → 9 specialist personas (code-reviewer, test-engineer, security-auditor,
                android-performance-auditor, kotlin-specialist, swift-expert,
                flutter-expert, mobile-app-developer, ui-ux-tester)
hooks/        → Session lifecycle hooks
.claude/      → Slash commands (18)                 [Claude Code]
.agents/      → Rules (6) + workflows (18)          [Antigravity]
commands/     → TOML slash commands (18)            [OpenCode / Antigravity CLI]
.cursor/      → Rules (6) + commands (18)           [Cursor]
.gemini/      → TOML commands (18)                  [Gemini CLI]
references/   → Supplementary checklists
docs/         → Setup guides per IDE
```

## Skills by Phase

**Define:** interview-me, idea-refine, spec-driven-development
**Plan:** planning-and-task-breakdown
**Build:** incremental-implementation, test-driven-development, context-engineering, source-driven-development, doubt-driven-development, android-ui-kotlin, android-ui-java, android-data-and-concurrency-kotlin, android-data-and-concurrency-java, android-di-and-build, api-and-interface-design, observability-and-instrumentation
**Verify:** android-testing-and-benchmark-kotlin, android-testing-and-benchmark-java, android-e2e-maestro, debugging-and-error-recovery
**Review:** code-review-and-quality, code-simplification, security-and-hardening
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, shipping-and-launch

## Commands

18 slash commands — see README.md for workflow guide.

Key lifecycle: `/teikk-spec` → `/teikk-planning` → `/teikk-build` → `/teikk-review` → `/teikk-ship`

Foundation setup: `/teikk-android-setup` + `/teikk-observability` (also Phase 0 in plans)

E2E (opt-in): `/teikk-e2e` — Maestro YAML + `maestro test` verify. SPEC: `E2E: none` | `E2E: Maestro`.

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
