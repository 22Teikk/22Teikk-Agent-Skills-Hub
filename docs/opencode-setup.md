# OpenCode Setup

This guide explains how to use Agent Skills with OpenCode. As of the current release, OpenCode reaches full parity with Claude Code: the same `/teikk-*` slash commands, the same skills, and the same agent personas — all discovered natively.

## Overview

OpenCode natively discovers project **commands**, **skills**, and **agents** from `.opencode/`. The installer writes all three:

| What | Where (installed project) | Discovery |
|------|---------------------------|-----------|
| Slash commands | `.opencode/commands/*.md` (23, markdown + frontmatter, same shape as Claude's `.claude/commands/*.md`) | `/teikk-spec`, `/teikk-build`, … register as real commands |
| Skills | `.opencode/skills/<skill>/SKILL.md` (physically copied; each skill bundles its `references/`) | resolved by name via the `skill` tool |
| Agents | `.opencode/agents/*.md` (physically copied) | `@`-mention or auto-delegated |

The command bodies invoke skills **by name** (`Invoke the teikk-agents-skills:<skill> skill`), exactly like Claude — so `/teikk-*` are true entry points, not skills you invoke indirectly.

> **`AGENTS.md` (optional):** OpenCode auto-loads a root `AGENTS.md` if present. It's **not** shipped by the installer (it cost ~5K tokens of always-on context every session). Copy it from the hub repo manually only if you want implicit intent-based routing in addition to the explicit `/teikk-*` commands.

---

## Installation

1. Clone the repository (or install via the `opencode` target — see npm-install.md):

```bash
git clone https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git
```

2. Open the project in OpenCode.

3. Ensure the following are present in your workspace:

- `.opencode/commands/*.md` — 23 native slash commands (auto-shipped by the `opencode` target)
- `.opencode/skills/` and `.opencode/agents/` — skills and agents copied directly in, each skill self-contained with its bundled `references/`
- `AGENTS.md` (root) — **optional, manual copy** if you want implicit intent-based routing

---

## How It Works

### 1. Skill Discovery

All skills live in:

```
skills/<skill-name>/SKILL.md
```

OpenCode agents invoke skills either:

- **Explicitly** via the native `/teikk-*` slash commands in `.opencode/commands/`
- **Implicitly** when `AGENTS.md` is present and detects a matching intent
- **Directly** via the `skill` tool when the agent decides the skill applies

### 2. Automatic Skill Invocation

The agent evaluates every request and maps it to the appropriate skill.

Examples:

- "build a feature" → `incremental-implementation` + `test-driven-development`
- "design a system" → `spec-driven-development`
- "fix a bug" → `debugging-and-error-recovery`
- "review this code" → `code-review-and-quality`

The user does **not** need to explicitly request skills.

### 3. Lifecycle Mapping (Implicit Commands)

The development lifecycle is encoded implicitly:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

This replaces slash commands like `/teikk-spec`, `/teikk-planning`, etc.

---

## Usage Examples

### Example 1: Feature Development

User:
```
Add authentication to this app
```

Agent behavior:
- Detects feature work
- Invokes `spec-driven-development`
- Produces a spec before writing code
- Moves to planning and implementation skills

---

### Example 2: Bug Fix

User:
```
This endpoint is returning 500 errors
```

Agent behavior:
- Invokes `debugging-and-error-recovery`
- Reproduces → localizes → fixes → adds guards

---

### Example 3: Code Review

User:
```
Review this PR
```

Agent behavior:
- Invokes `code-review-and-quality`
- Applies structured review (correctness, design, readability, etc.)

---

## Agent Expectations (Critical)

For OpenCode to work correctly, the agent must follow these rules:

- Always check if a skill applies before acting
- If a skill applies, it MUST be used
- Never skip required workflows (spec, plan, test, etc.)
- Do not jump directly to implementation

If you opted in to `AGENTS.md`, these rules are also enforced there. If you did not, rely on the slash commands + skill descriptions — the agent should still self-invoke skills via the `skill` tool when intent matches.

---

## Limitations

- Lifecycle hooks (telemetry, guardrails) are Claude-only — they're Bash scripts wired via `.claude/settings.json`. OpenCode's equivalent is its TypeScript plugin API (`.opencode/plugins/`); this framework does not ship an OpenCode plugin.
- Auto skill-invocation still depends on model compliance (the explicit `/teikk-*` commands do not).

Otherwise the workflow reaches full parity with Claude Code: same commands, skills, and agents.

---

## Recommended Workflow

Just use natural language:

- "Design a feature"
- "Plan this change"
- "Implement this"
- "Fix this bug"
- "Review this"

The agent will automatically select and execute the correct skills.

---

## Summary

OpenCode integration works by combining:

- Native slash commands (`.opencode/commands/*.md`) — the `/teikk-*` lifecycle entry points, same as Claude
- Skills + agents (`.opencode/skills/`, `.opencode/agents/` — physically copied, self-contained) — discovered natively
- `AGENTS.md` (opt-in manual copy) — for implicit intent routing if you want it
- Automatic skill invocation via the `skill` tool when the agent decides it applies

This results in a **flexible workflow** that runs either explicitly via `/teikk-*` commands or implicitly via skill discovery — pick whichever matches your project.
