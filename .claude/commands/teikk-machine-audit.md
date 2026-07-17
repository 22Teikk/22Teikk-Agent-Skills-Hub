---
description: Diagnose Claude Code machine-level configuration (settings.json, MCP servers, hooks) for cost/latency problems unrelated to this project's workflow
---

Invoke the teikk-agents-skills:machine-audit skill.

This command is **standalone and user-initiated only** — it is not part of the DEFINE→SHIP lifecycle and no other `/teikk-*` command invokes it automatically.

## When to run

- A session felt slow or expensive and you want to rule out machine config before suspecting this project's workflow
- The user asks "why did this cost so much" / "why is this so slow" / "is some MCP server or hook adding overhead"
- Setting up a new machine and want a baseline sanity check before real work
- As the second step in troubleshooting, after `/teikk-doctor` comes back green but something still feels off

## What it does

Follows `skills/machine-audit/SKILL.md`'s four steps:

1. **Collect evidence** — `claude mcp list` + `claude mcp get <server>` for each, `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, whether the current project actually has a `.mcp.json`/matching artifact for each global server
2. **Apply red flags** — user-scoped MCP servers with no matching project need, broad-matcher hooks with no project-existence guard, duplicate hooks on the same event, a globally-pinned high reasoning-effort default, dead/failed MCP connections, mandatory-workflow injections with no project scoping
3. **Quantify** — if a cost breakdown is available, check whether cache-read + cache-write together exceed ~50-60% of total cost (signals oversized/repeatedly-rewritten base context, not code generation)
4. **Report, don't auto-remediate** — present findings as flag → evidence → concrete fix command; never edit `~/.claude/settings.json` or remove global MCP/hook config without explicit user confirmation, since those changes affect every other project on the machine

## Output

A findings report in the conversation (flag → evidence → fix). This command does not write a file — unlike `/teikk-doctor`, machine config is user-specific and not meaningful to persist as a project artifact.

## Boundary with `/teikk-doctor`

- `/teikk-doctor` — audits **this project's** agent-skills setup (spec, tasks, gitignore, manifest)
- `/teikk-machine-audit` — audits **your Claude Code environment** (global settings, MCP scope, hooks)

Run `/teikk-doctor` first. If it's green but something still feels wrong, run this command next.
