---
description: Audit the agent-skills project setup and write a health report to .teikk/DOCTOR.md
---

Audit project setup. Run 8 checks; record as ✓ (pass), ✗ (fail), ⚠ (warn):

| Check | Criteria | Action |
|-------|----------|--------|
| 1. Gitignore | `.teikk/` in managed block | Update if missing |
| 2. Manifest | `.teikk-agents-skills.json` exists, valid JSON | Reinstall if missing |
| 3. Spec | `.teikk/SPEC.md` + 8 sections complete | Run `/teikk-spec` if absent |
| 4. PROJECT.yaml | `.teikk/PROJECT.yaml` exists | Re-run `/teikk-spec` if absent |
| 5. mobile-mcp | Configured in settings (Android only) | Warn if Android but not configured |
| 6. E2E tooling | `maestro`/`xcodebuild`/`flutter` on PATH | Warn if declared but missing |
| 7. Tasks | `.teikk/tasks/plan.md` + `todo.md` exist | Run `/teikk-planning` if absent |
| 8. Git tree | Clean or dirty status | Informational only |

## Output

Write `.teikk/DOCTOR.md`:

```markdown
# teikk-agents-skills Doctor Report
Generated: <ISO timestamp>

## Checks

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1–8 | [check name] | ✓/✗/⚠ | ... |

## Next Actions

[List fails + warns with recommended commands]

## Summary

N passes, M warnings, P failures
```

Print table to conversation immediately.
