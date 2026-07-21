#!/bin/bash
# teikk-agents-skills guardrail checker
#
# Portable, agent-agnostic guardrail enforcement. Runs as a plain shell script
# so it works under any AI coding agent (Claude, Cursor, Gemini, OpenCode,
# Antigravity) and from a git hook — not tied to one harness's hook system.
#
# Two modes:
#   guardrail-check.sh scan-secrets <file>...   → exit 1 if a file looks like a secret
#   guardrail-check.sh deny-command "<cmdline>" → exit 1 if the command is destructive
#
# Fail-CLOSED: on a guardrail hit this exits non-zero so the caller (git hook,
# CI) blocks. Unknown mode → exit 2 (usage error), never a silent pass.

set -u

MODE="${1:-}"

# Filenames / path fragments that must never be committed or pushed.
SENSITIVE_PATTERNS='(^|/)\.env($|\.)|(^|/)\.env\.[a-z]+$|\.pem$|\.p12$|\.keystore$|\.jks$|(^|/)id_rsa$|(^|/)id_ed25519$|secrets?\.(ya?ml|json)$|credentials\.json$|\.p8$|google-services\.json$|GoogleService-Info\.plist$'

# Destructive command shapes an agent must SUGGEST, never auto-run.
# Each alternative is anchored to a recognizable destructive invocation.
DESTRUCTIVE_PATTERNS='git[[:space:]]+push[[:space:]]+.*--force|git[[:space:]]+push[[:space:]]+.*-f($|[[:space:]])|git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+.*-[a-z]*f|rm[[:space:]]+-[a-z]*r[a-z]*f|rm[[:space:]]+-[a-z]*f[a-z]*r|DROP[[:space:]]+TABLE|DROP[[:space:]]+DATABASE|TRUNCATE[[:space:]]+TABLE|terraform[[:space:]]+apply|terraform[[:space:]]+destroy|kubectl[[:space:]]+delete|flyway[[:space:]]+.*(clean|migrate)|:[[:space:]]*migrate[[:space:]]+VERSION=0|git[[:space:]]+branch[[:space:]]+-D'

scan_secrets() {
  shift
  local hit=0
  for f in "$@"; do
    # Security exemption: template/example/doc variants carry a secret-shaped name but no secret.
    if printf '%s\n' "$f" | grep -Eiq '\.(example|sample|template|dist)($|\.)|\.md$'; then
      continue
    fi
    if printf '%s\n' "$f" | grep -Eiq "$SENSITIVE_PATTERNS"; then
      echo "GUARDRAIL: refusing to include sensitive file: $f" >&2
      hit=1
    fi
  done
  return $hit
}

deny_command() {
  shift
  local cmd="${*:-}"
  if printf '%s\n' "$cmd" | grep -Eq "$DESTRUCTIVE_PATTERNS"; then
    echo "GUARDRAIL: destructive command blocked — an agent must SUGGEST this, not auto-run it:" >&2
    echo "  $cmd" >&2
    echo "If you intend to run it, do so manually after review." >&2
    return 1
  fi
  return 0
}

case "$MODE" in
  scan-secrets) scan_secrets "$@" ;;
  deny-command) deny_command "$@" ;;
  *)
    echo "usage: guardrail-check.sh {scan-secrets <file>... | deny-command \"<cmdline>\"}" >&2
    exit 2
    ;;
esac
