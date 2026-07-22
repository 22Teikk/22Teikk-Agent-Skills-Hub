# teikk-agents-skills

Personal engineering skills pack for AI coding agents. Android-first (Kotlin, Compose, Hilt, Timber).

Repository: [22Teikk/22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub)

## Project Structure

Primary targets: **Claude Code**, **Antigravity (IDE + CLI)**, **OpenCode**. Cursor and Gemini CLI are also supported.

```
core/skills/  → 22 platform-neutral skills (SKILL.md per dir) — always installed; 1 standalone/opt-in (machine-audit)
core/agents/  → 7 platform-neutral personas (code-reviewer, adversarial-reviewer, test-engineer,
                security-auditor, mobile-app-developer, ui-ux-tester, value-critic)
packs/android/→ 8 Android skills + 2 personas (android-performance-auditor, kotlin-specialist)
packs/ios/    → swift-expert persona   ·   packs/flutter/ → flutter-expert persona
                (install copies core/ + only the pack matching PROJECT.yaml `platform:`, merged flat)
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
**Build:** incremental-implementation, test-driven-development, context-engineering, source-driven-development, doubt-driven-development, android-ui-kotlin, android-ui-java, android-data-and-concurrency-kotlin, android-data-and-concurrency-java, android-di-and-build, api-and-interface-design, observability-and-instrumentation
**Verify (fast, core loop):** android-testing-and-benchmark-kotlin, android-testing-and-benchmark-java, debugging-and-error-recovery
**QA (optional, slow — not the core loop):** android-e2e-maestro, ui-ux-tester persona
**Review:** code-review-and-quality (+ mandatory adversarial-reviewer pass), code-simplification, security-and-hardening
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, shipping-and-launch

## Commands

22 slash commands — see README.md for workflow guide.

Key lifecycle: `/teikk-spec` → `/teikk-planning` → `/teikk-build` → `/teikk-review` → `/teikk-ship`

Foundation setup: `/teikk-android-setup` + `/teikk-observability` (also Phase 0 in plans)

QA (optional, slow — pulled out of the verify loop): `/teikk-qa` runs E2E + UI/UX testing before a release. Also available individually: `/teikk-e2e` (SPEC: `E2E: none` | `Maestro` | `XCUITest` | `integration_test`) and `/teikk-ux-test`. Never run inside `/teikk-build` or `/teikk-test`.

## Conventions

- Every skill lives in `core/skills/<name>/SKILL.md` (platform-neutral) or `packs/{android,ios,flutter}/skills/<name>/SKILL.md` (platform-specific); install merges the selected set flat into your project's `skills/`
- YAML frontmatter with `name` and `description`
- Spec covers nine areas including Architecture and Observability
- Spec's `## Open Questions` is a hard gate — no `- [ ]` (unresolved) line may remain before `/teikk-spec` saves, and `/teikk-planning` re-checks it before breaking the spec into tasks
- Android plans require Phase 0 Foundation before feature slices
- **All Specify-phase output goes under `.teikk/spec/`** (SPEC.md, PROJECT.yaml, QUICKSTART.md, WORKFLOW.md) — commands fall back to the pre-3.1 `.teikk/SPEC.md` root path for older projects
- **`.teikk/DECISIONS.md`** — append-only log of significant, already-implemented decisions (architecture choice, hard-to-reverse trade-off); written only via `/teikk-docs` or the `/teikk-spec` architecture gate, never for routine implementation choices
- **All workflow output goes under `.teikk/`** (spec/, tasks/, DECISIONS.md, maestro/flows/, cache/) — one gitignored dir, no scatter
- **Install is additive** — files are copied directly into the project beside user files (`.claude/commands/` only, never the whole `.claude/`); self-contained, no shared global state, and it never deletes user config

## Boundaries

- Always: Follow skill workflows; Hilt + Timber defaults for Android; Version Catalog for deps
- Never: Add skills that are vague advice instead of actionable processes
