# Run the pre-launch checklist via parallel fan-out to specialist personas, then synthesize a go/no-go decision

Read and follow `skills/shipping-and-launch/SKILL.md`.

`/teikk-ship` is a **fan-out orchestrator**. It runs three specialist personas in parallel against the current change, then merges their reports into a single go/no-go decision with a rollback plan.

## Phase A — Parallel fan-out

Spawn three subagents concurrently using the Task tool when available. **Issue all three Task calls in a single assistant turn** so they execute in parallel. If subagents are unavailable, run persona prompts sequentially and treat outputs as if returned in parallel.

Adopt each persona from `agents/`:

1. **`code-reviewer`** — Read `agents/code-reviewer.md`. Run a five-axis review on staged changes or recent commits.
2. **`security-auditor`** — Read `agents/security-auditor.md`. Run a vulnerability and threat-model pass.
3. **`test-engineer`** — Read `agents/test-engineer.md`. Analyze test coverage gaps.

Constraints:
- Personas do not delegate to each other — keep the fan-out flat.
- Each persona returns only its report to this main session.

## Phase B — Merge in main context

Once all three reports are back, synthesize:

1. **Code Quality** — Aggregate Critical/Important findings and any failing tests, lint, or build output.
2. **Security** — Promote Critical/High security findings to launch blockers.
3. **Performance** — Pull from the code review performance axis.
4. **Accessibility** — Verify keyboard nav, screen reader support, contrast.
5. **Infrastructure** — Env vars, migrations, monitoring, feature flags.
6. **Documentation** — README, ADRs, changelog.

## Phase C — Decision and rollback

Produce a single output:

```markdown
## Ship Decision: GO | NO-GO

### Blockers (must fix before ship)
- [Source persona: Critical finding + file:line]

### Recommended fixes (should fix before ship)
- [Source persona: Important finding + file:line]

### Acknowledged risks (shipping anyway)
- [Risk + mitigation]

### Rollback plan
- Trigger conditions: [what signals would prompt rollback]
- Rollback procedure: [exact steps]
- Recovery time objective: [target]

### Specialist reports (full)
- [code-reviewer report]
- [security-auditor report]
- [test-engineer report]
```

## Rules

1. Phase A personas run in parallel when possible — never skip parallel intent without reason.
2. Personas do not call each other. The main agent merges in Phase B.
3. The rollback plan is mandatory before any GO decision.
4. If any persona returns a Critical finding, default verdict is NO-GO unless the user explicitly accepts the risk.
5. Skip fan-out only if the change touches 2 files or fewer, the diff is under 50 lines, and it does not touch auth, payments, data access, or config/env.
