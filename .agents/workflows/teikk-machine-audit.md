---
description: Diagnose Claude Code machine-level configuration (settings.json, MCP servers, hooks) for cost/latency problems unrelated to this project's workflow
---

Invoke the teikk-agents-skills:machine-audit skill (`skills/machine-audit/SKILL.md`).

This command is **standalone and user-initiated only** — it is not part of the DEFINE→SHIP lifecycle and no other `/teikk-*` command invokes it automatically.

## When to run

- A session felt slow or expensive and you want to rule out machine config before suspecting this project's workflow
- The user asks "why did this cost so much" / "why is this so slow" / "is some MCP server or hook adding overhead"
- Setting up a new machine and want a baseline sanity check before real work
- As the second step in troubleshooting, after `/teikk-doctor` comes back green but something still feels off

## What it does

Follow the skill's four steps in order:

**1. Collect evidence.** Run each of the following and keep the raw output — the verdict is derived from evidence, not memory or assumption:
- MCP servers and their scope: `claude mcp list`, then `claude mcp get <server>` for each
- Global settings: `~/.claude/settings.json` (hooks, effort level, always-on permissions)
- Global rules: `~/.claude/CLAUDE.md`, `~/.claude/skills/`
- Whether the current project actually needs each global server: check for `.mcp.json` or a matching project artifact
- Last session's cost breakdown if available, specifically the ratio of (cache read + cache write) to (input + output)

**2. Apply red flags.** Check each of these against the evidence collected — flag, do not remediate yet:
- MCP server scope is User but the current project has no matching artifact/config for it (its full tool schema still loads into context on every project)
- A `PreToolUse`/`PostToolUse` hook matches broad tool patterns (`Bash`, `Read|Glob`, `Grep|Glob|Bash`) with no project-existence guard
- Multiple hooks registered on the same matcher/event (N hooks = N× subprocess overhead per matched call)
- A reasoning-effort setting pinned to high/max globally (inflates tokens even for trivial edits)
- A connected MCP server shows a failed connection (dead weight, still evaluated/retried)
- Global `CLAUDE.md` or a global skill injects a mandatory workflow with no scoping to a specific project state

**3. Quantify.** If a cost breakdown is available, decompose it by token category. If cache-read + cache-write together exceed roughly 50-60% of total cost, the dominant cost driver is oversized or repeatedly-rewritten base context (tool schemas, global hook injections, skill descriptions) — not code generation. This is evidence for step 2's flags, not a separate root cause.

**4. Report, don't auto-remediate.** Present findings as: flag → evidence → concrete fix command. Removing user-scope MCP servers or editing `~/.claude/settings.json` affects every other project on the machine — treat it as a shared, hard-to-reverse change and get explicit confirmation before executing anything.

## Output

A findings report in the conversation (flag → evidence → fix). This command does not write a project file — unlike `/teikk-doctor`, machine config is user-specific and not meaningful to persist as a project artifact.

## Boundary with `/teikk-doctor`

- `/teikk-doctor` — audits **this project's** agent-skills setup (spec, tasks, gitignore, manifest)
- `/teikk-machine-audit` — audits **your Claude Code environment** (global settings, MCP scope, hooks)

Run `/teikk-doctor` first. If it's green but something still feels wrong, run this command next.
