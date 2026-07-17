---
name: planning-and-task-breakdown
description: Breaks work into ordered tasks. Use when you have a spec or clear requirements and need to break work into implementable tasks. Use when a task feels too large to start, when you need to estimate scope, or when parallel work is possible.
---

# Planning and Task Breakdown

## Overview

Decompose work into small, verifiable tasks with explicit acceptance criteria. Good task breakdown is the difference between an agent that completes work reliably and one that produces a tangled mess. Every task should be small enough to implement, test, and verify in a single focused session.

## When to Use

- You have a spec and need to break it into implementable units
- A task feels too large or vague to start
- Work needs to be parallelized across multiple agents or sessions
- You need to communicate scope to a human
- The implementation order isn't obvious

**When NOT to use:** Single-file changes with obvious scope, or when the spec already contains well-defined tasks.

## The Planning Process

### Step 1: Enter Plan Mode

Before writing any code, operate in read-only mode:

- Read the spec and relevant codebase sections
- Identify existing patterns and conventions
- Map dependencies between components
- Note risks and unknowns

**Do NOT write code during planning.** The output is a plan document, not implementation.

#### Open Questions Gate (hard gate — check before proceeding)

Read the spec's `## Open Questions` section. This is a second checkpoint on top of the one `spec-driven-development` already runs at spec-writing time — specs get edited by hand, or a stale spec from a previous session may not have gone through that gate at all.

- Every line must be `- [x]` (resolved) or `- [~]` (explicitly deferred). If any line is still `- [ ]` (unresolved), **stop planning** and ask the user that question directly in this session, the same one-at-a-time format as `interview-me`/`spec-driven-development` — do not silently assume an answer or skip the item.
- Once the user answers, update the spec's `## Open Questions` line to `- [x] ... → [resolution]` (or `- [~] ... → deferred: [reason]` if they decline to decide) before generating any tasks derived from that decision.
- Only after every line is resolved or explicitly deferred does the plan proceed to Step 2.

This gate exists because a plan built on a silently-skipped open question produces tasks built on a guess — the same failure mode `interview-me` exists to prevent, just one phase later.

### Step 2: Identify the Dependency Graph

Map what depends on what:

```
Database schema
    │
    ├── API models/types
    │       │
    │       ├── API endpoints
    │       │       │
    │       │       └── Frontend API client
    │       │               │
    │       │               └── UI components
    │       │
    │       └── Validation logic
    │
    └── Seed data / migrations
```

Implementation order follows the dependency graph bottom-up: build foundations first.

### Step 3: Slice Vertically

Instead of building all the database, then all the API, then all the UI — build one complete feature path at a time.

**For Android projects, Phase 0 (Foundation) must complete before feature slices.** Derive tasks from the spec's Architecture and Observability sections:

```
Phase 0: Foundation (blocking)
  - Hilt setup (@HiltAndroidApp, modules, Version Catalog)
  - Timber + ReleaseLoggingTree (debug strip in release)
  - Crashlytics init + non-fatal pattern
  - Room/Retrofit modules (if applicable)

Phase 1+: Vertical feature slices
  - Each slice: data + domain + UI + tests
```

Do not start feature UI until Phase 0 passes its checkpoint (build clean, DI graph compiles, Timber planted).

**Bad (horizontal slicing):**
```
Task 1: Build entire database schema
Task 2: Build all API endpoints
Task 3: Build all UI components
Task 4: Connect everything
```

**Good (vertical slicing):**
```
Task 1: User can create an account (schema + API + UI for registration)
Task 2: User can log in (auth schema + API + UI for login)
Task 3: User can create a task (task schema + API + UI for creation)
Task 4: User can view task list (query + API + UI for list view)
```

Each vertical slice delivers working, testable functionality.

### Step 4: Write Tasks

Each task follows this structure:

```markdown
## Task [N]: [Short descriptive title]

**Description:** One paragraph explaining what this task accomplishes.

**Acceptance criteria → behavioral test (each AC names the test that proves it):**
- [ ] [Specific, testable condition] → `FeatureTest.method` — [unit | integration (Room in-memory) | e2e flow]
- [ ] [Specific, testable condition] → `OtherTest.method` — [level]

  A mock-only, boilerplate, or label-only test does NOT satisfy an AC. Data-layer ACs require a real Room in-memory test, not a mocked repository.

**Verification:**
- [ ] Tests pass: `./gradlew test --tests "FeatureTestClass"`
- [ ] Build succeeds: `./gradlew assembleDebug`
- [ ] Manual check: [description of what to verify]

**Dependencies:** [Task numbers this depends on, or "None"]

**Files likely touched:**
- `src/path/to/file.ts`
- `tests/path/to/test.ts`

**Estimated scope:** [Small: 1-2 files | Medium: 3-5 files | Large: 5+ files]
```

### Step 5: Order and Checkpoint

Arrange tasks so that:

1. Dependencies are satisfied (build foundation first)
2. Each task leaves the system in a working state
3. Verification checkpoints occur after every 2-3 tasks
4. High-risk tasks are early (fail fast)

Add explicit checkpoints:

```markdown
## Checkpoint: After Tasks 1-3
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Core user flow works end-to-end
- [ ] Review with human before proceeding
```

### Step 6: Write the Task Index (`.teikk/tasks/todo.md`) — O(1) resume lookup

Long features outlive a single context window. When context is cleared or a new session starts, the agent should never have to re-read the entire `plan.md` to figure out where it left off. `todo.md` exists solely to make that lookup O(1): one small file, one line per task, a single pointer to what's active.

**This is a separate artifact from `plan.md`.** `plan.md` holds the full detail (description, ACs, verification steps, files) — write it once and rarely re-read it in full. `todo.md` holds only status — read it every time a session needs to resume.

**Format (exact — `/teikk-build` parses this mechanically):**

```markdown
# Task Index

**Current task:** Task 3 — in_progress
**Last updated:** 2026-07-17T10:00:00+07:00

## Phase 0: Foundation
- [x] Task 0: DI + build setup
- [x] Task 1: Observability setup

## Phase 1: Core Features
- [x] Task 2: User registration
- [~] Task 3: User login
- [ ] Task 4: Task creation

## Phase 2: Polish
- [ ] Task 5: Task list view
```

**Rules:**
- Task numbers and titles here must match the `## Task N: [title]` headings in `plan.md` exactly — this is the join key that lets a reader jump straight to the right section without scanning the file.
- Three checkbox states only: `[ ]` pending, `[~]` in progress (**at most one at a time**, mirroring the "one in_progress" rule for todo lists in general), `[x]` done.
- The **`Current task:`** line at the top is the single source of truth for "what am I doing right now" — update it every time the `[~]` marker moves. A resuming session reads this one line first, not the checkbox list.
- Phase headings are structural context only (so a reader sees which phase they're in) — they are not parsed, just carried over from the plan.

**Who writes/updates it:**
- `planning-and-task-breakdown` (via `/teikk-planning`) creates it, fully unchecked, right after `plan.md`.
- `incremental-implementation` (via `/teikk-build`) is the only phase that flips checkboxes and moves the `Current task:` pointer — see that skill's "Resuming with the Task Index" section.

This keeps the expensive artifact (`plan.md`) write-once-read-rarely, and the cheap artifact (`todo.md`) read on every resume.

## Task Sizing Guidelines

| Size | Files | Scope | Example |
|------|-------|-------|---------|
| **XS** | 1 | Single function or config change | Add a validation rule |
| **S** | 1-2 | One component or endpoint | Add a new API endpoint |
| **M** | 3-5 | One feature slice | User registration flow |
| **L** | 5-8 | Multi-component feature | Search with filtering and pagination |
| **XL** | 8+ | **Too large — break it down further** | — |

If a task is L or larger, it should be broken into smaller tasks. An agent performs best on S and M tasks.

**When to break a task down further:**
- It would take more than one focused session (roughly 2+ hours of agent work)
- You cannot describe the acceptance criteria in 3 or fewer bullet points
- It touches two or more independent subsystems (e.g., auth and billing)
- You find yourself writing "and" in the task title (a sign it is two tasks)

## Plan Document Template

```markdown
# Implementation Plan: [Feature/Project Name]

## Overview
[One paragraph summary of what we're building]

## Architecture Decisions
- [Key decision 1 and rationale]
- [Key decision 2 and rationale]

## Task List

### Phase 0: Foundation (Android / new projects)
- [ ] Task 0: DI + build (Hilt, Version Catalog) — skill: `android-di-and-build`
- [ ] Task 1: Observability (Timber, Crashlytics) — skill: `observability-and-instrumentation`

### Checkpoint: Foundation
- [ ] Hilt compiler clean, Timber planted, build succeeds

### Phase 1: Core Features
- [ ] Task 3: ...
- [ ] Task 4: ...

### Checkpoint: Core Features
- [ ] End-to-end flow works

### Phase 2: Polish
- [ ] Task 5: ...
- [ ] Task 6: ...

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Ready for review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Med/Low] | [Strategy] |

## Open Questions
- [Question needing human input]
```

Save this to `.teikk/tasks/plan.md`. Immediately after, write `.teikk/tasks/todo.md` per Step 6 above — every task title here must match a `## Task N:` heading in `plan.md`.

## Parallelization Opportunities

When multiple agents or sessions are available:

- **Safe to parallelize:** Independent feature slices, tests for already-implemented features, documentation
- **Must be sequential:** Database migrations, shared state changes, dependency chains
- **Needs coordination:** Features that share an API contract (define the contract first, then parallelize)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll figure it out as I go" | That's how you end up with a tangled mess and rework. 10 minutes of planning saves hours. |
| "The tasks are obvious" | Write them down anyway. Explicit tasks surface hidden dependencies and forgotten edge cases. |
| "Planning is overhead" | Planning is the task. Implementation without a plan is just typing. |
| "I can hold it all in my head" | Context windows are finite. Written plans survive session boundaries and compaction. |

## Red Flags

- Starting implementation without a written task list
- Tasks that say "implement the feature" without acceptance criteria
- No verification steps in the plan
- All tasks are XL-sized
- No checkpoints between tasks
- Dependency order isn't considered
- Planning proceeds while the spec still has an unresolved (`- [ ]`) Open Question
- `todo.md` task titles drift out of sync with `plan.md` `## Task N:` headings (breaks the O(1) lookup — a resuming session can no longer jump straight to the right plan section)
- More than one `[~]` (in progress) marker in `todo.md` at a time

## Verification

Before starting implementation, confirm:

- [ ] The spec's `## Open Questions` has no unresolved (`- [ ]`) lines — every one is `- [x]` or `- [~]`
- [ ] Every task has acceptance criteria
- [ ] Every task has a verification step
- [ ] Task dependencies are identified and ordered correctly
- [ ] No task touches more than ~5 files
- [ ] Checkpoints exist between major phases
- [ ] `.teikk/tasks/todo.md` exists, one line per task, titles matching `plan.md` headings exactly, all unchecked (`[ ]`) except any inherited in-progress state
- [ ] The human has reviewed and approved the plan
