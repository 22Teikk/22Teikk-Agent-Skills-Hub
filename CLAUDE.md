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
                Total 44 skills (23 core + 21 pack) + 11 personas across packs + core
hooks/        → Session lifecycle hooks
.claude/      → Slash commands (23)                 [Claude Code]
.agents/      → Rules (6) + workflows (23)          [Antigravity]
commands/     → TOML slash commands (23)            [OpenCode / Antigravity CLI]
.cursor/      → Rules (6) + commands (23)           [Cursor]
.gemini/      → TOML commands (23)                  [Gemini CLI]
references/   → Supplementary checklists
docs/         → Setup guides per IDE
```

## Skills by Phase

**Define:** interview-me, idea-refine, spec-driven-development, map-code-base (reverse: existing codebase → spec)
**Plan:** planning-and-task-breakdown
**Build (platform-neutral core):** incremental-implementation, test-driven-development, context-engineering, source-driven-development, doubt-driven-development, api-and-interface-design, observability-and-instrumentation
**Build (Android, when `platform: android`):** android-ui-kotlin / android-ui-java, compose-animations (Compose motion) / xml-animations (View motion), android-data-and-concurrency-kotlin / android-data-and-concurrency-java, android-di-and-build
**Build (iOS, when `platform: ios`):** ios-ui, ios-data-and-concurrency, ios-di-and-build, swift-expert persona
**Build (Flutter, when `platform: flutter`):** flutter-ui, flutter-data-and-concurrency, flutter-di-and-build, flutter-expert persona
**Verify (fast, core loop):** debugging-and-error-recovery + the platform unit/widget test skill (android-testing-and-benchmark-{kotlin,java} | ios-testing-and-benchmark | flutter-testing-and-benchmark)
**QA (optional, slow — not the core loop):** android-e2e-maestro (Android only), ui-ux-tester persona
**Review:** code-review-and-quality (+ mandatory adversarial-reviewer pass), code-simplification, security-and-hardening
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, shipping-and-launch

## Commands

23 slash commands — see README.md for workflow guide.

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

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
