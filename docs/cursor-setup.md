# Using agent-skills with Cursor

Cursor supports two workspace layers: **Rules** (always-on behavior) and **Commands** (lifecycle slash workflows).

## Setup

### Option 1: npm (Recommended)

```bash
# Latest GitHub source over HTTPS (no SSH key required)
npm install 'git+https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git#main' --save-dev
npx teikk-agents-skills init cursor
```

When published to npm, use the moving latest release instead:

```bash
npm install teikk-agents-skills@latest --save-dev
npx teikk-agents-skills init cursor
```

This copies `.cursor/rules/`, `.cursor/commands/`, `skills/`, `agents/`, and `references/` into your project, then updates `.gitignore` to exclude installed files and the `.teikk/` directory (where workflow artifacts like `.teikk/spec/SPEC.md` and `.teikk/tasks/` are written).

> `AGENTS.md` is **not** shipped to the cursor target (since v5 — see CHANGELOG). Skill routing is via slash commands, skill frontmatter descriptions, or the opt-in `using-agent-skills` meta-skill. Author your own project-local `AGENTS.md` if you want always-on routing rules.

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

# Skills + personas (for the slash commands to invoke)
cp -r /path/to/22Teikk-Agent-Skills-Hub/skills .
cp -r /path/to/22Teikk-Agent-Skills-Hub/agents .

# Optional: AGENTS.md (not shipped since v5 — only needed if you want implicit skill routing without slash commands)
# cp /path/to/22Teikk-Agent-Skills-Hub/AGENTS.md .
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
| `/teikk-map-code-base` | `teikk-map-code-base.md` | map-code-base |
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

### Scoped Rules (Activated on File Pattern)

Three core rules ship in `.cursor/rules/` with `alwaysApply: false` + `globs` matching source/test file patterns (scoped down from `alwaysApply: true` to cut ~943 lines of always-on context per chat turn):

1. `test-driven-development.mdc` — `globs: **/*Test*.{kt,java,swift,dart}, **/test/**` — TDD workflow and Prove-It pattern
2. `code-review-and-quality.mdc` — `globs: **/*.{kt,java,swift,dart}` — Five-axis review
3. `incremental-implementation.mdc` — `globs: **/*.{kt,java,swift,dart}` — Build in small verifiable slices

The `android-stack.mdc` / `ios-stack.mdc` / `flutter-stack.mdc` rules use the same scoped pattern. Add `alwaysApply: true` selectively only if a rule is small and your project genuinely needs it on every turn.

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

1. **Don't load all skills at once** — The three core rules ship with `alwaysApply: false` + `globs`; add phase-specific rules as needed. Setting `alwaysApply: true` on a large rule loads it into every chat turn regardless of relevance.
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
