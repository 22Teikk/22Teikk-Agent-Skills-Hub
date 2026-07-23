#!/bin/bash
# teikk-agents-skills telemetry emitter (on by default, opt-out)
#
# Sourced by hooks/CI. NOT an event bus — a single append of one JSONL line.
# No queue, no process, no dependency beyond date/printf. ON by default so
# framework-quality observability works out of the box; set TEIKK_TELEMETRY=off
# to disable (the emitter then returns immediately, true zero cost).
#
# It PHYSICALLY cannot log prompt/context/reasoning — it accepts only scalar
# event/status/duration/meta. That is the privacy guarantee, enforced by the
# function signature, not by policy.
#
#   source lib/telemetry.sh
#   teikk_emit <event> [status] [duration_ms] [meta_json]

teikk_emit() {
  [ "${TEIKK_TELEMETRY:-on}" = "off" ] && return 0

  local dir="${TEIKK_PROJECT:-.}/.teikk/cache/telemetry"
  local file="$dir/events.jsonl"
  mkdir -p "$dir" 2>/dev/null || return 0

  local ts
  ts="$(date -u +%FT%TZ 2>/dev/null)" || return 0

  printf '{"ts":"%s","wf":"%s","persona":"%s","skill":"%s","event":"%s","status":"%s","dur_ms":%s,"meta":%s}\n' \
    "$ts" "${TEIKK_WF:-}" "${TEIKK_PERSONA:-}" "${TEIKK_SKILL:-}" \
    "${1:-unknown}" "${2:-}" "${3:-null}" "${4:-"{}"}" \
    >> "$file" 2>/dev/null || true
}
