# Run the pre-launch checklist via parallel fan-out to specialist personas, then synthesize a go/no-go decision

Read and follow `skills/shipping-and-launch/SKILL.md`.

`/teikk-ship` is a **fan-out orchestrator**. It runs three specialist personas in parallel, merges their reports, then runs skill-based ship checks before a go/no-go decision.

## Phase A — Parallel fan-out

Spawn three subagents concurrently using the Task tool when available. **Issue all three Task calls in a single assistant turn.**

Adopt each persona from `agents/`:

1. **`code-reviewer`** — Read `agents/code-reviewer.md`. Five-axis review on staged changes or recent commits.
2. **`security-auditor`** — Read `agents/security-auditor.md`. OWASP, secrets, auth, dependency CVEs.
3. **`test-engineer`** — Read `agents/test-engineer.md`. Coverage gaps (happy path, edge, error, concurrency).

## Phase B — Skill-based ship checks

After persona reports, verify against these skills (read and check, do not skip):

| Check | Skill |
|-------|-------|
| No debug logs, telemetry wired | `skills/observability-and-instrumentation/SKILL.md` |
| README, ADRs updated | `skills/documentation-and-adrs/SKILL.md` |
| CI pipeline green / gates defined | `skills/ci-cd-and-automation/SKILL.md` |
| Atomic commits, clean history | `skills/git-workflow-and-versioning/SKILL.md` |
| Security hardening | `skills/security-and-hardening/SKILL.md` |

Merge with persona findings:

1. **Code Quality** — Aggregate Critical/Important + failing tests/lint/build
2. **Security** — Promote Critical/High to blockers
3. **Observability** — Timber release hygiene, Crashlytics keys, no PII in logs
4. **Infrastructure** — Env vars, migrations, feature flags, monitoring
5. **Documentation** — README, ADRs, changelog
6. **E2E (optional)** — If `.maestro/flows/` exists and SPEC does not say `E2E: none`, follow `skills/android-e2e-maestro/SKILL.md`: run `maestro test .maestro/flows/`. Fail → Recommended fix or Blocker if SPEC declares E2E required. If no `.maestro/` dir, skip silently.

## Phase C — Decision and rollback

Produce:

```markdown
## Ship Decision: GO | NO-GO

### Blockers (must fix before ship)
- [Source: finding + file:line]

### Recommended fixes
- [Finding + file:line]

### Acknowledged risks
- [Risk + mitigation]

### Rollback plan
- Trigger conditions: [...]
- Rollback procedure: [...]
- Recovery time objective: [...]

### Specialist reports (full)
- [code-reviewer report]
- [security-auditor report]
- [test-engineer report]
```

## Rules

1. Phase A personas run in parallel when possible.
2. Phase B skill checks are mandatory — not optional.
3. Rollback plan mandatory before GO.
4. Critical finding → default NO-GO unless user accepts risk explicitly.
5. Skip fan-out only if ≤2 files, <50 lines, no auth/payments/data/config touch.
