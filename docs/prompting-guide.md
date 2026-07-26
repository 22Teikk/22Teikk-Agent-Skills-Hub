# Prompting Guide — best prompts per phase

How to prompt your agent at each stage of the `DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP` lifecycle (plus optional QA). Every phase below maps to a slash command, tells you **what context to hand the agent up front**, gives a **copy-paste prompt template**, and lists the **anti-patterns** that produce bad output.

Maintained by [22Teikk](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub). For which command to run when, see [workflow.md](workflow.md).

---

## Universal principles

These hold in every phase and mirror the behavioral rules the skills themselves enforce:

- **State assumptions, don't bury them.** Ask the agent to surface what it assumed and where it was uncertain — a wrong silent assumption is more expensive than a question.
- **Give a success criterion, not a vibe.** "Make it work" forces round-trips. "Users with an expired token get a 401 and a refresh prompt" lets the agent loop to done on its own.
- **Prefer the smallest change.** Tell the agent to touch only what the task needs and to flag — not fix — unrelated issues it notices.
- **Point at real context.** Paste the file path, the error, the AC, the SPEC section. The agent is only as grounded as the context you give it.
- **One task at a time.** Scope each prompt to a single verifiable outcome. Batch asks blur the success criterion.

---

## Define — `/teikk-interview` · `/teikk-idea` · `/teikk-spec` · `/teikk-map-code-base`

Turn intent into a locked spec. This is where ambiguity is cheapest to kill.

**Context to provide:** the problem you're solving (not the solution you imagined), who the user is, hard constraints (platform, deadline, existing stack), and anything explicitly out of scope. If a codebase already exists, say so — you want `/teikk-map-code-base`, not `/teikk-spec`.

```text
/teikk-spec
I'm building <what> for <who>. The core problem is <problem>.
Platform: <Android/iOS/Flutter/backend/…>. Stack: <known constraints>.
Must-haves: <list>. Explicitly out of scope for v1: <list>.
Open questions I already know about: <list>.
Interview me on anything unclear before writing the spec — do not fill gaps silently.
```

For an existing/legacy project, reverse-engineer the spec instead of hand-writing it:

```text
/teikk-map-code-base
Scan this repo and produce .teikk/spec/. State an ASSUMPTIONS block for the
platform/stack/architecture you infer so I can veto before you commit.
```

**Anti-patterns**
- Describing the implementation ("use a Room DB with a repository") instead of the need — you pre-empt the design phase.
- Leaving `## Open Questions` unresolved and moving on — it's a hard gate; `/teikk-planning` re-checks it.
- Running `/teikk-spec` on a project that already has code — use `/teikk-map-code-base`.

---

## Plan — `/teikk-planning`

Break the locked spec into small, dependency-ordered, individually verifiable tasks.

**Context to provide:** a finished `.teikk/spec/SPEC.md`. Call out anything you want sequenced early (a risky integration, a shared foundation) and any tasks you believe can run in parallel.

```text
/teikk-planning
Break the spec into tasks. Each task must map to at least one behavioral test
(AC → test). Put platform foundation in Phase 0. Mark any independent tasks
Parallel-safe so /teikk-build ultra can batch them. Flag tasks whose ACs I
can't currently test and tell me why.
```

**Anti-patterns**
- Planning before the spec's Open Questions are closed.
- Accepting tasks whose acceptance criterion is "it works" — every task needs a concrete, testable AC.
- Letting the plan mark everything parallel-safe; only genuinely non-overlapping tasks qualify.

---

## Build — `/teikk-build` · `/teikk-build auto` · `/teikk-build ultra`

Implement one task at a time, test-first, against the plan.

**Context to provide:** which task (or let it read the `todo.md` pointer). For a single task, `/teikk-build`. To approve the plan once and let it run everything, `auto`. To also run parallel-safe waves in git worktrees, `ultra`.

```text
/teikk-build
Implement the current task from .teikk/tasks/todo.md. Write the failing test
first, then the minimum code to pass it. Touch only files this task needs;
if you spot unrelated problems, list them, don't fix them. Stop and show me
the diff if a decision is ambiguous.
```

```text
/teikk-build auto
Run the whole plan unattended. After each task: test + build must pass before
you advance the pointer. Stop and report if any task fails twice.
```

**Anti-patterns**
- Asking for several tasks in one prompt — you lose the per-task verify gate.
- "Just make it pass" — invites tests mocked to green instead of real behavior.
- Running `ultra` on a plan with no declared waves (it just behaves like `auto`) and expecting speedup.

---

## Verify — `/teikk-test`

The fast inner loop: unit + Compose/XCTest/widget tests. E2E/UX live in QA, not here.

**Context to provide:** the behavior under test, or the bug. For a bug, describe the reproduction — the skill writes a failing test that reproduces it first (Prove-It).

```text
/teikk-test
Write a failing test that reproduces: <exact repro / expected vs actual>.
Then make it pass with the smallest change. Assert on real values, not just
that a widget/label is visible.
```

**Anti-patterns**
- Assertions that only check visibility (`assertVisible("Total")`) with no value check — flagged as invalid at ship time.
- Reaching for E2E here — that's `/teikk-qa`, run before release, not in the loop.

---

## Review — `/teikk-review` · `/teikk-code-simplify`

Five-axis review plus a mandatory adversarial pass before merge.

**Context to provide:** the diff or branch to review, and the ACs it's supposed to satisfy so the reviewer can check against intent, not just style.

```text
/teikk-review
Review this change against its ACs on correctness, readability, architecture,
security, and performance. Run the adversarial pass — try to falsify each AC.
Give me a GO / NO-GO with the blocking issues listed first.
```

Use `/teikk-code-simplify` when the code is correct but overcomplicated — it reduces complexity without changing behavior (tests must pass before and after).

**Anti-patterns**
- Asking for a review without giving the ACs — you get taste feedback, not correctness feedback.
- Treating simplification as a place to add features; it's behavior-preserving only.

---

## Ship — `/teikk-ship` · `/teikk-ci` · `/teikk-docs`

Go/no-go verdict, traceability matrix, and release readiness.

**Context to provide:** a reviewed, merged-ready branch. `/teikk-ship` fans out to the review personas and checks every AC has a behavioral test — any AC without one is a blocker.

```text
/teikk-ship
Run the ship gate. Build the AC → test traceability matrix and block on any
AC that lacks a behavioral test. Give a final GO / NO-GO and write SHIP-REPORT.md.
```

Pair with `/teikk-ci` for pipeline/quality gates and `/teikk-docs` for ADRs and README updates.

**Anti-patterns**
- Treating ship as a formality — a missing behavioral test for any AC is a production blocker, not a warning.
- Shipping without CI gates wired; `/teikk-ci` sets them up once.

---

## QA — optional, slow — `/teikk-qa` · `/teikk-e2e` · `/teikk-ux-test`

Deep pre-release pass. Runs for minutes on a device/emulator — **never inside the build or test loop.** Requires E2E to be opted in via the SPEC (`E2E: none | Maestro | XCUITest | integration_test`).

**Context to provide:** which flows matter most, and the device/emulator target. `/teikk-qa` is the umbrella (E2E then UX); the other two are the halves.

```text
/teikk-qa
Run the pre-release QA pass. Execute the E2E journeys declared in the SPEC,
then exhaustively UX-test the primary flows. Merge into one QA verdict with a
prioritized defect list.
```

**Anti-patterns**
- Running QA in the TDD loop — it's slow by design and pulled out on purpose.
- Expecting E2E to run when the SPEC says `E2E: none` — opt in first.

---

← Back to [README](../README.md) · Next: [Workflow — which command when](workflow.md)
