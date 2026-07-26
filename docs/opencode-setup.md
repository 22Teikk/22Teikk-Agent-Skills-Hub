# OpenCode Setup

This guide explains how to use Agent Skills with OpenCode in a way that closely mirrors the Claude Code experience (automatic skill selection, lifecycle-driven workflows, and strict process enforcement).

## Overview

OpenCode supports custom `/commands`, but does not have a native plugin system or automatic skill routing like Claude Code.

Instead, we achieve parity through (in order of preference):

1. **Slash commands** (`.opencode/skills` symlink + `commands/*.toml` from the hub repo) — explicit lifecycle entry points. Since v5 these are wired up by the `opencode` target's `skillsAgents: true` flag (same as Claude/Antigravity/Cursor).
2. **`AGENTS.md` (opt-in manual copy)** — A strong system prompt that maps user intent to skills. Since v5 `AGENTS.md` is **no longer auto-shipped** (it cost ~5K tokens of always-on context in every session), but OpenCode users who want the implicit intent-routing pattern can still copy it from the hub repo manually.
3. The built-in `skill` tool
4. Consistent skill discovery from the `/skills` directory

> **Recommendation:** prefer the slash-command wiring (option 1) — it gives you explicit, opt-in lifecycle entry points without paying the always-on AGENTS.md tax. Only copy `AGENTS.md` if you really want implicit intent-based routing that doesn't require typing `/teikk-*` commands.

---

## Installation

1. Clone the repository (or install via the `opencode` target — see npm-install.md):

```bash
git clone https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git
```

2. Open the project in OpenCode.

3. Ensure the following are present in your workspace:

- `skills/` and `agents/` directories (auto-shipped by the `opencode` target)
- `.opencode/skills` symlink to `../skills` (auto-created)
- `commands/*.toml` slash commands (auto-shipped if you also installed an Antigravity-compatible target)
- `AGENTS.md` (root) — **optional, manual copy** if you want implicit intent-based routing

---

## How It Works

### 1. Skill Discovery

All skills live in:

```
skills/<skill-name>/SKILL.md
```

OpenCode agents invoke skills either:

- **Explicitly** via slash commands (if you wired `commands/*.toml`)
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

- No native slash commands (handled via intent mapping instead)
- No plugin system (handled via prompt + structure)
- Skill invocation depends on model compliance

Despite these, the workflow closely matches Claude Code in practice.

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

- Structured skills (this repo) — auto-shipped
- Slash commands (`.opencode/skills` symlink + `commands/*.toml`) — preferred entry points
- `AGENTS.md` (opt-in manual copy) — for implicit intent routing if you want it
- Automatic skill invocation via the `skill` tool when the agent decides it applies

This results in a **flexible workflow** that runs either explicitly via `/teikk-*` commands or implicitly via skill discovery — pick whichever matches your project.
