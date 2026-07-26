#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EMITTER="$SCRIPT_DIR/../lib/telemetry.sh"

# shellcheck source=/dev/null
[ -f "$EMITTER" ] && . "$EMITTER"

EVENT="${1:-lifecycle}"
export TEIKK_PROJECT="${TEIKK_PROJECT:-.}"

case "$EVENT" in
  SubagentStart) teikk_emit subagent_spawned ;;
  SubagentStop) teikk_emit subagent_stopped ;;
  TaskCreated) teikk_emit task_started ;;
  TaskCompleted) teikk_emit task_completed ok ;;
  Stop) teikk_emit turn_finished ;;

  PreToolUse) teikk_emit tool_invoked ;;
  PostToolUse) teikk_emit tool_completed ok ;;
  PostToolUseFailure) teikk_emit tool_failed err ;;

  UserPromptSubmit)
    PROMPT="${CLAUDE_USER_PROMPT:-}"
    if echo "$PROMPT" | grep -qE '^/?teikk-[a-z-]+'; then
      CMD=$(echo "$PROMPT" | grep -oE '/?teikk-[a-z-]+' | head -1)
      teikk_emit slash_command_invoked ok null "{\"command\":\"$CMD\"}"
    else
      teikk_emit user_prompt ok
    fi
    ;;

  SessionStart) teikk_emit session_started ok ;;
  SessionEnd) teikk_emit session_ended ok ;;
  # PreCompact fires immediately before context compaction — treat that as the
  # observable "context_reset" signal. The docs list `context_reset` as a
  # high-signal event; this line is the only place that should emit it (an
  # explicit PostCompact event does not exist in the Claude Code hook surface).
  PreCompact) teikk_emit context_reset ok ;;

  Notification) teikk_emit notification_received ok ;;
  StopFailure) teikk_emit turn_failed err ;;

  *) teikk_emit "$EVENT" ;;
esac

exit 0
