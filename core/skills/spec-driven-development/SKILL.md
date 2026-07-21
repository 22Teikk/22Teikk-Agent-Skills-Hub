---
name: spec-driven-development
description: Creates specs before coding. Use when starting a new project, feature, or significant change and no specification exists yet. Use when requirements are unclear, ambiguous, or only exist as a vague idea.
version: 1.0.0
platform: generic
depends-on: [documentation-and-adrs]
---

# Spec-Driven Development

## Overview

Write a structured specification before writing any code. The spec is the shared source of truth between you and the human engineer — it defines what we're building, why, and how we'll know it's done. Code without a spec is guessing.

## When to Use

- Starting a new project or feature
- Requirements are ambiguous or incomplete
- The change touches multiple files or modules
- You're about to make an architectural decision
- The task would take more than 30 minutes to implement

**When NOT to use:** Single-line fixes, typo corrections, or changes where requirements are unambiguous and self-contained.

## The Gated Workflow

Spec-driven development has four phases. Do not advance to the next phase until the current one is validated.

```
SPECIFY ──→ PLAN ──→ TASKS ──→ IMPLEMENT
   │          │        │          │
   ▼          ▼        ▼          ▼
 Human      Human    Human      Human
 reviews    reviews  reviews    reviews
```

### Phase 1: Specify

Start with a high-level vision. Ask the human clarifying questions until requirements are concrete.

**Surface assumptions immediately.** Before writing any spec content, list what you're assuming:

```
ASSUMPTIONS I'M MAKING:
1. This is a native Android application (not hybrid/cross-platform)
2. Target SDK is Android 14 (API 34) with minimum SDK 24 (Android 7.0)
3. Programming language is Kotlin using Jetpack Compose (not Java/XML views)
4. Local storage is Room database and EncryptedSharedPreferences
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The spec's entire purpose is to surface misunderstandings *before* code gets written — assumptions are the most dangerous form of misunderstanding.

#### Architecture gate — new projects (do this before Area 3)

Architecture is the one decision that's expensive to reverse once code exists. For a **new project — or any feature with no established architecture to inherit** — do **not** pick a pattern silently. Stop and present the human a short decision menu, then wait for an explicit choice:

- 2–3 viable architectures, each with a one-line trade-off (complexity vs. testability vs. speed-to-ship)
- Your **recommended** option, marked, with *why* it fits this project's size, team, and constraints
- Adapt the options to the platform (Android/iOS/Flutter/web); the example below is Android

```
ARCHITECTURE — pick one before I write the spec:

A. MVVM + Clean Architecture (domain / data / ui layers, use cases)   ← RECOMMENDED
   Why: testable, scales to a multi-screen app, matches the Hilt + Compose defaults.
   Cost: more boilerplate up front (use-case + repository layers).

B. MVVM (ViewModel + Repository, no use-case layer)
   Lighter; good for a small / CRUD app. Can grow into Clean later.

C. MVI (unidirectional state + reducer)
   Best when screens have complex state; steeper learning curve.

→ Reply A / B / C (or describe your own). I will NOT write the Architecture
  section (or any code) until you confirm.
```

Only after the human confirms do you write Area 3. Record **both the chosen option and the rejected alternatives** so the decision is traceable — this feeds the plan's `## Architecture Decisions`, any ADR (`.teikk/adr/`), and a one-line entry in `.teikk/DECISIONS.md` (see `documentation-and-adrs` — this is a significant, hard-to-reverse decision, so it belongs in the log). If the project already has an architecture (existing codebase, project rules, or a parent SPEC), skip the menu and inherit it — but state which one you inherited so the human can veto.

**Write a spec document covering these nine core areas:**

1. **Objective** — What are we building and why? Who is the user? What does success look like? **Declare the `Domain:`** (e.g. finance, health, auth, generic) — this drives the domain guardrails loaded at review/ship time (`references/domain-guardrails.md`). If the app handles a value that must never be silently wrong (money, dose, coordinate, token expiry), naming the domain here is what makes the review catch it.

2. **Tech Stack** — Language, framework, key libraries with versions. For Android: Kotlin vs Java, Compose vs XML, min/target SDK.

3. **Architecture** — Layering (e.g. MVVM + Clean Architecture), module layout, DI approach (Hilt default for Kotlin Android), navigation pattern. **For a new project, this must be the option the human confirmed at the architecture gate above — never one you chose silently.**

4. **Observability** — Logging (Timber release hygiene), crash reporting (Crashlytics), analytics events, performance traces. Define before feature work — not at ship time.

5. **Commands** — Full executable commands with flags, not just tool names.
   ```
   Build: ./gradlew assembleDebug
   Test: ./gradlew test
   Lint: ./gradlew lint
   ```

6. **Project Structure** — Where source code lives, where tests go, where docs belong.
   ```
   app/src/main/  → Application source code
   app/src/test/  → Local unit tests
   app/src/androidTest/ → Instrumentation UI tests
   ```

7. **Code Style** — One real code snippet showing your style beats three paragraphs describing it. Include naming conventions, formatting rules, and examples of good output.

8. **Testing Strategy** — What framework, where tests live, coverage expectations, which test levels for which concerns. **Include a Traceability Matrix:** every acceptance criterion maps to ≥1 *behavioral* test (executes real logic or real infrastructure and asserts a value — not a mock returning the expected value, not a boilerplate template, not a label-only check). An AC with no behavioral test is **not done** — this is a hard gate at `/teikk-ship`, not a soft checklist. There is no "PARTIAL counts as pass".

9. **Boundaries** — Three-tier system:
   - **Always do:** Run tests before commits, follow naming conventions, validate inputs
   - **Ask first:** Database schema changes, adding dependencies, changing CI config
   - **Never do:** Commit secrets, edit vendor directories, remove failing tests without approval

### Output Location

All Specify-phase artifacts (`SPEC.md`, `PROJECT.yaml`, `QUICKSTART.md`, `WORKFLOW.md`) are saved under **`.teikk/spec/`** — a single, dedicated folder for the phase, not scattered loose in `.teikk/`. Other phases keep their own folders/files at the `.teikk/` root (`tasks/`, `DOCTOR.md`, `SHIP-REPORT.md`, `DECISIONS.md`) — those are not spec artifacts and do not move.

**Backward compatibility:** older projects may have `.teikk/SPEC.md` at the `.teikk/` root (pre-folder layout). Every command that reads the spec checks `.teikk/spec/SPEC.md` first and falls back to `.teikk/SPEC.md` if the folder path doesn't exist — no manual migration required. New specs always write to `.teikk/spec/`.

**Spec template:**

```markdown
# Spec: [Project/Feature Name]

## Objective
[What we're building and why. User stories or acceptance criteria.]
Domain: [finance | health | auth | generic — drives references/domain-guardrails.md]

## Tech Stack
[Framework, language, key dependencies with versions]

## Architecture
[Layers, modules, DI (Hilt), navigation, data flow]
[New project: the option the human confirmed at the architecture gate + a one-line note on the alternatives that were rejected and why. Existing project: the inherited architecture, named.]

## Observability
[Timber setup, Crashlytics breadcrumbs/custom keys, analytics events, perf traces — no PII in logs]

## Commands
[Build, test, lint, dev — full commands]

## Project Structure
[Directory layout with descriptions]

## Code Style
[Example snippet + key conventions]

## Testing Strategy
[Framework, test locations, coverage requirements, test levels]
[E2E: none | Maestro — list critical flows and acceptance criteria each flow proves]

### Traceability Matrix (every AC → ≥1 behavioral test)
| Acceptance criterion | Behavioral test (class/method or flow) | Level | Proven? |
|----------------------|----------------------------------------|-------|---------|
| AC1: [...] | `FooDaoTest.insertThenSum` (Room in-memory) | integration | ☐ |
| AC2: [...] | `EditTxnViewModelTest.edit_updatesTotal` | unit | ☐ |
[Mock-only, boilerplate, or label-only entries do NOT satisfy an AC. Unproven AC = NO-GO at ship.]

## Boundaries
- Always: [...]
- Ask first: [...]
- Never: [...]

## Success Criteria
[How we'll know this is done — specific, testable conditions]

## Open Questions
[Anything unresolved that needs human input — format: `- [ ] [question]` while unresolved, `- [x] [question] → [resolution]` once answered, `- [~] [question] → deferred: [reason]` if explicitly deferred]
```

### Open Questions Gate (hard gate — do not skip)

The `## Open Questions` section is not a place to park unresolved items and move on. It is a checklist the agent must clear **in this session**, the same way `interview-me` clears ambiguity before a spec exists — except here it runs *while drafting the spec*, question by question, as items surface.

**Rule:** Do not write the final `.teikk/spec/SPEC.md` (see Output Location below) while any Open Question is unresolved (`- [ ]`). For every unresolved item:

1. Ask it directly to the user, in the session, one at a time — same format as `interview-me`: state the question, attach your best guess, wait for a reaction.
2. On answer, mark it resolved: `- [x] [question] → [resolution]` and fold the resolution into the relevant spec section (Architecture, Testing Strategy, etc. — wherever it belongs).
3. If the user explicitly declines to decide now ("let's figure that out later," "not sure yet, move on"), mark it `- [~] [question] → deferred: [reason]`. A deferred item is allowed to ship in the spec — an unresolved (`- [ ]`) one is not.

**Before saving the spec, verify:** every line in `## Open Questions` is either `- [x]` (resolved) or `- [~]` (explicitly deferred). If any `- [ ]` line remains, you have not finished Phase 1 — keep asking, do not proceed to Phase 2 (Plan).

This gate also re-fires downstream: `planning-and-task-breakdown` re-checks this section before breaking the spec into tasks (see that skill's Verification), because a spec with silently-skipped open questions produces a plan built on guesses.

**Reframe instructions as success criteria.** When receiving vague requirements, translate them into concrete conditions:

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED SUCCESS CRITERIA:
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
- No layout shift during load (CLS < 0.1)
→ Are these the right targets?
```

This lets you loop, retry, and problem-solve toward a clear goal rather than guessing what "faster" means.

### Phase 2: Plan

With the validated spec, generate a technical implementation plan:

1. Identify the major components and their dependencies
2. Determine the implementation order (what must be built first)
3. Note risks and mitigation strategies
4. Identify what can be built in parallel vs. what must be sequential
5. Define verification checkpoints between phases

The plan should be reviewable: the human should be able to read it and say "yes, that's the right approach" or "no, change X."

### Phase 3: Tasks

Break the plan into discrete, implementable tasks:

- Each task should be completable in a single focused session
- Each task has explicit acceptance criteria
- Each task includes a verification step (test, build, manual check)
- Tasks are ordered by dependency, not by perceived importance
- No task should require changing more than ~5 files

**Task template:**
```markdown
- [ ] Task: [Description]
  - Acceptance: [What must be true when done]
  - Verify: [How to confirm — test command, build, manual check]
  - Files: [Which files will be touched]
```

### Phase 4: Implement

Execute tasks one at a time following `skills/incremental-implementation/SKILL.md` (`incremental-implementation`) and `skills/test-driven-development/SKILL.md` (`test-driven-development`). Use `skills/context-engineering/SKILL.md` (`context-engineering`) to load the right spec sections and source files at each step rather than flooding the agent with the entire spec.

## Keeping the Spec Alive

The spec is a living document, not a one-time artifact:

- **Update when decisions change** — If you discover the data model needs to change, update the spec first, then implement.
- **Update when scope changes** — Features added or cut should be reflected in the spec.
- **Commit the spec** — The spec belongs in version control alongside the code.
- **Reference the spec in PRs** — Link back to the spec section that each PR implements.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is simple, I don't need a spec" | Simple tasks don't need *long* specs, but they still need acceptance criteria. A two-line spec is fine. |
| "I'll write the spec after I code it" | That's documentation, not specification. The spec's value is in forcing clarity *before* code. |
| "The spec will slow us down" | A 15-minute spec prevents hours of rework. Waterfall in 15 minutes beats debugging in 15 hours. |
| "Requirements will change anyway" | That's why the spec is a living document. An outdated spec is still better than no spec. |
| "The user knows what they want" | Even clear requests have implicit assumptions. The spec surfaces those assumptions. |

## Red Flags

- Starting to write code without any written requirements
- Asking "should I just start building?" before clarifying what "done" means
- Implementing features not mentioned in any spec or task list
- Making architectural decisions without documenting them
- Picking an architecture for a new project without offering options and getting the human's confirmation
- Skipping the spec because "it's obvious what to build"
- Saving the spec while `## Open Questions` still has an unresolved (`- [ ]`) line

## Verification

Before proceeding to implementation, confirm:

- [ ] The spec covers all nine core areas (including architecture and observability)
- [ ] For a new project: the human explicitly chose the architecture at the gate (not defaulted silently), and rejected alternatives are recorded
- [ ] The `Domain:` is declared, so domain guardrails load at review/ship
- [ ] Every acceptance criterion has ≥1 behavioral test in the Traceability Matrix (no mock-only/boilerplate/label-only entries)
- [ ] **Every `## Open Questions` line is `- [x]` (resolved in-session) or `- [~]` (explicitly deferred) — no `- [ ]` remains**
- [ ] A significant/hard-to-reverse decision (architecture choice, rejected alternatives) was logged to `.teikk/DECISIONS.md`
- [ ] The human has reviewed and approved the spec
- [ ] Success criteria are specific and testable
- [ ] Boundaries (Always/Ask First/Never) are defined
- [ ] The spec is saved to `.teikk/spec/SPEC.md`
