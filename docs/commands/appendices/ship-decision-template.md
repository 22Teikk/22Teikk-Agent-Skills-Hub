# Ship Decision Template — `/teikk-ship` Phase C/D

> Loaded on-demand by `/teikk-ship` only at the decision phase. The verdict
> block (production blockers, blockers, recommended fixes, acknowledged
> risks, rollback plan, specialist reports) was inlined in
> `commands/teikk-ship.toml`. Extracting here keeps the always-loaded prompt
> lean without changing the verdict structure.

Produce a **two-tier** verdict — never a single ambiguous "GO" that reads
like production when it isn't:

```markdown
## Ship Decision: GO (production) | GO (demo/portfolio) | NO-GO

### Production blockers (must fix before real users / store)
- [Source: finding + file:line]  e.g. money stored as Double; exportSchema=false + no Migration; AC without a behavioral test

### Blockers (must fix before any ship)
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
- [adversarial-reviewer report — REFUTED/UNREFUTED + attack log]
- [security-auditor report]
- [test-engineer report — real coverage after disqualification]
- [ui-ux-tester report]
```

- **GO (production)** only when there are 0 production blockers and the
  adversarial pass is UNREFUTED.
- **GO (demo/portfolio)** when it's presentable but production blockers
  remain — you MUST list every one so the gap to production is explicit.
- **NO-GO** when a blocker prevents a safe demo or a required AC is
  unproven.

## Phase D — Persistent ship report

After Phase C, write `.teikk/SHIP-REPORT.md`. Overwrite if it already exists
— the latest run is always authoritative.

```markdown
# Ship Report
Generated: <ISO timestamp — e.g. 2026-07-06T14:32:00Z>
Verdict: <GO (production) | GO (demo/portfolio) | NO-GO>

## Traceability Matrix

| AC | Behavioral test | Level | Proven? |
|----|-----------------|-------|---------|
<reproduce the full matrix from the spec (.teikk/spec/SPEC.md, or .teikk/SPEC.md fallback) with Proven? column filled in based on Phase B findings>

## Production Blockers
<list each item, or "None" if GO (production)>

## Blockers (any ship)
<list each item, or "None">

## Recommended Fixes
<list each item, or "None">

## Acknowledged Risks
<list each item, or "None">

## Rollback Plan
- Trigger conditions: <...>
- Rollback procedure: <...>
- Recovery time objective: <...>

## Specialist Reports

### Code Reviewer
<reproduce from `.teikk/cache/ship-reports.md`'s `## code-reviewer` section>

### Adversarial Reviewer
<reproduce from `.teikk/cache/ship-reports.md`'s `## adversarial-reviewer` section — REFUTED/UNREFUTED + attack log>

### Security Auditor
<reproduce from `.teikk/cache/ship-reports.md`'s `## security-auditor` section>

### Test Engineer
<reproduce from `.teikk/cache/ship-reports.md`'s `## test-engineer` section — real coverage after disqualification>

### UI/UX Tester
<reproduce from `.teikk/cache/ship-reports.md`'s `## ui-ux-tester` section>
```

After writing `.teikk/SHIP-REPORT.md`, `.teikk/cache/ship-reports.md` has
served its purpose (its content is now durably captured in the persisted
report) — leave it in place for debugging a re-run, but do not treat it as
an artifact to reference outside this command.
