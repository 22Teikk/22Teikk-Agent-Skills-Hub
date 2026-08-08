#!/usr/bin/env bash
set -uo pipefail

ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
SPEC="$ROOT/.teikk/spec/SPEC.md"
[[ -f "$SPEC" ]] || SPEC="$ROOT/.teikk/SPEC.md"
[[ -f "$SPEC" ]] || { echo "✗ check-phase-tests — no SPEC.md found"; exit 1; }

TEST=$(awk '
  /^[[:space:]]*Test:[[:space:]]*/ {
    line = $0
    sub(/^[[:space:]]*Test:[[:space:]]*/, "", line)
    sub(/^`/, "", line)
    sub(/`[[:space:]]*$/, "", line)
    print line
    exit
  }
' "$SPEC")
[[ -n "$TEST" ]] || { echo "✗ check-phase-tests — SPEC.md must declare Test:"; exit 1; }
echo "→ Test: $TEST"
bash -lc "$TEST" || { echo "✗ check-phase-tests — Test command failed"; exit 1; }
echo "✓ check-phase-tests — declared Test suite passed"
