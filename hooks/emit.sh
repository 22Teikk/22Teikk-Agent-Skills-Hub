#!/bin/bash
# hooks/emit.sh
#
# Bash-side telemetry emitter for /teikk-* commands and any caller outside the
# Claude Code hook surface. The hook script (lifecycle-telemetry.sh) covers
# platform-level events (SessionStart, PreToolUse, SubagentStart, etc.); this
# wrapper covers framework-level events that commands themselves emit:
#
#   - verification_passed / verification_failed — /teikk-build, /teikk-test
#   - duplicate_detected                        — /teikk-ship, /teikk-build
#   - decision_created / decision_reused         — /teikk-spec, /teikk-docs
#
# Usage from inside a command (or any bash that runs in the user's project):
#
#   source "$(dirname "$0")/emit.sh"   # from a script in hooks/
#   # OR
#   source "$(git rev-parse --show-toplevel)/.claude/hooks/emit.sh"
#
#   teikk_emit_cmd verification_passed ok 1250 '{"task":"Task 3"}'
#
# After sourcing, `teikk_emit_cmd <event> <status> [dur_ms] [meta_json]` is
# available. The arguments match `teikk_emit` in `lib/telemetry.sh`.
#
# Fails open — if the emitter is off, the project root can't be found, or the
# cache dir isn't writable, the call silently no-ops. Never blocks the agent.

# Resolve project root: prefer $TEIKK_PROJECT, fall back to git toplevel.
TEIKK_PROJECT="${TEIKK_PROJECT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
export TEIKK_PROJECT

# Source the underlying emitter. Prefer the hub-repo canonical copy (this is
# the single source of truth); fall back to the installed copy.
_HUB="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/telemetry.sh"
_INSTALLED="$TEIKK_PROJECT/node_modules/teikk-agents-skills/lib/telemetry.sh"
if [ -f "$_HUB" ]; then
  # shellcheck source=/dev/null
  . "$_HUB"
elif [ -f "$_INSTALLED" ]; then
  # shellcheck source=/dev/null
  . "$_INSTALLED"
else
  # No emitter available — define a no-op so callers don't break.
  teikk_emit_cmd() { return 0; }
  return 0 2>/dev/null || true
fi

# Expose the emitter under a distinct name (`teikk_emit_cmd`) so callers don't
# collide with any other `teikk_emit` that might already be in their shell
# environment (e.g. an interactive shell sourcing this twice, or an outer
# wrapper that defines its own). Define as a function (not an alias — aliases
# do not expand in non-interactive script contexts, which is exactly where
# commands will call this).
if type teikk_emit >/dev/null 2>&1; then
  teikk_emit_cmd() { teikk_emit "$@"; }
else
  teikk_emit_cmd() { return 0; }
fi
