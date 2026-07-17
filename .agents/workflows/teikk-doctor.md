---
description: Audit the agent-skills project setup and write a health report to .teikk/DOCTOR.md
---

No skill invocation needed — this command performs orchestrated file checks directly.

Run the following checks in sequence. For each check, record the result as one of: ✓ (pass), ✗ (fail), or ⚠ (warn).

## Checks

**1. Gitignore — `.teikk/` in managed block**
Read `.gitignore`. Confirm it contains a `# BEGIN teikk-agents-skills` managed block and that `.teikk/` appears inside it.
- Pass: block present, `.teikk/` listed
- Fail: no block, or `.teikk/` not in the block
- Next action on fail: run `npx teikk-agents-skills update` to repair the gitignore.

**2. Manifest — `.teikk-agents-skills.json` present and version-readable**
Read `.teikk-agents-skills.json`. Confirm it exists and is parseable JSON with a `version` field.
- Pass: file exists and parses cleanly
- Fail: missing or malformed
- Next action on fail: run `npx teikk-agents-skills update` or `npm install teikk-agents-skills` to reinstall.

**3. Spec — SPEC.md present and structurally complete**
Check whether `.teikk/spec/SPEC.md` exists; if not, fall back to `.teikk/SPEC.md` (older, pre-folder-layout projects — note in Details which path was found). If found, confirm all eight required sections are present: Objective, Tech Stack, Architecture, Observability, Commands, Testing Strategy (with Traceability Matrix), Boundaries.
- Pass: file present, all sections found
- Warn: file present but one or more sections missing (list which), OR file found at the legacy `.teikk/SPEC.md` root path (recommend re-running `/teikk-spec` to migrate to `.teikk/spec/`)
- Fail: file absent at both paths
- Next action on fail: run `/teikk-spec`.

**4. PROJECT.yaml — present, with logging.library set**
Check whether `.teikk/spec/PROJECT.yaml` exists; fall back to `.teikk/PROJECT.yaml`. If found, also check for a `logging.library` field.
- Pass: file present and `logging.library` set (note which path and which library)
- Warn: file present but `logging.library` missing (pre-dates this field — `/teikk-build` will fall back to the platform default; re-run `/teikk-spec` or add the field manually to make the choice explicit), OR file absent entirely (was the spec created before v2.3? Re-run `/teikk-spec` or create manually)
- No fail — this is a non-blocking warn.

**5. Open Questions — spec has no unresolved items**
Only run if a SPEC.md was found in check 3. Read its `## Open Questions` section.
- Pass: every line is `- [x]` (resolved) or `- [~]` (deferred), or the section is empty
- Warn: one or more lines are still `- [ ]` (unresolved) — list them; this blocks `/teikk-planning` per its Open Questions gate
- Skip: no SPEC.md found (already reported by check 3)

**6. Decisions log — `.teikk/DECISIONS.md`**
Check whether `.teikk/DECISIONS.md` exists.
- Pass: file present
- Warn: absent — informational only (it's created on first significant decision via `/teikk-docs` or the architecture gate; a young project may legitimately not have one yet)
- No fail — non-blocking warn.

**7. Platform: Android — mobile-mcp MCP server**
Only run if `PROJECT.yaml` (either path) exists and `platforms` includes `android`, OR if the spec mentions `Android` or `Kotlin` in the Tech Stack. Check whether `mobile-mcp` is listed in `.claude/settings.json` or `.claude/settings.local.json` under `mcpServers`.
- Pass: listed
- Warn: Android project but `mobile-mcp` not configured (UI/UX testing via `/teikk-qa` will not work)
- Skip: non-Android project

**8. E2E tooling**
Only run if `PROJECT.yaml` (either path) has `e2e:` set to something other than `none`, OR if the spec has `E2E:` set to `Maestro`, `XCUITest`, or `integration_test`.
- For `Maestro`: check that `maestro` is on PATH (`which maestro` or equivalent shell check)
- For `XCUITest`: check that `xcodebuild` is on PATH
- For `integration_test`: check that `flutter` is on PATH
- Pass: tool found
- Warn: E2E declared in spec but tool not found on PATH
- Skip: `E2E: none`

**9. Tasks — plan and todo present**
Check whether `.teikk/tasks/plan.md` and `.teikk/tasks/todo.md` both exist.
- Pass: both present
- Warn: spec exists but tasks are missing (run `/teikk-planning`)
- Skip: no spec yet

**10. Git working tree**
Run `git status --porcelain`. Report:
- Pass: clean tree
- Warn: uncommitted staged or unstaged changes exist (list file count and whether staged/unstaged)
- This is always a warn, never a fail — it is informational.

## Output

After all checks, write `.teikk/DOCTOR.md` with this structure:

```markdown
# teikk-agents-skills Doctor Report
Generated: <ISO timestamp>

## Checks

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1 | Gitignore managed block | ✓/✗/⚠ | ... |
| 2 | Manifest present | ✓/✗/⚠ | ... |
| 3 | SPEC.md present and complete | ✓/✗/⚠ | ... |
| 4 | PROJECT.yaml present + logging.library set | ✓/✗/⚠ | ... |
| 5 | Open Questions resolved | ✓/⚠/skip | ... |
| 6 | Decisions log present | ✓/⚠ | ... |
| 7 | mobile-mcp (Android) | ✓/⚠/skip | ... |
| 8 | E2E tooling | ✓/⚠/skip | ... |
| 9 | Tasks plan + todo | ✓/⚠/skip | ... |
| 10 | Git working tree | ✓/⚠ | ... |

## Next Actions

<List only items that are ✗ fail or ⚠ warn, each with the recommended next action.>

## Summary

<N passes, M warnings, P failures.>
```

Then print the table to the conversation as well, so the user sees the result immediately without opening the file.
