# Using agent-skills with Cursor

Cursor supports two workspace layers: **Rules** (always-on behavior) and **Commands** (lifecycle slash workflows).

## Setup

### Option 1: npm (Recommended)

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v2.1.0 --save-dev
npx teikk-agents-skills init cursor
```

This copies `.cursor/rules/`, `.cursor/commands/`, `skills/`, `agents/`, `references/`, and `AGENTS.md` into your project, then updates `.gitignore` to exclude installed files and the `.teikk/` directory (where workflow artifacts like `.teikk/spec/SPEC.md` and `.teikk/tasks/` are written).

Auto-install on every `npm install`:

```json
{
  "teikk-agents-skills": { "target": "cursor" }
}
```

See [npm-install.md](npm-install.md) for all targets, update/uninstall, and GitHub install URLs.

### Option 2: Manual copy

```bash
mkdir -p .cursor/rules .cursor/commands

# Always-on engineering rules
cp /path/to/22Teikk-Agent-Skills-Hub/.cursor/rules/*.mdc .cursor/rules/

# Lifecycle slash commands
cp /path/to/22Teikk-Agent-Skills-Hub/.cursor/commands/teikk-*.md .cursor/commands/

# Skill routing (optional — for strict lifecycle enforcement)
cp /path/to/22Teikk-Agent-Skills-Hub/AGENTS.md .
cp -r /path/to/22Teikk-Agent-Skills-Hub/skills .
cp -r /path/to/22Teikk-Agent-Skills-Hub/agents .
```

**Open this repo in Cursor** — the bundled `.cursor/` config loads automatically.

### Rules (`.cursor/rules/*.mdc`)

```markdown
---
description: Brief description shown in the rule picker
alwaysApply: true          # every session
globs: **/*.{kt,java}      # optional — apply when matching files are open
---

# Rule content
```

| Field | Purpose |
|-------|---------|
| `description` | Shown in Cursor's rule picker |
| `alwaysApply: true` | Loaded in every conversation |
| `globs` | File pattern — rule applies when matching files are open (`alwaysApply: false`) |

### Commands (`.cursor/commands/*.md`)

Cursor slash commands — equivalent to Antigravity workflows. Plain markdown; the first `#` heading is the command description.

```markdown
# Break work into small verifiable tasks

Read and follow `skills/planning-and-task-breakdown/SKILL.md`.
...
```

Save as `.cursor/commands/teikk-planning.md` → invoke with `/teikk-planning` in chat.

| Command | File | Skill / persona |
|---------|------|-----------------|
| `/teikk-spec` | `teikk-spec.md` | spec-driven-development |
| `/teikk-planning` | `teikk-planning.md` | planning-and-task-breakdown |
| `/teikk-build` | `teikk-build.md` | incremental-implementation + TDD |
| `/teikk-test` | `teikk-test.md` | test-driven-development |
| `/teikk-review` | `teikk-review.md` | code-review-and-quality |
| `/teikk-code-simplify` | `teikk-code-simplify.md` | code-simplification |
| `/teikk-ship` | `teikk-ship.md` | shipping-and-launch + parallel personas |
| `/teikk-androidperf` | `teikk-androidperf.md` | android-performance-auditor |

> All commands use the **`teikk-` prefix** to avoid conflicts with Cursor built-in slash commands.

### Option 2: .cursorrules File

Legacy single-file rules at the project root. Prefer `.cursor/rules/*.mdc` for per-rule scope control.

```bash
cat /path/to/agent-skills/skills/test-driven-development/SKILL.md > .cursorrules
echo -e "\n---\n" >> .cursorrules
cat /path/to/agent-skills/skills/code-review-and-quality/SKILL.md >> .cursorrules
```

## Recommended Configuration

### Essential Rules (Always Apply)

These three rules ship in `.cursor/rules/` with `alwaysApply: true`:

1. `test-driven-development.mdc` — TDD workflow and Prove-It pattern
2. `code-review-and-quality.mdc` — Five-axis review
3. `incremental-implementation.mdc` — Build in small verifiable slices

### Phase-Specific Rules (On Demand)

Create additional `.mdc` files when needed. Use `alwaysApply: false` and optional `globs`:

```markdown
---
description: Android Compose UI patterns and performance
globs: **/*.{kt,kts}
alwaysApply: false
---
```

| Rule file | Source |
|-----------|--------|
| `spec-driven-development.mdc` | `skills/spec-driven-development/SKILL.md` |
| `android-ui.mdc` | `skills/android-ui-kotlin/SKILL.md` (or `-java`) |
| `security.mdc` | `skills/security-and-hardening/SKILL.md` |
| `android-performance.mdc` | `agents/android-performance-auditor.md` |

Remove phase-specific rules when done to manage context limits.

## Usage Tips

1. **Don't load all skills at once** — Keep 2–3 essential rules with `alwaysApply: true`; add phase-specific rules as needed.
2. **Use slash commands for lifecycle** — Type `/teikk-spec` to start a spec, `/teikk-planning` to break work down, `/teikk-build` to implement incrementally.
3. **Reference rules explicitly** — Tell Cursor "Follow the test-driven-development rules for this change."
4. **Use agents for review** — `/teikk-ship` references `agents/code-reviewer.md`, `agents/security-auditor.md`, and `agents/test-engineer.md`.
5. **Verify in UI** — Open **Cursor Settings → Rules** to confirm rules are discovered and scoped correctly.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Rules not loading | Use `.mdc` extension, not `.md` |
| Commands not in `/` menu | Confirm files are in `.cursor/commands/` with `#` heading |
| Rule never triggers | Set `alwaysApply: true`, or add matching `globs` |
| Too much context | Set `alwaysApply: false` on non-essential rules |
