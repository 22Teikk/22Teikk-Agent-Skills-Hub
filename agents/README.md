# Agent Personas

Specialist personas that play a single role with a single perspective. Each persona is a Markdown file consumed as a system prompt by your harness (Claude Code, Cursor, etc.).

| Persona | Role | Best for | Phase |
|---------|------|----------|-------|
| [code-reviewer](code-reviewer.md) | Senior Staff Engineer | Five-axis review before merge | REVIEW |
| [security-auditor](security-auditor.md) | Security Engineer | Vulnerability detection, OWASP-style audit | REVIEW |
| [test-engineer](test-engineer.md) | QA Engineer | Test strategy, coverage analysis, Prove-It pattern | VERIFY |
| [android-performance-auditor](android-performance-auditor.md) | Android Performance Engineer | App Startup, frame jank, memory profiling, benchmarks | VERIFY |
| [kotlin-specialist](kotlin-specialist.md) | Android Kotlin Developer | Compose UI, coroutines/Flow, Hilt DI, Room — Android only | BUILD |
| [swift-expert](swift-expert.md) | iOS Swift Developer | SwiftUI, async/await, Core Data — iOS/macOS only | BUILD |
| [flutter-expert](flutter-expert.md) | Flutter Developer | Cross-platform mobile widgets, Riverpod/BLoC, performance | BUILD |
| [mobile-app-developer](mobile-app-developer.md) | Cross-platform Mobile Architect | Native vs cross-platform decisions, store readiness, shared patterns | DEFINE / SPEC |
| [ui-ux-tester](ui-ux-tester.md) | QA & UX Researcher | Exhaustive flow testing, spacing audits, defect reports | VERIFY |

## How personas relate to skills and commands

Three layers, each with a distinct job:

| Layer | What it is | Example | Composition role |
|-------|-----------|---------|------------------|
| **Skill** | A workflow with steps and exit criteria | `code-review-and-quality` | The *how* — invoked from inside a persona or command |
| **Persona** | A role with a perspective and an output format | `code-reviewer` | The *who* — adopts a viewpoint, produces a report |
| **Command** | A user-facing entry point | `/teikk-review`, `/teikk-ship` | The *when* — composes personas and skills |

The user (or a slash command) is the orchestrator. **Personas do not call other personas.** Skills are mandatory hops inside a persona's workflow.

## When to use each

### Direct persona invocation
Pick this when you want one perspective on the current change and the user is in the loop.

- "Review this PR" → invoke `code-reviewer` directly
- "Are there security issues in `auth.ts`?" → invoke `security-auditor` directly
- "What tests are missing for the checkout flow?" → invoke `test-engineer` directly
- "Audit startup time of the home activity" → invoke `android-performance-auditor` directly
- "Build the settings screen with Compose" → invoke `kotlin-specialist` directly
- "Implement the onboarding flow in SwiftUI" → invoke `swift-expert` directly
- "Fix the recomposition issue in the feed widget" → invoke `flutter-expert` directly
- "Should we go native or Flutter for this feature?" → invoke `mobile-app-developer` directly
- "Test every documented flow and find UI bugs" → invoke `ui-ux-tester` directly

### Slash command (single persona behind it)
Pick this when there's a repeatable workflow you'd otherwise re-explain every time.

- `/teikk-review` → wraps `code-reviewer` with the project's review skill
- `/teikk-test` → wraps `test-engineer` with TDD skill (platform-routed: Android/iOS/Flutter)
- `/teikk-androidperf` → wraps `android-performance-auditor` for Android-specific audits
- `/teikk-ios-setup` → wraps `swift-expert` context for iOS Phase 0 Foundation
- `/teikk-flutter-setup` → wraps `flutter-expert` context for Flutter Phase 0 Foundation
- `/teikk-ux-test` → wraps `ui-ux-tester` for exhaustive flow testing and defect report

### Slash command (orchestrator — fan-out)
Pick this only when **independent** investigations can run in parallel and produce reports that a single agent then merges.

- `/teikk-ship` → fans out to `code-reviewer` + `security-auditor` + `test-engineer` + `ui-ux-tester` in parallel, then synthesizes their reports into a go/no-go decision with store readiness check via `mobile-app-developer`

This is the only orchestration pattern this repo endorses. See [references/orchestration-patterns.md](../references/orchestration-patterns.md) for the full pattern catalog and anti-patterns.

## Decision matrix

```
Is the work a single perspective on a single artifact?
├── Yes → Direct persona invocation
└── No  → Are the sub-tasks independent (no shared mutable state, no ordering)?
         ├── Yes → Slash command with parallel fan-out (e.g. /teikk-ship)
         └── No  → Sequential slash commands run by the user (/teikk-spec → /teikk-planning → /teikk-build → /teikk-test → /teikk-review)
```

## Worked example: valid orchestration

`/teikk-ship` is the canonical fan-out orchestrator in this repo:

```
/teikk-ship
  ├── (parallel) code-reviewer    → review report
  ├── (parallel) security-auditor → audit report
  └── (parallel) test-engineer    → coverage report
                  ↓
        merge phase (main agent)
                  ↓
        go/no-go decision + rollback plan
```

Why this works:
- Each sub-agent operates on the same diff but produces a **different perspective**
- They have no dependencies on each other → genuine parallelism, real wall-clock savings
- Each runs in a fresh context window → main session stays uncluttered
- The merge step is small and benefits from full context, so it stays in the main agent

## Worked example: invalid orchestration (do not build this)

A `meta-orchestrator` persona whose job is "decide which other persona to call":

```
/work-on-pr → meta-orchestrator
                  ↓ (decides "this needs a review")
              code-reviewer
                  ↓ (returns)
              meta-orchestrator (paraphrases result)
                  ↓
              user
```

Why this fails:
- Pure routing layer with no domain value
- Adds two paraphrasing hops → information loss + 2× token cost
- The user already knows they want a review; let them call `/teikk-review` directly
- Replicates work that slash commands and `AGENTS.md` intent-mapping already do

## Rules for personas

1. A persona is a single role with a single output format. If you find yourself adding a second role, create a second persona.
2. **Personas do not invoke other personas.** Composition is the job of slash commands or the user. On Claude Code this is also a hard platform constraint — *"subagents cannot spawn other subagents"* — so the rule is enforced for you.
3. A persona may invoke skills (the *how*).
4. Every persona file ends with a "Composition" block stating where it fits.

## Claude Code interop

The personas in this repo are designed to work as Claude Code subagents and as Agent Teams teammates without modification:

- **As subagents:** auto-discovered when this plugin is enabled (no path config needed). Use the Agent tool with `subagent_type: code-reviewer` (or `security-auditor`, `test-engineer`). `/teikk-ship` is the canonical example.
- **As Agent Teams teammates** (experimental, requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`): reference the same persona name when spawning a teammate. The persona's body is **appended to** the teammate's system prompt as additional instructions (not a replacement), so your persona text sits on top of the team-coordination instructions the lead installs (SendMessage, task-list tools, etc.).

Subagents only report results back to the main agent. Agent Teams let teammates message each other directly. Use subagents when reports are enough; use Agent Teams when sub-agents need to challenge each other's findings (e.g. competing-hypothesis debugging). See [references/orchestration-patterns.md](../references/orchestration-patterns.md) for the full mapping.

Plugin agents do not support `hooks`, `mcpServers`, or `permissionMode` frontmatter — those fields are silently ignored. Avoid relying on them when authoring new personas here.

## Adding a new persona

1. Create `agents/<role>.md` with the same frontmatter format used by existing personas.
2. Define the role, scope, output format, and rules.
3. Add a **Composition** block at the bottom (Invoke directly when / Invoke via / Do not invoke from another persona).
4. Add the persona to the table at the top of this file.
5. If the persona enables a new orchestration pattern, document it in `references/orchestration-patterns.md` rather than inventing the pattern in the persona file itself.
