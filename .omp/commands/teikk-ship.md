---
description: Run the pre-launch checklist via parallel fan-out to specialist personas, then synthesize a go/no-go decision
---

Read and follow `shipping-and-launch`.

`/teikk-ship` is a **fan-out orchestrator**: 5 personas in parallel → merge → skill-based ship checks → go/no-go. Issue all fan-out Task calls in a single assistant turn (per the `planning-and-task-breakdown` skill's `references/orchestration-patterns.md` Pattern 3).

## Phase A — Parallel fan-out

Spawn the five personas concurrently by name. Each report → append to `.teikk/cache/ship-reports.md` under `## <persona>` heading as it lands (keep only verdict + Critical count in active context, not the full report — survives mid-fan-out compaction). On a missing report, record `FAILED: <reason>` rather than silently proceeding with four.

## Phase B — Skill-based ship checks

Read `.teikk/spec/PROJECT.yaml` (fall back to `.teikk/PROJECT.yaml`) for `domain`, `e2e`, `platform`; otherwise read from `.teikk/spec/SPEC.md`.

**Task Index sanity:** `.teikk/tasks/todo.md` should have only `[x]` lines — any `[ ]`/`[~]` means the plan isn't finished; surface immediately (does NOT replace the traceability gate below).

Run each check by loading the named skill — don't paraphrase the check, the skill is the source of truth:

| Concern | Skill |
|---------|-------|
| Logging / telemetry hygiene | `observability-and-instrumentation` |
| README, ADRs, changelog | `documentation-and-adrs` |
| CI green (skip if `ci: none`) | `ci-cd-and-automation` |
| Atomic commits, clean history | `git-workflow-and-versioning` |
| Security hardening | `security-and-hardening` |
| **SPEC↔Test traceability (hard gate)** | Spec's Traceability Matrix — every AC needs a behavioral test. Mock-only / `ExampleUnitTest` / label-only = ZERO. Any AC without behavioral test → blocker. No "PARTIAL = pass". |
| Store readiness | `mobile-app-developer` — privacy manifest, targetSdkVersion, 64-bit, crash-free ≥ 99.9% |

E2E (opt-in, per spec `E2E:` field): Maestro → `android-e2e-maestro`; XCUITest → `swift-expert`; `integration_test` → `flutter-e2e`; `none` → skip silently.

## Phase C — Decision and rollback

Read full persona reports back from `.teikk/cache/ship-reports.md` (do not rely on live conversation — compaction may have happened).

Use the `shipping-and-launch` skill's bundled `references/ship-decision-template.md` for both Phase C verdict and Phase D persisted report verbatim — it owns the canonical structure (two-tier verdict: GO production / GO demo / NO-GO).

**Verdict semantics this prompt adds:**
- Final verdict = AND of constructive personas AND adversarial pass. REFUTED / PROVEN-FALSE / any AC without behavioral test → not GO (production).
- Critical finding → default NO-GO unless user accepts risk explicitly.
- Skip fan-out only if ≤2 files, <50 lines, no auth/payments/data/config touch.

## Phase D — Persistent ship report

Write `.teikk/SHIP-REPORT.md` from the appendix template (overwrite — latest run is authoritative). Leave `.teikk/cache/ship-reports.md` in place for re-run debugging only.

## Telemetry (opt-in)

If `TEIKK_TELEMETRY=on` and an emit helper exists in the current tool's installed hooks directory, source it and emit `verification_passed ok` / `verification_failed failed` with verdict + blocker count. On cross-persona duplicate findings emit `duplicate_detected ok`. Otherwise skip telemetry; it always fails open. See the `observability-and-instrumentation` skill's `references/observability-and-benchmark.md`.
