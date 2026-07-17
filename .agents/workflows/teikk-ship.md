---
description: Run the pre-launch checklist via parallel fan-out to specialist personas, then synthesize a go/no-go decision
---

Invoke the teikk-agents-skills:shipping-and-launch skill.

`/teikk-ship` is a **fan-out orchestrator**. It runs five specialist personas in parallel, merges their reports, then runs skill-based ship checks before a go/no-go decision.

## Phase A — Parallel fan-out

Spawn five subagents concurrently using the Task tool when available. **Issue all five Task calls in a single assistant turn.**

Adopt each persona from `agents/`:

1. **`code-reviewer`** — Read `agents/code-reviewer.md`. Five-axis review on staged changes or recent commits; loads domain guardrails.
2. **`adversarial-reviewer`** — Read `agents/adversarial-reviewer.md`. Falsify each acceptance criterion, find ≥1 Critical. Banned from approving. Returns REFUTED / UNREFUTED (+ attack log).
3. **`security-auditor`** — Read `agents/security-auditor.md`. OWASP, secrets, auth, dependency CVEs, domain guardrails.
4. **`test-engineer`** — Read `agents/test-engineer.md`. Test-quality audit — disqualify boilerplate/mock-verification/label-only tests; require a Room in-memory DAO test for the data layer.
5. **`ui-ux-tester`** — Read `agents/ui-ux-tester.md`. Critical user flows, visual spacing, defect report.

**Write each report to disk as soon as it lands — do not hold five full reports in context until Phase D.** As each subagent returns, append its full report to `.teikk/cache/ship-reports.md` under a `## <persona name>` heading (create the file fresh at the start of Phase A; this is scratch state for this run only, not a persisted artifact — `.teikk/SHIP-REPORT.md` in Phase D remains the durable one). This serves two purposes:

1. **Context economy.** Keep only a one-line summary of each report (verdict + Critical count) in the active conversation; read the full report back from `.teikk/cache/ship-reports.md` only when Phase C's merge step needs the details, not before.
2. **Compaction resilience.** If a compaction event lands mid-fan-out (five persona calls is the longest-running phase in this workflow), the reports already on disk survive it — Phase C can resume by reading `.teikk/cache/ship-reports.md` instead of re-running personas whose reports were lost to a summary.

If a subagent's report doesn't land (timeout, error), record that explicitly in `.teikk/cache/ship-reports.md` under its heading (`FAILED: <reason>`) rather than silently proceeding with four reports — Phase C's merge step must account for a missing persona, not treat silence as a pass.

## Phase B — Skill-based ship checks

If `.teikk/spec/PROJECT.yaml` exists (fall back to `.teikk/PROJECT.yaml` for older projects), read its `domain`, `e2e`, and `platforms` fields now — they guide the checks below. Otherwise, determine these from the spec (`.teikk/spec/SPEC.md`, falling back to `.teikk/SPEC.md`).

**Task Index sanity check.** If `.teikk/tasks/todo.md` exists, glance at it: every task line should be `[x]`. Any remaining `[ ]`/`[~]` means the plan isn't actually finished — surface this immediately, don't let it silently produce a GO. This is a fast sanity check only; it does not replace the SPEC↔Test traceability check below, which is the authoritative pass/fail gate.

After persona reports, verify against these skills (read and check, do not skip):

| Check | Skill |
|-------|-------|
| No debug logs, telemetry wired | `skills/observability-and-instrumentation/SKILL.md` |
| README, ADRs updated | `skills/documentation-and-adrs/SKILL.md` |
| CI pipeline green / gates defined | `skills/ci-cd-and-automation/SKILL.md` (skip if `ci: none` in PROJECT.yaml) |
| Atomic commits, clean history | `skills/git-workflow-and-versioning/SKILL.md` |
| Security hardening | `skills/security-and-hardening/SKILL.md` |
| **SPEC↔Test traceability (hard gate)** | Read the spec's (`.teikk/spec/SPEC.md`, falling back to `.teikk/SPEC.md`) Traceability Matrix. For **every** acceptance criterion, confirm a **behavioral** test exists and executes it. Mock-only, boilerplate (`ExampleUnitTest`), and label-only tests count as ZERO. Any AC without a behavioral test → **blocker**. There is no "PARTIAL = pass". |
| Store readiness (both platforms) | Read `agents/mobile-app-developer.md` — verify privacy manifest, targetSdkVersion, 64-bit, crash-free ≥ 99.9% |

Merge with persona findings:

1. **Code Quality** — Aggregate Critical/Important + failing tests/lint/build
2. **Adversarial** — Any AC the `adversarial-reviewer` marked PROVEN-FALSE, or any Critical it found → blocker. A REFUTED verdict blocks GO.
3. **Traceability** — Any acceptance criterion with no behavioral test → blocker (production blocker at minimum).
4. **Security** — Promote Critical/High to blockers
5. **Observability** — Release logging hygiene, Crashlytics keys, no PII in logs
6. **Store Readiness** — Platform-specific blockers from `mobile-app-developer`
7. **UX** — Broken flows or Critical spacing issues from `ui-ux-tester`
8. **Infrastructure** — Env vars, migrations, feature flags, monitoring; `exportSchema=false` + no `Migration` → data-loss production blocker
9. **Documentation** — README, ADRs, changelog
10. **E2E (opt-in)** — Determined by SPEC platform and E2E declaration:
   - Android + `E2E: Maestro` → run `maestro test .teikk/maestro/flows/` via `skills/android-e2e-maestro/SKILL.md`
   - iOS + `E2E: XCUITest` → run `xcodebuild test` via `agents/swift-expert.md`
   - Flutter + `E2E: integration_test` → run `flutter test integration_test/` via `agents/flutter-expert.md`
   - `E2E: none` or no `.e2e/` → skip silently

## Phase C — Decision and rollback

Read the full persona reports back from `.teikk/cache/ship-reports.md` (written incrementally in Phase A) to do the merge below — do not rely on reports still being in the live conversation, especially if any compaction happened between Phase A and here.

Produce a **two-tier** verdict — never a single ambiguous "GO" that reads like production when it isn't:

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

- **GO (production)** only when there are 0 production blockers and the adversarial pass is UNREFUTED.
- **GO (demo/portfolio)** when it's presentable but production blockers remain — you MUST list every one so the gap to production is explicit.
- **NO-GO** when a blocker prevents a safe demo or a required AC is unproven.

## Rules

1. Phase A personas run in parallel when possible.
2. Phase B skill checks are mandatory — not optional.
3. Rollback plan mandatory before GO.
4. **Final verdict = AND of constructive personas and the adversarial pass.** A REFUTED adversarial verdict, any PROVEN-FALSE acceptance criterion, or any AC without a behavioral test → cannot be GO (production).
5. Critical finding → default NO-GO unless user accepts risk explicitly.
6. Never count boilerplate/mock-only/label-only tests toward coverage; "PARTIAL" coverage of an AC = not done.
7. Skip fan-out only if ≤2 files, <50 lines, no auth/payments/data/config touch.

## Phase D — Persistent ship report

After Phase C, write `.teikk/SHIP-REPORT.md`. Overwrite if it already exists — the latest run is always authoritative.

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
<reproduce from `.teikk/cache/ship-reports.md`'s `## test-engineer` section>

### UI/UX Tester
<reproduce from `.teikk/cache/ship-reports.md`'s `## ui-ux-tester` section>
```

After writing `.teikk/SHIP-REPORT.md`, `.teikk/cache/ship-reports.md` has served its purpose (its content is now durably captured in the persisted report) — leave it in place for debugging a re-run, but do not treat it as an artifact to reference outside this command.
