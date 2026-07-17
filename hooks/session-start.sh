#!/bin/bash
# teikk-agents-skills session start hook
# Injects a short skill-discovery index into every new session.
#
# This intentionally injects the trimmed index (session-start-index.md, ~30
# lines), NOT the full using-agent-skills/SKILL.md (~200 lines). The index
# has just enough — the discovery flowchart mapping task type to skill name —
# for the agent to know a skill exists and pick the right one. The full
# skill (Core Operating Behaviors, Failure Modes, Quick Reference table) is
# read on-demand once the agent has identified which skill applies, the same
# way every other skill in this repo is loaded on-demand. Injecting the full
# skill on every single session message was a fixed token tax regardless of
# whether that session ever needed skill discovery.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INDEX_FILE="$SCRIPT_DIR/session-start-index.md"

if ! command -v jq >/dev/null 2>&1; then
  echo '{"priority": "INFO", "message": "teikk-agents-skills: jq is required for the session-start hook but was not found on PATH. Install jq (e.g. `brew install jq` or `apt-get install jq`) to enable skill-index injection. Skills remain available individually."}'
  exit 0
fi

if [ -f "$INDEX_FILE" ]; then
  CONTENT=$(cat "$INDEX_FILE")
  jq -cn --arg message "$CONTENT" '{priority: "IMPORTANT", message: $message}'
else
  echo '{"priority": "INFO", "message": "teikk-agents-skills: session-start-index.md not found. Skills may still be available individually via skills/using-agent-skills/SKILL.md."}'
fi
