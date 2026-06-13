# teikk-agents-skills

Personal engineering skills pack for AI coding agents. Android-first (Kotlin, Compose, Hilt, Timber).

Repository: [22Teikk/22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub)

## Project Structure

```
skills/       → 28 skills (SKILL.md per directory)
agents/       → Specialist personas (code-reviewer, test-engineer, security-auditor, android-performance-auditor)
hooks/        → Session lifecycle hooks
.cursor/      → Rules (4) + commands (14 teikk-*)
.claude/      → Slash commands + hooks
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

15 slash commands — see README.md for workflow guide.

Key lifecycle: `/teikk-spec` → `/teikk-planning` → `/teikk-build` → `/teikk-review` → `/teikk-ship`

Foundation setup: `/teikk-android-setup` + `/teikk-observability` (also Phase 0 in plans)

E2E (opt-in): `/teikk-e2e` — Maestro YAML + `maestro test` verify. SPEC: `E2E: none` | `E2E: Maestro`.

## Conventions

- Every skill lives in `skills/<name>/SKILL.md`
- YAML frontmatter with `name` and `description`
- Spec covers nine areas including Architecture and Observability
- Android plans require Phase 0 Foundation before feature slices

## Boundaries

- Always: Follow skill workflows; Hilt + Timber defaults for Android; Version Catalog for deps
- Never: Add skills that are vague advice instead of actionable processes
