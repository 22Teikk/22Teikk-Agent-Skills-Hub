#!/bin/bash
# lifecycle-telemetry.sh — records framework lifecycle events as telemetry.
#
# Wired to Claude Code's real lifecycle events (SubagentStart, SubagentStop,
# TaskCreated, TaskCompleted, Stop) in hooks.json. Each event passes its name
# as $1. This closes the audit's "before-task / before-spawn / after-spawn /
# before-finish / summary" gap using the events Claude Code ACTUALLY fires,
# rather than inventing event names that never trigger.
#
# It only records telemetry — it never blocks or talks to the model. Like the
# emitter it sources, it is ON by default; set TEIKK_TELEMETRY=off to disable,
# reducing it to a single guarded return. Observational hooks must always exit 0.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EMITTER="$SCRIPT_DIR/../lib/telemetry.sh"

# shellcheck source=/dev/null
[ -f "$EMITTER" ] && . "$EMITTER"

EVENT="${1:-lifecycle}"
export TEIKK_PROJECT="${CLAUDE_PROJECT_DIR:-.}"

case "$EVENT" in
  SubagentStart) teikk_emit subagent_spawned ;;
  SubagentStop)  teikk_emit subagent_stopped ;;
  TaskCreated)   teikk_emit task_started ;;
  TaskCompleted) teikk_emit task_completed ok ;;
  Stop)          teikk_emit turn_finished ;;
  *)             teikk_emit "$EVENT" ;;
esac 2>/dev/null || true

exit 0
