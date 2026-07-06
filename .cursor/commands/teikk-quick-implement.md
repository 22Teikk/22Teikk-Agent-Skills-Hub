# Implement one task end-to-end with automatic context compaction — build, test, review, ship in one session

Execute a single task from `.teikk/tasks/plan.md` through all four phases (build, test, review, ship) in one continuous session. This command is for when you want to implement a task and get a final verdict without multiple separate invocations.

**Token budget strategy:** Monitor your context window as you proceed through the phases. If at any point you have <20% of your token budget remaining, apply aggressive compaction (see "Context Compaction" below) before continuing.

## Execution flow

1. **Build phase** — Implement the task using TDD (RED → GREEN → regression → commit)
2. **Test phase** — Run full test suite and verify all tests pass
3. **Review phase** — Five-axis code review + adversarial pass
4. **Ship phase** — Two-tier verdict (GO production / GO demo / NO-GO)

Do NOT skip any phase. If a phase fails or produces a blocker, stop and report the finding; do not continue.

## Context Compaction

When context is running low (estimated <20% remaining):

**After BUILD phase:**
- Summarize only: what AC was implemented, whether build succeeded
- Do NOT dump full git diff or test output unless critical
- Collapse commit message to: `Task N: [title] — [one-line summary of change]`

**After TEST phase:**
- Report only: test count, failures (if any), coverage %
- Omit passing test names; collapse to: `✓ N tests pass`
- If failures exist: list only file + test name + error line, not full stack trace

**After REVIEW phase:**
- Output summary table: [Axis] | [Status] | [Critical issues only]
- Skip detailed explanations; use inline file:line references instead
- Adversarial verdict: REFUTED/UNREFUTED + count of refutations found, not full attack log

**After SHIP phase:**
- Report verdict (GO/NO-GO) + blockers summary table only
- Specialist reports: headings + critical findings only (collapse non-blockers)
- Omit full traceability matrix; list only unproven ACs (if any)

## Token estimation

Rough per-phase costs (varies by project size):
- Build: 8–15k tokens (implementation + commit)
- Test: 3–6k tokens (test output, failures)
- Review: 10–15k tokens (five-axis + adversarial)
- Ship: 12–20k tokens (fan-out personas + verdict)

**Total: 33–56k tokens.** Budget accordingly; request a larger context window if needed for large tasks.

## When to use

- You have a single, well-scoped task to implement
- Context window is sufficient (recommend 100k+ for safety)
- You want a single verdict instead of four separate commands
- Time is a constraint (one session is faster than four)

**When NOT to use:**
- Multiple tasks (use `/teikk-build auto` instead)
- Exploratory/uncertain changes (break into steps)
- Large tasks where any phase might fail (better to isolate)
- Low token budget (use individual commands)
