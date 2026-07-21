# Failure Recovery Policy

How the framework behaves when something fails mid-flight: a sub-agent times out, a tool errors, a hook fails, or a verification gate rejects. The framework has no runtime daemon — these are **decision rules an agent follows**, plus a git-level rollback helper (`scripts/rollback.sh`). The goal is: never leave the tree broken, never retry blindly, never lose more than one increment of work.

## Retry policy (bounded, cause-aware)

Blind retries hide root causes. Every retry must be **cause-aware** and **bounded**.

| Failure | Retry? | Bound | Action |
|---------|--------|-------|--------|
| Sub-agent timeout | Once | 1 retry | Re-issue with a narrower scope or a smaller task slice; if it times out again, do the work in the main agent or split the task. Never fan out the same oversized task a third time. |
| Tool error (transient: network, rate limit) | Yes | 2 retries, backoff | Retry with backoff. After 2 failures, surface the error and stop — do not paper over it. |
| Tool error (deterministic: bad args, missing file) | No | 0 | Fix the cause (read the error, correct the input). A deterministic failure retried unchanged fails identically. |
| Hook failure | No | 0 | Hooks fail-open by design (exit 0 on missing tooling). A hook that fails *hard* is a bug in the hook — report it, do not loop. |
| Verification gate REJECT | No auto-retry | — | A REJECT/REFUTED/NO-GO is a real signal. Fix the underlying issue, then re-run the gate once. Never disable or delete the gate to pass. |

**Hard rule:** after **3 consecutive failures** of the same operation, STOP. Revert to the last known-good state (below), document what was attempted, and escalate to the user or a consultation agent. Never continue hoping.

## Rollback policy (git-level)

Commits are save points (see `git-workflow-and-versioning`). If a change breaks something and cannot be fixed forward within one increment, roll back to the last known-good commit rather than pile fixes on a broken tree.

```bash
# Preview what would be discarded (always run first — non-destructive)
scripts/rollback.sh --dry-run

# Roll the working tree back to the last commit (destructive: discards uncommitted work)
scripts/rollback.sh --to-last-commit

# Roll back to a specific known-good sha (destructive)
scripts/rollback.sh --to <sha>
```

`rollback.sh` refuses to run when there is unstaged work it would silently destroy unless `--force` is passed, and it always prints exactly what it will discard first. Rollback is a **destructive, human-confirmed action** — an agent proposes it and shows the dry-run; it does not roll back shared history on its own.

## Interaction with other layers

- **Debugging:** a failure is a bug — enter `debugging-and-error-recovery` (Stop-the-Line, investigate before fix) rather than retrying blindly.
- **Incremental implementation:** each increment is a save point, so rollback never costs more than one slice of work.
- **Checkpointing:** `hooks/pre-compact-checkpoint.sh` snapshots task + git state before compaction, so a mid-task context reset can resume instead of restart.
