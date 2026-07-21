#!/bin/bash
# teikk-agents-skills pre-push guardrail (portable git hook)
#
# Install: symlink or copy into .git/hooks/pre-push, or point core.hooksPath at
# the hooks/ dir. Agent-agnostic — enforced by git itself, not any AI harness.
#
# Blocks a push when the range about to be pushed adds a sensitive file
# (.env, keys, keystores, service-account json). Fail-CLOSED: a guardrail hit
# exits non-zero and git aborts the push. Missing git/grep → exit 0 (fail-open
# only for the tooling being absent, never for a detected secret).

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CHECKER="$SCRIPT_DIR/guardrail-check.sh"

command -v git >/dev/null 2>&1 || exit 0
[ -x "$CHECKER" ] || exit 0

# git feeds pre-push "<local ref> <local sha> <remote ref> <remote sha>" on stdin.
status=0
while read -r _local_ref local_sha _remote_ref remote_sha; do
  [ -z "${local_sha:-}" ] && continue
  # Deleting a remote ref → nothing to scan.
  case "$local_sha" in *[!0]*) : ;; *) continue ;; esac

  if printf '%s' "$remote_sha" | grep -Eq '^0+$'; then
    # New branch: diff vs empty tree. NOT `git diff <sha>` — that diffs the working tree and misses committed secrets.
    empty_tree=$(git hash-object -t tree /dev/null 2>/dev/null)
    files=$(git diff --name-only "$empty_tree".."$local_sha" 2>/dev/null)
  else
    files=$(git diff --name-only "$remote_sha".."$local_sha" 2>/dev/null)
  fi

  [ -z "$files" ] && continue
  # shellcheck disable=SC2086
  if ! printf '%s\n' "$files" | xargs -r "$CHECKER" scan-secrets; then
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  echo "" >&2
  echo "Push blocked by teikk guardrail: a sensitive file is in the push range." >&2
  echo "Remove it from history or add it to .gitignore, then re-push." >&2
fi

exit "$status"
