#!/usr/bin/env bash
set -uo pipefail

ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
PLAN="$ROOT/.teikk/tasks/plan.md"
PHASE="${1:---all}"

[[ -f "$PLAN" ]] || { echo "✓ check-traceability — no plan.md found, skipping gate"; exit 0; }

if [[ "$PHASE" == "--all" ]]; then
  SECTION=$(cat "$PLAN")
else
  SECTION=$(awk -v phase="$PHASE" '$0 ~ "^### " phase "[: ]" { in_section=1 } in_section && /^### Phase / && $0 !~ "^### " phase "[: ]" { exit } in_section { print }' "$PLAN")
fi

ACS=$(printf '%s\n' "$SECTION" | grep -E '^\s*- \[[ xX~]\].*\[AC\]' || true)
[[ -n "$ACS" ]] || { echo "✓ check-traceability — no ACs found for $PHASE"; exit 0; }

BAD=$(printf '%s\n' "$ACS" | grep -Ev '→[[:space:]]*`[^`[:space:]]+\.[^`[:space:]]+`' || true)
BAD_MOCK=$(printf '%s\n' "$ACS" | grep -Ei '→[[:space:]]*`[^`]*mock[^`]*`' || true)
if [[ -n "$BAD$BAD_MOCK" ]]; then
  echo "✗ check-traceability GATE FAILED — ACs need a behavioral \`Test.method\` mapping:"
  printf '%s\n%s\n' "$BAD" "$BAD_MOCK" | sed '/^$/d; s/^/  /'
  exit 1
fi

echo "✓ check-traceability — all ACs in $PHASE map to behavioral tests"
