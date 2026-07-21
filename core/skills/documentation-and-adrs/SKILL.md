---
name: documentation-and-adrs
description: Records decisions and documentation. Use when making architectural decisions, changing public APIs, shipping features, or when you need to record context that future engineers and agents will need to understand the codebase.
version: 1.0.0
platform: generic
---

# Documentation and ADRs

## Overview

Document decisions, not just code. The most valuable documentation captures the *why* — the context, constraints, and trade-offs that led to a decision. Code shows *what* was built; documentation explains *why it was built this way* and *what alternatives were considered*. This context is essential for future humans and agents working in the codebase.

## When to Use

- Making a significant architectural decision
- Choosing between competing approaches
- Adding or changing a public API
- Shipping a feature that changes user-facing behavior
- Onboarding new team members (or agents) to the project
- When you find yourself explaining the same thing repeatedly

**When NOT to use:** Don't document obvious code. Don't add comments that restate what the code already says. Don't write docs for throwaway prototypes.

## Decisions Log (`.teikk/DECISIONS.md`)

Not every important decision rises to a full ADR (context, alternatives, consequences, sequential numbering). `.teikk/DECISIONS.md` is a lightweight, single-file, append-only log of significant decisions that *were* implemented — the running answer to "why is it built this way?" without the overhead of a new file per decision.

### When to Append an Entry

**Only for decisions that are actually significant** — this file loses its value if it becomes a running commentary on every change:

- The architecture chosen at the `spec-driven-development` architecture gate (plus the rejected alternatives)
- A decision that would be expensive or risky to reverse later
- A trade-off the human explicitly chose between two or more real options
- A deviation from the project's established pattern, made deliberately and for a stated reason
- Anything that would otherwise need re-explaining to a future engineer or agent asking "wait, why did we do it this way?"

**Do NOT log:** routine implementation choices, variable naming, minor refactors, anything already fully explained by an existing ADR (link to the ADR instead), or a decision that hasn't actually been implemented yet (this log records what shipped, not what's proposed — proposals belong in the spec's Open Questions or an idea one-pager).

### Who Writes to It

This file is owned by `documentation-and-adrs` (i.e., written via `/teikk-docs`), with one exception: `spec-driven-development` appends an entry directly when the architecture gate resolves (new project, or any feature with no inherited architecture) — because that decision is made and locked in during Specify, before `/teikk-docs` would naturally run, and by the time review/ship happens the reasoning would otherwise be lost to conversation history. No other command auto-writes to it; if a command surfaces a decision worth logging, it should tell the user to run `/teikk-docs` rather than appending silently.

### Querying the Log (`scripts/decisions.js`)

The log stays a hand-authored, append-only markdown file — but it is also **queryable** without changing how it's written. `scripts/decisions.js` parses the documented entry format (`## DATE — Title` + `**Context/Decision/Rejected/Reference:**`) and answers lookups, so "have we already decided this?" is a command, not a full-file re-read:

```bash
node scripts/decisions.js list                 # all decisions (date — title, decision, reference)
node scripts/decisions.js find Room            # entries mentioning "Room" (searches every field)
node scripts/decisions.js count                # how many decisions logged
node scripts/decisions.js find auth --json     # machine-readable output for tooling
node scripts/decisions.js list --file <path>   # point at a non-default DECISIONS.md
```

It looks for `.teikk/DECISIONS.md` then `.teikk/spec/DECISIONS.md` by default. **Before appending a new decision, `find` the topic first** — if a prior decision already covers it, reference that entry instead of logging a duplicate. This is what makes the log a reuse tool (decision lookup) rather than a write-only history.

### Format

Append-only, most-recent entry last (chronological, so it reads as a history):

```markdown
# Decisions Log

Significant, already-implemented decisions. Append-only — do not delete or rewrite past entries.
For the full reasoning behind a decision, see the linked ADR if one exists.

## 2026-07-06 — Chose MVVM + Clean Architecture over MVI
**Context:** New Android project, no inherited architecture.
**Decision:** MVVM + Clean Architecture (domain/data/ui layers, use cases).
**Rejected:** MVI (steeper learning curve for this team size); plain MVVM (wouldn't scale past 5 screens).
**Reference:** ADR-001, .teikk/spec/SPEC.md Architecture section.

## 2026-07-10 — Switched primary local storage from SharedPreferences to Room
**Context:** Needed structured querying for transaction history; SharedPreferences doesn't support it.
**Decision:** Room database, single source of truth for local persistence.
**Rejected:** Keeping SharedPreferences + manual JSON parsing (rejected: no query support, error-prone parsing).
**Reference:** ADR-004.
```

Each entry: one-line dated heading naming the decision, then Context / Decision / Rejected (if alternatives existed) / Reference (link an ADR if one exists — the log entry is a pointer, the ADR is the full reasoning). Keep entries short — 4-6 lines. If a decision needs the full context/consequences treatment, write the ADR first and reference it here, don't duplicate the ADR's content into the log.

## Architecture Decision Records (ADRs)

ADRs capture the reasoning behind significant technical decisions. They're the highest-value documentation you can write.

### When to Write an ADR

- Choosing a framework, library, or major dependency
- Designing a data model or database schema
- Selecting an authentication strategy
- Deciding on an API architecture (REST vs. GraphQL vs. tRPC)
- Choosing between build tools, hosting platforms, or infrastructure
- Any decision that would be expensive to reverse

### ADR Template

Store ADRs in `.teikk/adr/` with sequential numbering:

```markdown
# ADR-001: Use PostgreSQL for primary database

## Status
Accepted | Superseded by ADR-XXX | Deprecated

## Date
2025-01-15

## Context
We need a primary database for the task management application. Key requirements:
- Relational data model (users, tasks, teams with relationships)
- ACID transactions for task state changes
- Support for full-text search on task content
- Managed hosting available (for small team, limited ops capacity)

## Decision
Use PostgreSQL with Prisma ORM.

## Alternatives Considered

### MongoDB
- Pros: Flexible schema, easy to start with
- Cons: Our data is inherently relational; would need to manage relationships manually
- Rejected: Relational data in a document store leads to complex joins or data duplication

### SQLite
- Pros: Zero configuration, embedded, fast for reads
- Cons: Limited concurrent write support, no managed hosting for production
- Rejected: Not suitable for multi-user web application in production

### MySQL
- Pros: Mature, widely supported
- Cons: PostgreSQL has better JSON support, full-text search, and ecosystem tooling
- Rejected: PostgreSQL is the better fit for our feature requirements

## Consequences
- Prisma provides type-safe database access and migration management
- We can use PostgreSQL's full-text search instead of adding Elasticsearch
- Team needs PostgreSQL knowledge (standard skill, low risk)
- Hosting on managed service (Supabase, Neon, or RDS)
```

### ADR Lifecycle

```
PROPOSED → ACCEPTED → (SUPERSEDED or DEPRECATED)
```

- **Don't delete old ADRs.** They capture historical context.
- When a decision changes, write a new ADR that references and supersedes the old one.

## Inline Documentation

### When to Comment

Comment the *why*, not the *what*:

```kotlin
// BAD: Restates the code
// Increment counter by 1
counter += 1

// GOOD: Explains non-obvious intent
// Rate limit uses a sliding window — reset counter at window boundary,
// not on a fixed schedule, to prevent burst attacks at window edges
if (now - windowStart > WINDOW_SIZE_MS) {
  counter = 0
  windowStart = now
}
```

### When NOT to Comment

```kotlin
// Don't comment self-explanatory code
fun calculateTotal(items: List<CartItem>): Double {
  return items.sumOf { it.price * it.quantity }
}

// Don't leave TODO comments for things you should just do now
// TODO: add error handling  ← Just add it

// Don't leave commented-out code
// fun oldImplementation() { ... }  ← Delete it, git has history
```

### Document Known Gotchas

```kotlin
/**
 * IMPORTANT: This function must be called from the Main Thread before Hilt
 * initializes the repository. Calling this late will result in an
 * IllegalStateException because the database reference won't be ready.
 *
 * See ADR-003 for the full design rationale.
 */
fun initializeDatabase(context: Context) {
  // ...
}
```

## API Documentation

For public APIs (REST, library interfaces):

### KDoc for Kotlin (Preferred)

```kotlin
/**
 * Creates a new task.
 *
 * @param title - Task title (required, cannot be empty or exceed 200 characters)
 * @param description - Optional details of the task
 * @return The created [Task] containing database-generated ID and timestamps
 * @throws IllegalArgumentException If title validation fails
 *
 * @example
 * ```kotlin
 * val task = repository.createTask("Buy groceries")
 * println(task.id) // "task_abc123"
 * ```
 */
suspend fun createTask(title: String, description: String? = null): Task {
  // ...
}
```

### OpenAPI / Swagger for REST APIs

```yaml
paths:
  /api/tasks:
    post:
      summary: Create a task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskInput'
      responses:
        '201':
          description: Task created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '422':
          description: Validation error
```

## README Structure

Every project should have a README that covers:

```markdown
# Project Name

One-paragraph description of what this project does.

## Quick Start
1. Clone the repo
2. Open in Android Studio
3. Set up local.properties if required
4. Run `./gradlew assembleDebug` to build

## Commands
| Command | Description |
|---------|-------------|
| `./gradlew assembleDebug` | Build application |
| `./gradlew test` | Run local unit tests |
| `./gradlew connectedAndroidTest` | Run UI tests |
| `./gradlew lint` | Run linter |

## Architecture
Brief overview of the project structure and key design decisions.
Link to ADRs for details.

## Contributing
How to contribute, coding standards, PR process.
```

## Changelog Maintenance

For shipped features:

```markdown
# Changelog

## [1.2.0] - 2025-01-20
### Added
- Task sharing: users can share tasks with team members (#123)
- Email notifications for task assignments (#124)

### Fixed
- Duplicate tasks appearing when rapidly clicking create button (#125)

### Changed
- Task list now loads 50 items per page (was 20) for better UX (#126)
```

## Documentation for Agents

Special consideration for AI agent context:

- **CLAUDE.md / rules files** — Document project conventions so agents follow them
- **Spec files** — Keep specs updated so agents build the right thing
- **ADRs** — Help agents understand why past decisions were made (prevents re-deciding)
- **Inline gotchas** — Prevent agents from falling into known traps

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The code is self-documenting" | Code shows what. It doesn't show why, what alternatives were rejected, or what constraints apply. |
| "We'll write docs when the API stabilizes" | APIs stabilize faster when you document them. The doc is the first test of the design. |
| "Nobody reads docs" | Agents do. Future engineers do. Your 3-months-later self does. |
| "ADRs are overhead" | A 10-minute ADR prevents a 2-hour debate about the same decision six months later. |
| "Comments get outdated" | Comments on *why* are stable. Comments on *what* get outdated — that's why you only write the former. |

## Red Flags

- Architectural decisions with no written rationale
- Public APIs with no documentation or types
- README that doesn't explain how to run the project
- Commented-out code instead of deletion
- TODO comments that have been there for weeks
- No ADRs in a project with significant architectural choices
- Documentation that restates the code instead of explaining intent
- `.teikk/DECISIONS.md` used as a running commentary on every small change instead of significant decisions only
- A significant, already-implemented decision with no entry anywhere (not in DECISIONS.md, not in an ADR)

## Verification

After documenting:

- [ ] ADRs exist for all significant architectural decisions
- [ ] Significant implemented decisions (architecture gate, expensive-to-reverse trade-offs) have a `.teikk/DECISIONS.md` entry
- [ ] `.teikk/DECISIONS.md` entries are append-only (no past entries deleted or rewritten) and link to the ADR when one exists
- [ ] README covers quick start, commands, and architecture overview
- [ ] API functions have parameter and return type documentation
- [ ] Known gotchas are documented inline where they matter
- [ ] No commented-out code remains
- [ ] Rules files (CLAUDE.md etc.) are current and accurate
