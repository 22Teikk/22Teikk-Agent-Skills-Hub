---
description: Audit the agent-skills project setup and write a health report to .teikk/DOCTOR.md
---

Audit project setup. Run 10 checks; record as ✓ (pass), ✗ (fail), ⚠ (warn):

| Check | Criteria | Action |
|-------|----------|--------|
| 1. Gitignore | `.teikk/` in managed block | Update if missing |
| 2. Manifest | `.teikk-agents-skills.json` exists, valid JSON | Reinstall if missing |
| 3. Spec | `.teikk/spec/SPEC.md` (fallback `.teikk/SPEC.md`) + 8 sections complete | Run `/teikk-spec` if absent; recommend migration if found at legacy root path |
| 4. PROJECT.yaml | `.teikk/spec/PROJECT.yaml` (fallback `.teikk/PROJECT.yaml`) exists, with `logging.library` set | Re-run `/teikk-spec` if absent or `logging.library` missing |
| 5. Open Questions | Spec's `## Open Questions` has no unresolved (`- [ ]`) lines | Warn + list unresolved items — blocks `/teikk-planning` |
| 6. Decisions log | `.teikk/DECISIONS.md` exists | Informational warn if absent (young project may not have one yet) |
| 7. mobile-mcp | Configured in settings (Android only) | Warn if Android but not configured |
| 8. E2E tooling | `maestro`/`xcodebuild`/`flutter` on PATH | Warn if declared but missing |
| 9. Tasks | `.teikk/tasks/plan.md` + `todo.md` exist | Run `/teikk-planning` if absent |
| 10. Git tree | Clean or dirty status | Informational only |

## Output

Write `.teikk/DOCTOR.md`:

```markdown
# teikk-agents-skills Doctor Report
Generated: <ISO timestamp>

## Checks

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1–10 | [check name] | ✓/✗/⚠ | ... |

## Next Actions

[List fails + warns with recommended commands]

## Summary

N passes, M warnings, P failures
```

Print table to conversation immediately.
