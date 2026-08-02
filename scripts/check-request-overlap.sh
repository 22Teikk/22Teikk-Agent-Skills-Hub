#!/usr/bin/env bash
set -uo pipefail

ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
REQUEST="$ROOT/.teikk/spec/REQUEST.md"
SPEC="$ROOT/.teikk/spec/SPEC.md"

if [[ ! -s "$REQUEST" || ! -f "$SPEC" ]]; then
  echo "✗ check-request-overlap — missing .teikk/spec/REQUEST.md or SPEC.md"
  exit 1
fi

SOURCE=$(awk '/^## Source Request/{in_section=1; next} in_section && /^## /{exit} in_section{print}' "$SPEC")
if [[ -z "$SOURCE" ]]; then
  echo "✗ check-request-overlap — SPEC.md is missing a non-empty ## Source Request section"
  exit 1
fi

normalize() {
  tr '[:upper:]' '[:lower:]' | tr -cs '[:alnum:]' '\n' | awk 'length >= 3 && !/^(the|and|for|with|that|this|from|into|your|you|are|was|will|can|not|but|use|add|new|all|any|the)$/ { print }' | sort -u
}

REQUEST_WORDS=$(printf '%s\n' "$(cat "$REQUEST")" | normalize)
SOURCE_WORDS=$(printf '%s\n' "$SOURCE" | normalize)
TOTAL=$(printf '%s\n' "$REQUEST_WORDS" | sed '/^$/d' | wc -l | tr -d ' ')
MATCHED=$(comm -12 <(printf '%s\n' "$REQUEST_WORDS") <(printf '%s\n' "$SOURCE_WORDS") | sed '/^$/d' | wc -l | tr -d ' ')

if [[ "$TOTAL" -eq 0 ]]; then
  echo "✗ check-request-overlap — REQUEST.md has no content words"
  exit 1
fi

PERCENT=$((MATCHED * 100 / TOTAL))
if [[ "$PERCENT" -lt 60 ]]; then
  echo "✗ check-request-overlap — Source Request overlaps $PERCENT% of REQUEST.md content words; need >=60%"
  exit 1
fi

echo "✓ check-request-overlap — Source Request overlaps $PERCENT% of REQUEST.md content words"
