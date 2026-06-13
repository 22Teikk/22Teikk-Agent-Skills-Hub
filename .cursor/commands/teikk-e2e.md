# Write and verify Maestro E2E flows for critical user journeys (opt-in)

Read and follow `skills/android-e2e-maestro/SKILL.md`.

**Opt-in only.** Do not run for projects where SPEC says `E2E: none` unless the user explicitly requests a flow.

## Workflow

1. **Gate** — Read SPEC.md (or user message) for the acceptance criterion. Confirm multi-screen journey warrants Maestro, not `/teikk-test`.
2. **Gather selectors** — Read Composable/layout/navigation source for `testTag`, strings, routes. Do not guess labels.
3. **Write YAML** — Save to `.maestro/flows/<snake_case>.yaml` with correct `appId` from `build.gradle.kts`.
4. **Install app** — `./gradlew installDebug` (if not already on device/emulator).
5. **Verify** — `maestro test .maestro/flows/<flow>.yaml` (or all flows in `.maestro/flows/`). Fix and re-run until pass.
6. **Report** — Criterion covered, file path, command run, pass/fail.

If Maestro CLI or emulator unavailable: write YAML, document exact verify commands, stop without claiming pass.

## Arguments

- No args — user describes journey, or pick next flow from plan/SPEC `E2E` section.
- Flow name — e.g. `create_task` → write/update `.maestro/flows/create_task.yaml`.
- `all` — run `maestro test .maestro/flows/` without writing new files.

Do not invoke during `/teikk-build` unless the active plan task explicitly says Maestro E2E.
