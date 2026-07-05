---
name: android-e2e-maestro
description: Writes and runs Maestro YAML flows for Android end-to-end user journeys. Use when a multi-screen app needs journey smoke tests, when .teikk/SPEC.md declares E2E Maestro, or when invoked via /teikk-e2e. Do NOT use for unit tests, Compose component tests, or Macrobenchmarks.
---

# Android E2E Testing (Maestro)

## Overview

Maestro runs black-box user-journey tests on a real device or emulator. Flows live as YAML under `.teikk/maestro/flows/`. This skill is **opt-in** — not every project needs E2E. Use `/teikk-test` for TDD (unit + Compose component tests); use this skill only for critical multi-screen journeys.

## When to Use

- .teikk/SPEC.md or plan declares `E2E: Maestro` for one or more acceptance criteria.
- User invokes `/teikk-e2e` with a flow name or acceptance criterion.
- Pre-ship smoke when `.teikk/maestro/` already exists (via `/teikk-ship` optional check).
- Multi-screen flows where unit and Compose component tests cannot cover navigation + DI + real app startup together.

**When NOT to use:**
- Single-screen apps, libraries, or prototypes with no journey requirement.
- Replacing unit tests or Compose component tests — Maestro complements the pyramid; it does not replace the base.
- Performance measurement — use Macrobenchmark (`android-testing-and-benchmark-kotlin`).
- Every `/teikk-build` task — E2E is too slow for the TDD loop.

## Prerequisites

Before generating or running flows:

1. **Maestro CLI** installed: `curl -Ls "https://get.maestro.mobile.dev" | bash` (or see [Maestro docs](https://maestro.mobile.dev)).
2. **Emulator or device** running with the debug app installed: `./gradlew installDebug`.
3. **`applicationId`** known from `app/build.gradle.kts` (namespace / applicationId).

If Maestro CLI or a device is unavailable, generate the YAML but stop before claiming verification — report what the user must run locally.

## Core Process

### Step 1: Confirm scope (opt-in gate)

Read `.teikk/SPEC.md` (or user request) for the acceptance criterion this flow must prove.

```
FLOW SCOPE:
- Criterion: [from SPEC success criteria or user]
- Screens: [list from navigation / plan]
- appId: [from build.gradle.kts]
→ Proceed only if this is a journey test, not a component test.
```

If SPEC says `E2E: none` and the user did not explicitly request E2E, stop and suggest `/teikk-test` instead.

### Step 2: Gather selectors from source (mandatory)

**Do not hallucinate UI text.** Read the Composable or layout files for the screens in the journey:

| Priority | Selector | Source |
|----------|----------|--------|
| 1 | `id: "..."` | Compose `Modifier.testTag(...)` / Maestro `id` |
| 2 | `text: "..."` | `stringResource(R.string.*)` or literal in UI code |
| 3 | `contentDescription` | accessibility label in code |

Cross-check navigation order from Navigation graph or routes file.

### Step 3: Write the flow YAML

Directory layout:

```
.teikk/maestro/
  config.yaml          # optional — env, tags
  flows/
    create_task.yaml
    login_smoke.yaml
```

**Flow template:**

```yaml
appId: com.example.app
---
- launchApp:
    clearState: true
- assertVisible: "Tasks"
- tapOn:
    id: "fab_add_task"
- inputText: "Buy Milk"
- tapOn: "Save"
- assertVisible: "Buy Milk"
```

**Rules:**
- One flow = one acceptance criterion or one critical journey (keep under ~15 steps).
- Prefer `id:` (testTag) over `text:` when both exist.
- Use `clearState: true` on `launchApp` for isolated runs unless testing persistence.
- No arbitrary `sleep` — use `extendedWaitUntil` with visible/assertion when needed.
- Name files `snake_case.yaml` matching the criterion: `flows/create_task.yaml`.

### Step 4: Verify — run Maestro (mandatory)

A flow is not done until Maestro passes on device/emulator.

```bash
# Install app if needed
./gradlew installDebug

# Run single flow
maestro test .teikk/maestro/flows/create_task.yaml

# Run all flows
maestro test .teikk/maestro/flows/
```

**On failure:** read Maestro output, fix selectors or timing, re-run. Do not mark the task complete on a failing run.

**On success:** report flow path, criterion covered, and command used.

### Step 5: Optional CI (project-level)

Add only when the project adopts E2E in SPEC. See `skills/ci-cd-and-automation/SKILL.md` — separate job, not on every PR by default:

```yaml
- name: Maestro E2E
  uses: reactivecircus/android-emulator-runner@v2
  with:
    api-level: 29
    script: |
      curl -Ls "https://get.maestro.mobile.dev" | bash
      ./gradlew installDebug
      maestro test .teikk/maestro/flows/
```

## Relationship to other skills

| Concern | Skill |
|---------|-------|
| Unit / Compose component TDD | `test-driven-development`, `android-testing-and-benchmark-kotlin` |
| testTag in Composables | `android-ui-kotlin` |
| CI pipeline | `ci-cd-and-automation` |
| Pre-ship optional run | `/teikk-ship` when `.teikk/maestro/flows/` exists |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll write the YAML from the spec without reading UI code" | Wrong text/tags cause flaky or always-failing flows. Read source first. |
| "Maestro replaces Compose UI tests" | Compose tests are faster and precise for component logic. Maestro covers cross-screen integration only. |
| "I'll add Maestro to every build task" | E2E takes minutes and breaks the TDD loop. Run on demand or pre-ship. |
| "The flow file exists, so we're done" | Unrun YAML is not verification. `maestro test` must pass. |

## Red Flags

- Flows with only guessed string literals never verified against UI source.
- More than 5–7 flows for a small app (over-coverage at the expensive layer).
- `Thread.sleep` or long fixed waits instead of `assertVisible` / `extendedWaitUntil`.
- Missing `appId` or wrong package name.
- `/teikk-e2e` run when SPEC says `E2E: none` without explicit user override.

## Verification

Before marking E2E work complete:

- [ ] Flow maps to a specific SPEC acceptance criterion or user-stated journey.
- [ ] Selectors sourced from actual UI code (testTag > text > contentDescription).
- [ ] `maestro test <flow.yaml>` passes on emulator or device.
- [ ] No unnecessary sleeps; flow completes in reasonable time.
- [ ] `/teikk-test` scope unchanged — unit/Compose tests still own component behavior.
