# Using agent-skills with Cursor

## Setup

### Option 1: Rules Directory (Recommended)

Cursor loads project rules from `.cursor/rules/` as `.mdc` files with YAML frontmatter:

```bash
mkdir -p .cursor/rules

cp /path/to/agent-skills/.cursor/rules/test-driven-development.mdc .cursor/rules/
cp /path/to/agent-skills/.cursor/rules/code-review-and-quality.mdc .cursor/rules/
cp /path/to/agent-skills/.cursor/rules/incremental-implementation.mdc .cursor/rules/
```

**Rule file format:**

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

Rules with `alwaysApply: true` are injected automatically. File-scoped rules activate when you work on matching paths.

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

1. **Don't load all skills at once** — Cursor has context limits. Keep 2–3 essential rules with `alwaysApply: true`; add phase-specific rules as needed.
2. **Reference rules explicitly** — Tell Cursor "Follow the test-driven-development rules for this change."
3. **Use agents for review** — Reference `agents/code-reviewer.md` for structured review.
4. **Verify in UI** — Open **Cursor Settings → Rules** to confirm rules are discovered and scoped correctly.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Rules not loading | Use `.mdc` extension, not `.md` |
| Rule never triggers | Set `alwaysApply: true`, or add matching `globs` |
| Too much context | Set `alwaysApply: false` on non-essential rules |
