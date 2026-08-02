#!/usr/bin/env bash
set -uo pipefail

ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
TODO="$ROOT/.teikk/tasks/todo.md"
PHASE="${1:?Usage: phase-status.sh 'Phase N'}"
[[ -f "$TODO" ]] || { echo "✗ phase-status — no todo.md found"; exit 1; }

SECTION=$(awk -v phase="$PHASE" '$0 ~ "^### " phase "[: ]" { in_section=1 } in_section && /^### Phase / && $0 !~ "^### " phase "[: ]" { exit } in_section { print }' "$TODO")
DONE=$(printf '%s\n' "$SECTION" | grep -Ec '^\s*- \[[xX]\]' || true)
PENDING=$(printf '%s\n' "$SECTION" | grep -Ec '^\s*- \[ \]' || true)
IN_PROGRESS=$(printf '%s\n' "$SECTION" | grep -Ec '^\s*- \[~\]' || true)
TOTAL=$((DONE + PENDING + IN_PROGRESS))
printf '%s: %s/%s done, %s deferred, %s in-progress\n' "$PHASE" "$DONE" "$TOTAL" "$PENDING" "$IN_PROGRESS"
