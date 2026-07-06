---
name: machine-audit
description: Use when a Claude Code session feels slow or expensive, or the user asks why a session cost/took so long, why cache-read/cache-write dominates the bill, or whether MCP servers/hooks/effort-level are wasting tokens. Diagnoses machine-level Claude Code configuration (~/.claude/settings.json, user-scope MCP servers, global hooks) — not this project's own skills, commands, or code. Do not use for code bugs, test failures, or workflow-quality questions — those belong to debugging-and-error-recovery instead.
---

# Machine Audit

## Overview

Diagnoses **machine-level Claude Code configuration** — `~/.claude/settings.json`, user-scope MCP servers, global hooks, global `CLAUDE.md` — for cost/latency problems that have nothing to do with any particular project's skills, commands, or code.

This skill is standalone by design: it is **not wired into any phase** (Define/Plan/Build/Verify/Review/Ship) and no `/teikk-*` command invokes it. A slow or expensive session should never be misdiagnosed as "the workflow is bad" when the actual cause is global config attached to every project on that machine — user-scoped MCP servers, hooks firing on every `Bash`/`Read`/`Grep`, or a reasoning-effort default pinned in `settings.json`. Run it deliberately, by name, when cost/latency is the actual question.

## When to Use

- A session felt slow or expensive and you want to rule out machine config before suspecting this project's workflow.
- The user asks "why did this cost so much" / "why is this so slow" / "is some MCP server or hook adding overhead".
- Setting up a new machine and want a baseline sanity check before doing real work.
- Do NOT run this automatically inside `/teikk-build`, `/teikk-test`, or any other command — it is user-initiated only.

## Step 1 — Collect Evidence

Run each command and keep the raw output; the verdict in Step 2 is derived from these, not from memory or assumption.

```bash
# 1. MCP servers and their scope (user scope = attached to EVERY project, not just the current one)
claude mcp list
for s in $(claude mcp list 2>/dev/null | grep -oE '^[a-zA-Z0-9_-]+'); do
  echo "=== $s ==="; claude mcp get "$s"
done

# 2. Global settings — hooks, effort level, always-on permissions
cat ~/.claude/settings.json 2>/dev/null

# 3. Global CLAUDE.md / skills that auto-trigger regardless of project
cat ~/.claude/CLAUDE.md 2>/dev/null
ls ~/.claude/skills 2>/dev/null

# 4. Does the CURRENT project actually need any of the above?
test -f .mcp.json && cat .mcp.json || echo "(no project-scoped MCP config)"
test -d graphify-out && echo "(graph exists — graph tooling may be legitimately used here)" || echo "(no graph artifact — graph tooling has nothing to do in this project)"

# 5. Last session's cost breakdown, if available
#    Look specifically at the ratio of (cache read + cache write) to (input + output).
```

## Step 2 — Apply Red Flags

Flag each one found; do not remediate anything yet, just build the list.

| Signal | Where to check | Why it matters |
|---|---|---|
| MCP server scope is **User config** but the current project has no `.mcp.json`/no matching artifact | `claude mcp get <name>` output | That server's full tool schema loads into context on every project, whether used or not |
| A `PreToolUse`/`PostToolUse` hook matches broad tool patterns (`Bash`, `Read\|Glob`, `Grep\|Glob\|Bash`) with no project-existence guard | `hooks` block in `~/.claude/settings.json` | Each matched call pays hook-spawn latency (and sometimes injected "MANDATORY" context) even when irrelevant to the project |
| Multiple hooks registered on the **same** matcher/event | same `hooks` block — repeated `"matcher": "Bash"` entries under one event | Each runs as a separate subprocess per tool call; N hooks = N× overhead per call, compounding across a session |
| `"effortLevel"` (or equivalent reasoning-effort setting) pinned to `high`/`xhigh`/`max` globally | top-level key in `settings.json` | Applies to every task regardless of complexity; inflates output/thinking tokens even for trivial edits |
| A connected server shows `✘ Failed to connect` | `claude mcp list` | Dead weight — still evaluated/retried, contributes nothing, safe to remove |
| Global `CLAUDE.md` or `~/.claude/skills/*` injects a mandatory workflow ("You MUST run X before Y") with no scoping to a specific project state | `~/.claude/CLAUDE.md`, skill frontmatter `description` | Forces tool calls / context bloat in projects where the referenced tool has nothing to act on |

## Step 3 — Quantify

If a cost breakdown is available, decompose it by token category (approximate pricing per model: input/output/cache-write/cache-read differ by ~10-50x per token). If **cache read + cache write together exceed ~50-60% of total cost**, the dominant cost driver is oversized or repeatedly-rewritten base context (tool schemas, global hook injections, skill descriptions) — not code generation. This is evidence for Step 2's flags, not a separate root cause.

## Step 4 — Report, Don't Auto-Remediate

Present findings as: **flag → evidence → concrete fix command**. Removing user-scope MCP servers or editing `~/.claude/settings.json` affects every other project on that machine — treat it as a shared, hard-to-reverse change per this project's own risk-handling rules, and get explicit confirmation before executing anything.

```bash
# Demote a globally-mounted MCP server to project-scoped (only where it's actually needed)
claude mcp remove <server> -s user
claude mcp add <server> ... -s project   # inside the specific project that needs it

# Remove a dead/failed server outright
claude mcp remove <server> -s user

# Move a "mandatory tool" hook out of ~/.claude/settings.json into a project's
# own .claude/settings.local.json, scoped to where its dependency actually exists

# Lower a globally-pinned effort level; set it per-session instead when a task
# genuinely warrants more reasoning
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The workflow must be inefficient, look how expensive this was" | Check machine config first — cache read/write dominance points at global context bloat, not skill/command quality |
| "This MCP server is useful somewhere, so leave it global" | Useful-somewhere justifies project scope, not user scope; user scope taxes every other project too |
| "The hook only adds a little overhead" | Hooks compound per matched tool call across a whole session; "a little" per call becomes significant at scale |
| "I'll just remove it now, it's obviously unused" | Removing user-scope MCP/hooks affects other projects on the machine — confirm with the user first |

## Red Flags

- Diagnosing a slow session purely from within a project's code/skills without checking `~/.claude/settings.json` first
- Auto-removing or editing global MCP/hook config without user confirmation
- Treating cache-read/cache-write cost as "the model thinking hard" without checking whether it's actually repeated re-caching of oversized base context
- Running this skill automatically as part of `/teikk-build`/`/teikk-test`/any other command

## Verification

- [ ] Evidence collected from `claude mcp list`/`get`, `~/.claude/settings.json`, `~/.claude/CLAUDE.md`
- [ ] Each red flag found is backed by the specific evidence line, not assumption
- [ ] Cost breakdown (if available) shows whether cache read/write dominates
- [ ] Findings presented as flag → evidence → fix, with no config changed without explicit user confirmation
