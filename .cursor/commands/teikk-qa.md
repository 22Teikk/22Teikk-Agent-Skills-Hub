# Optional deep-QA pass (slow) — E2E journeys + exhaustive UI/UX testing. Not part of the core verify/TDD loop.

**Optional and slow — opt-in only.** `/teikk-qa` is a deep quality pass: E2E journey tests + exhaustive UI/UX testing. Never run automatically. Invoke before a release when runtime is acceptable — both stages can take many minutes on real devices/emulators/simulators.

Run two stages in order; skip either when it does not apply, and state which you skipped and why.

## Stage 1 — E2E (if SPEC declares non-`none`)

Read `.teikk/spec/SPEC.md` (fall back to `.teikk/SPEC.md`) for platform + `E2E:` value. If `E2E: none`, skip this stage. Otherwise follow `/teikk-e2e`'s platform routing: Android/Maestro → `android-e2e-maestro`; iOS/XCUITest → `swift-expert`; Flutter/integration_test → `flutter-expert`. Report each flow: criterion covered, file path, command run, pass/fail.

## Stage 2 — UI/UX testing

Read and follow `ui-ux-tester`. Run exhaustive flow validation, visual spacing audit, edge/negative-path checks. Mobile via mobile-mcp (iOS/Android on simulator/emulator/device); web via browser-automation MCP. Produce a severity-classified defect report with specific fixes and visual evidence.

## Arguments

- No args — run both stages across all documented flows
- `e2e` — Stage 1 only
- `ux` — Stage 2 only
- A flow / feature name — scope both stages to that flow

## Report

Merge into one QA summary: E2E results (flows, pass/fail) followed by UI/UX defect report (Critical → Low). End with a QA verdict: **ready** or **blockers found** (list them).

Do not run during `/teikk-build` or the TDD loop — too slow. Pre-release gate, not inner-loop check.
