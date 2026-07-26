#!/usr/bin/env bash
# scripts/check-open-questions.sh
#
# Hard gate: exits 1 if .teikk/spec/SPEC.md (or fallback .teikk/SPEC.md)
# has any `- [ ]` (unresolved) line under `## Open Questions`.
# Used by /teikk-spec, /teikk-planning, and /teikk-build to enforce the
# "no unresolved questions at gate time" rule that spec-driven-development
# and planning-and-task-breakdown describe in prose.

set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

SPEC=""
for path in .teikk/spec/SPEC.md .teikk/SPEC.md SPEC.md docs/SPEC.md; do
  if [ -f "$REPO_ROOT/$path" ]; then
    SPEC="$REPO_ROOT/$path"
    break
  fi
done

if [ -z "$SPEC" ]; then
  echo "✓ check-open-questions — no SPEC.md found, skipping gate"
  exit 0
fi

# Extract the Open Questions section (from "## Open Questions" to next "## " or EOF)
SECTION=$(awk '
  /^## Open Questions/ { in_section=1; next }
  in_section && /^## / { exit }
  in_section { print }
' "$SPEC")

if [ -z "$SECTION" ]; then
  echo "✓ check-open-questions — no Open Questions section in $SPEC"
  exit 0
fi

# Find unresolved `- [ ]` lines (not `- [x]`, not `- [~]`)
UNRESOLVED=$(echo "$SECTION" | grep -E '^\s*-\s*\[\s\]' || true)

if [ -n "$UNRESOLVED" ]; then
  echo ""
  echo "✗ check-open-questions GATE FAILED"
  echo "  Spec: $SPEC"
  echo "  Unresolved items in ## Open Questions:"
  echo "$UNRESOLVED" | sed 's/^/    /'
  echo ""
  echo "  Resolve each (mark \`- [x] ... → ...\`) or explicitly defer (mark \`- [~] ... → deferred: ...\`)"
  echo "  before this gate can pass. See spec-driven-development / planning-and-task-breakdown."
  exit 1
fi

echo "✓ check-open-questions — $SPEC has no unresolved items"
exit 0
