#!/usr/bin/env bash
set -uo pipefail

ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
SPEC=""
for path in .teikk/spec/SPEC.md .teikk/SPEC.md; do
  [[ -f "$ROOT/$path" ]] && { SPEC="$ROOT/$path"; break; }
done
[[ -n "$SPEC" ]] || { echo "✗ check-phase-build — no SPEC.md found"; exit 1; }

command_for() {
  local label="$1"
  awk -v label="$label" '
    $0 ~ "^[[:space:]]*" label ":[[:space:]]*" {
      line = $0
      sub("^[[:space:]]*" label ":[[:space:]]*", "", line)
      sub(/^`/, "", line)
      sub(/`[[:space:]]*$/, "", line)
      print line
      exit
    }
  ' "$SPEC"
}

run_command() {
  local label="$1"
  local command="$2"
  [[ -n "$command" ]] || { echo "✗ check-phase-build — SPEC.md must declare ${label}:"; exit 1; }
  echo "→ ${label}: $command"
  bash -lc "$command" || { echo "✗ check-phase-build — ${label} command failed"; exit 1; }
}

BUILD=$(command_for Build)
LINT=$(command_for Lint)
TEST=$(command_for Test)
run_command Build "$BUILD"
run_command Lint "$LINT"
[[ -n "$TEST" ]] || { echo "✗ check-phase-build — SPEC.md must declare Test:"; exit 1; }
echo "✓ check-phase-build — Build, Lint, and Test commands are declared; Build and Lint passed"
