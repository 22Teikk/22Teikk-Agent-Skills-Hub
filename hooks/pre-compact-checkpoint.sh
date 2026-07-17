#!/bin/bash
# pre-compact-checkpoint.sh — PreCompact hook.
#
# Claude Code fires PreCompact right before it summarizes/discards
# conversation history (manual /compact or auto-compact near the context
# limit). Everything not written to disk before that point is gone — the
# agent resuming after compaction only has the summary, which is a common
# source of hallucinated state ("I think I was on Task 3" when it was
# actually Task 4).
#
# This hook does not talk to the model or block compaction (Claude Code's
# PreCompact hooks are observational — they cannot veto a compact the way a
# PreToolUse hook can veto a tool call). It writes a small, deterministic
# checkpoint file from what's already on disk, so a resumed session has a
# single fast file to read instead of trusting the post-compact summary for
# task state:
#
#   - Current task pointer from .teikk/tasks/todo.md, if a plan is active
#   - Git branch + short status, so "what was I in the middle of" is visible
#   - A timestamp, so a stale checkpoint from a much earlier compact is
#     visibly stale rather than silently trusted
#
# This complements, not replaces, todo.md — todo.md remains the authoritative
# task-index source of truth (owned/updated by /teikk-build). This checkpoint
# is a read-only snapshot of it plus git state, regenerated on every compact.
#
# Dependencies: jq. Degrades gracefully (writes nothing, exits 0) if missing.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
CACHE_DIR="$PROJECT_DIR/.teikk/cache"
CHECKPOINT_FILE="$CACHE_DIR/compact-checkpoint.md"
TODO_FILE="$PROJECT_DIR/.teikk/tasks/todo.md"

command -v jq >/dev/null 2>&1 || exit 0

# Degrade to a silent no-op (per this hook's exit-0 contract) if the cache dir
# can't be created — e.g. a read-only mount or a permission race. PreCompact is
# observational; a non-zero exit here would be surfaced as a spurious hook
# failure without preventing compaction anyway.
mkdir -p "$CACHE_DIR" 2>/dev/null || exit 0

NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Current task pointer — the one line todo.md guarantees exists at the top
# when a plan is active (see planning-and-task-breakdown SKILL.md Step 6).
CURRENT_TASK="(no active plan — .teikk/tasks/todo.md not found)"
if [ -f "$TODO_FILE" ]; then
  CURRENT_TASK=$(grep -m1 '^\*\*Current' "$TODO_FILE" 2>/dev/null || echo "(todo.md present but no Current task/wave line found)")
fi

# Git state — branch and a short status summary, not the full diff (that
# would defeat the point of a small checkpoint).
GIT_BRANCH="(not a git repo)"
GIT_STATUS="(not a git repo)"
if git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "(detached HEAD)")
  GIT_STATUS=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  GIT_STATUS="$GIT_STATUS uncommitted change(s)"
fi

{
  printf '# Pre-Compact Checkpoint\n\n'
  printf 'Generated: %s (before a compaction event — conversation history is about to be summarized/discarded)\n\n' "$NOW_ISO"
  printf '## Current task\n\n%s\n\n' "$CURRENT_TASK"
  printf '## Git state\n\nBranch: %s\nWorking tree: %s\n\n' "$GIT_BRANCH" "$GIT_STATUS"
  printf '## Resume instructions\n\n'
  printf 'This file is a deterministic snapshot, not a substitute for the actual task index. After compaction:\n'
  printf '1. Read `.teikk/tasks/todo.md` directly for the authoritative current-task pointer (this checkpoint only mirrors it at compact time).\n'
  printf '2. Do not assume the working tree state above still matches disk if time has passed since this checkpoint was generated — re-run `git status` to confirm.\n'
  printf '3. If no active plan exists, this checkpoint is uninformative by design — fall back to the conversation summary Claude Code produced.\n'
} > "$CHECKPOINT_FILE"

exit 0
