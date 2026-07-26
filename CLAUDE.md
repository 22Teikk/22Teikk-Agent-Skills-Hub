# teikk-agents-skills

Personal engineering skills pack for AI coding agents. Android-first (Kotlin, Compose, Hilt, Timber).

Repository: [22Teikk/22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub)

## Project Structure

Primary targets: **Claude Code**, **Antigravity (IDE + CLI)**, **OpenCode**. Cursor and Gemini CLI are also supported.

```
core/         → Platform-neutral: 22 skills + 7 agents — always installed
                skills live at `core/skills/<name>/SKILL.md`
                agents live at `core/agents/<name>.md`
packs/        → Platform-scoped (post-5.0.0 split) — installed per `.teikk/spec/PROJECT.yaml` `platform:` field
  android/    → 8 skills (ui/data/di/test per Kotlin+Java) + 2 personas (kotlin-specialist, android-performance-auditor)
  ios/        → 4 skills (ui/data/di/test) + 1 persona (swift-expert)
  flutter/    → 4 skills (ui/data/di/test) + 1 persona (flutter-expert)
                Skills at `packs/<platform>/skills/<name>/SKILL.md`
                Total 38 skills (22 core + 16 pack) + 11 personas across packs + core
hooks/        → Session lifecycle hooks
.claude/      → Slash commands (22)                 [Claude Code]
.agents/      → Rules (6) + workflows (22)          [Antigravity]
commands/     → TOML slash commands (22)            [OpenCode / Antigravity CLI]
.cursor/      → Rules (6) + commands (22)           [Cursor]
.gemini/      → TOML commands (22)                  [Gemini CLI]
references/   → Supplementary checklists
docs/         → Setup guides per IDE
```

## Skills by Phase

**Define:** interview-me, idea-refine, spec-driven-development
**Plan:** planning-and-task-breakdown
**Build (platform-neutral core):** incremental-implementation, test-driven-development, context-engineering, source-driven-development, doubt-driven-development, api-and-interface-design, observability-and-instrumentation
**Build (Android, when `platform: android`):** android-ui-kotlin / android-ui-java, android-data-and-concurrency-kotlin / android-data-and-concurrency-java, android-di-and-build
**Build (iOS, when `platform: ios`):** ios-ui, ios-data-and-concurrency, ios-di-and-build, swift-expert persona
**Build (Flutter, when `platform: flutter`):** flutter-ui, flutter-data-and-concurrency, flutter-di-and-build, flutter-expert persona
**Verify (fast, core loop):** debugging-and-error-recovery + the platform unit/widget test skill (android-testing-and-benchmark-{kotlin,java} | ios-testing-and-benchmark | flutter-testing-and-benchmark)
**QA (optional, slow — not the core loop):** android-e2e-maestro (Android only), ui-ux-tester persona
**Review:** code-review-and-quality (+ mandatory adversarial-reviewer pass), code-simplification, security-and-hardening
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, shipping-and-launch

## Commands

22 slash commands — see README.md for workflow guide.

Key lifecycle: `/teikk-spec` → `/teikk-planning` → `/teikk-build` → `/teikk-review` → `/teikk-ship`

Foundation setup: `/teikk-android-setup` | `/teikk-ios-setup` | `/teikk-flutter-setup` + `/teikk-observability` (also Phase 0 in plans, applied per `platform:` field in `.teikk/spec/PROJECT.yaml`)

QA (optional, slow — pulled out of the verify loop): `/teikk-qa` runs E2E + UI/UX testing before a release. Also available individually: `/teikk-e2e` (SPEC: `E2E: none` | `Maestro` | `XCUITest` | `integration_test`) and `/teikk-ux-test`. Never run inside `/teikk-build` or `/teikk-test`.

## Conventions

- Every skill lives in `core/skills/<name>/SKILL.md` (platform-neutral) or `packs/<platform>/skills/<name>/SKILL.md` (platform-scoped); the install layer merges both into a flat `skills/<name>/` in the target project
- YAML frontmatter with `name` and `description`
- Spec covers nine areas including Architecture and Observability
- Spec's `## Open Questions` is a hard gate — no `- [ ]` (unresolved) line may remain before `/teikk-spec` saves, and `/teikk-planning` re-checks it before breaking the spec into tasks. The gate is script-enforced via `bash scripts/check-open-questions.sh` (referenced by `/teikk-build` and `/teikk-planning`); falls back to the manual prose check in the skills if the script is missing (older installs)
- Android plans require Phase 0 Foundation before feature slices
- **All Specify-phase output goes under `.teikk/spec/`** (SPEC.md, PROJECT.yaml, QUICKSTART.md, WORKFLOW.md) — commands fall back to the pre-3.1 `.teikk/SPEC.md` root path for older projects
- **`.teikk/DECISIONS.md`** — append-only log of significant, already-implemented decisions (architecture choice, hard-to-reverse trade-off); written only via `/teikk-docs` or the `/teikk-spec` architecture gate, never for routine implementation choices
- **All workflow output goes under `.teikk/`** (spec/, tasks/, DECISIONS.md, maestro/flows/, cache/) — one gitignored dir, no scatter
- **Install is additive** — files are copied directly into the project beside user files (`.claude/commands/` only, never the whole `.claude/`); self-contained, no shared global state, and it never deletes user config

## Boundaries

- Always: Follow skill workflows; Hilt + Timber defaults for Android; Version Catalog for deps
- Never: Add skills that are vague advice instead of actionable processes
