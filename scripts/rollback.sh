#!/bin/bash
# teikk-agents-skills git-level rollback helper
#
# Destructive by nature — so it is safe by default: it always shows exactly what
# it will discard first, and refuses to destroy uncommitted work unless --force.
# An agent proposes a rollback and shows --dry-run output; a human confirms it.
#
#   rollback.sh --dry-run                 show what would be discarded (safe)
#   rollback.sh --to-last-commit          reset working tree to HEAD
#   rollback.sh --to <sha>                reset working tree to <sha>
#   (add --force to proceed when there is uncommitted work)

set -u

MODE=""
TARGET=""
FORCE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)        MODE="dry-run" ;;
    --to-last-commit) MODE="reset"; TARGET="HEAD" ;;
    --to)             MODE="reset"; shift; TARGET="${1:-}" ;;
    --force)          FORCE=1 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

command -v git >/dev/null 2>&1 || { echo "git not found" >&2; exit 2; }
git rev-parse --git-dir >/dev/null 2>&1 || { echo "not a git repository" >&2; exit 2; }
[ -n "$MODE" ] || { echo "usage: rollback.sh {--dry-run | --to-last-commit | --to <sha>} [--force]" >&2; exit 2; }

DIRTY=$(git status --porcelain 2>/dev/null)

show_discard() {
  if [ -n "$DIRTY" ]; then
    echo "Uncommitted changes that WILL BE DISCARDED:"
    printf '%s\n' "$DIRTY" | sed 's/^/  /'
  else
    echo "Working tree is clean — no uncommitted work to discard."
  fi
  if [ "${TARGET:-HEAD}" != "HEAD" ] && [ -n "${TARGET:-}" ]; then
    echo "Commits that WILL BE UNWOUND (HEAD → $TARGET):"
    git log --oneline "$TARGET"..HEAD 2>/dev/null | sed 's/^/  /' || true
  fi
}

if [ "$MODE" = "dry-run" ]; then
  show_discard
  exit 0
fi

git rev-parse --verify "$TARGET" >/dev/null 2>&1 || { echo "not a valid commit: $TARGET" >&2; exit 2; }

if [ -n "$DIRTY" ] && [ "$FORCE" -ne 1 ]; then
  echo "Refusing to roll back: uncommitted work would be lost." >&2
  echo "Review it below, then re-run with --force to proceed." >&2
  echo "" >&2
  show_discard >&2
  exit 1
fi

echo "Rolling back working tree to: $TARGET"
show_discard
git reset --hard "$TARGET"
echo "Done. HEAD is now $(git rev-parse --short HEAD)."
