# pre-compact-checkpoint hook

Writes a small, deterministic checkpoint file right before Claude Code compacts conversation history (manual `/compact` or automatic near the context limit), so a resumed session has a fast, trustworthy file to read instead of relying only on the post-compact summary for task state.

## Why

Compaction discards or summarizes conversation history. Anything the agent "remembers" but hasn't written to disk is gone after the summary — a common source of post-compact hallucination ("I think I was on Task 3" when it was actually Task 4, or claiming a file was already edited when it wasn't).

`.teikk/tasks/todo.md` (see `skills/planning-and-task-breakdown/SKILL.md` Step 6) already solves this for the active task pointer during `/teikk-build`, but it's only read at the start of that specific command. Long-running commands with no equivalent checkpoint (`/teikk-ship`'s multi-persona fan-out, `/teikk-quick-implement`'s multi-phase chain) had no disk-backed state to fall back on if compaction landed mid-run.

This hook doesn't add new state — it snapshots what's already authoritative (`todo.md`'s current-task pointer, git branch, working-tree change count) into one small file, regenerated on every compact event.

## Setup

Installed via `npx teikk-agents-skills init claude` (or `update`)? This hook is already wired — `init`/`update` automatically merge it (and the other lifecycle hooks) into your project's `.claude/settings.json`, rewritten to use `${CLAUDE_PROJECT_DIR}`. See `lib/claude-hooks.js`. No manual setup needed.

Installed by cloning the repo manually instead? Add this to `.claude/settings.json` (or `.claude/settings.local.json` for personal use):

```json
{
  "hooks": {
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PROJECT_DIR}/hooks/pre-compact-checkpoint.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

`${CLAUDE_PROJECT_DIR}` resolves to the directory you launched Claude Code from. If `agent-skills` is installed as a Claude Code plugin instead (`/plugin install`), this hook is already wired in `hooks/hooks.json` via `${CLAUDE_PLUGIN_ROOT}` and needs no manual setup either.

## How it works

| Event | Action |
|---|---|
| `PreCompact` (any trigger — manual or auto) | Reads `.teikk/tasks/todo.md`'s `**Current task:**`/`**Current wave:**` line (if a plan is active), reads `git branch`/`git status --porcelain` count, writes both plus a timestamp to `.teikk/cache/compact-checkpoint.md`. |

**Important limitation:** Claude Code's `PreCompact` hook is observational, not a veto — it cannot block or delay compaction the way a `PreToolUse` hook can block a tool call. This hook's only job is to get *something reliable* onto disk before the summary happens; it does not (and cannot) prevent compaction itself.

**What the agent sees:** nothing automatically — this hook writes a file, it does not inject a message into the conversation. After a compact, when the agent needs to re-orient, it should read `.teikk/tasks/todo.md` directly (the authoritative source) or `.teikk/cache/compact-checkpoint.md` (a fast mirror of it plus git state at the moment of the last compact) rather than trusting the auto-generated summary alone for task state.

**When there's no active plan:** the checkpoint still writes, but the "Current task" section says so explicitly (`(no active plan — .teikk/tasks/todo.md not found)`) instead of silently omitting the file — an agent checking for a checkpoint should never get a false "nothing to resume" from a missing file when the real state is "there's no plan yet, that's expected."

## Local testing

```bash
# Run directly — no stdin payload needed, unlike the sdd-cache hooks
bash hooks/pre-compact-checkpoint.sh
echo "exit=$?"   # expect 0

cat .teikk/cache/compact-checkpoint.md
```

Expected: a Markdown file with a timestamp, the current task pointer (or the "no active plan" message), and git branch/status.

## Known limitations

- **Snapshot, not live state.** The checkpoint reflects disk state *at the moment of the compact event*. If the agent reads it much later in a resumed session, working-tree state may have drifted — the file's own "Resume instructions" section tells the agent to re-run `git status` rather than trust the number verbatim.
- **Does not capture in-flight reasoning.** This hook only mirrors what's already been written to `todo.md`/git — it cannot recover a decision the agent was mid-way through reasoning about but hadn't yet persisted. The fix for that is upstream: commands doing multi-phase work (like `/teikk-ship`) should write intermediate results to disk as they complete, not just at the very end — see the persona-report-to-file change in `/teikk-ship`.
- **`.teikk/cache/` must be gitignored.** Already covered by the installer's managed gitignore block (`GENERATED_PATTERNS` in `lib/constants.js`) — no manual step needed for projects that used `npx teikk-agents-skills init`.

## Requirements

- `jq` (checked; hook degrades to a silent no-op if missing)
- `git` (optional — git section reports "(not a git repo)" if unavailable or not a repo)
- Bash 3.2+
