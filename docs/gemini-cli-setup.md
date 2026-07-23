# Using agent-skills with Gemini CLI

## Setup

### Option 1: Install as Skills (Recommended)

Gemini CLI has a native skills system that auto-discovers `SKILL.md` files in `.gemini/skills/` or `.agents/skills/` directories. Each skill activates on demand when it matches your task.

**Install from the repo:**

```bash
gemini skills install https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git --path skills
```

**Or install from a local clone:**

```bash
git clone https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git
gemini skills install /path/to/22Teikk-Agent-Skills-Hub/skills/
```

**Install for a specific workspace only:**

```bash
gemini skills install /path/to/22Teikk-Agent-Skills-Hub/skills/ --scope workspace
```

Skills installed at workspace scope go into `.gemini/skills/` (or `.agents/skills/`). User-level skills go into `~/.gemini/skills/`.

Once installed, verify with:

```
/skills list
```

Gemini CLI injects skill names and descriptions into the prompt automatically. When it recognizes a matching task, it asks permission to activate the skill before loading its full instructions.

### Option 2: GEMINI.md (Persistent Context)

For skills you want always loaded as persistent project context (rather than on-demand activation), add them to your project's `GEMINI.md`:

```bash
# Create GEMINI.md with core skills as persistent context
cat /path/to/22Teikk-Agent-Skills-Hub/skills/incremental-implementation/SKILL.md > GEMINI.md
echo -e "\n---\n" >> GEMINI.md
cat /path/to/22Teikk-Agent-Skills-Hub/skills/code-review-and-quality/SKILL.md >> GEMINI.md
```

You can also modularize by importing from separate files:

```markdown
# Project Instructions

@skills/test-driven-development/SKILL.md
@skills/incremental-implementation/SKILL.md
```

Use `/memory show` to verify loaded context, and `/memory reload` to refresh after changes.

> **Skills vs GEMINI.md:** Skills are on-demand expertise that activate only when relevant, keeping your context window clean. GEMINI.md provides persistent context loaded for every prompt. Use skills for phase-specific workflows and GEMINI.md for always-on project conventions.

## Recommended Configuration

### Always-On (GEMINI.md)

Add these as persistent context for every session:

- `incremental-implementation` — Build in small verifiable slices
- `code-review-and-quality` — Five-axis review

### On-Demand (Skills)

Install these as skills so they activate only when relevant:

- `test-driven-development` — Activates when implementing logic or fixing bugs
- `spec-driven-development` — Activates when starting a new project or feature
- `android-ui-kotlin` / `android-ui-java` — Activates when building UI
- `security-and-hardening` — Activates during security reviews
- `android-performance-auditor` — Activates during performance work

## Advanced Configuration

### Tooling Integration

Many skills in this pack leverage Android development tools to interact with the environment (e.g. adb, profiling, layout inspection). Ensure you have standard Android tooling installed.

### Session Hooks

Gemini CLI supports session lifecycle hooks. You can use these to automatically inject context or run validation scripts at the start of a session.

To replicate the `agent-skills` experience from other tools, you can configure a `SessionStart` hook that reminds you of the available skills or loads a meta-skill.

### Explicit Context Loading

You can explicitly load any skill into your current session by referencing it with the `@` symbol in your prompt:

```markdown
Use the @skills/test-driven-development/SKILL.md skill to implement this fix.
```

This is useful when you want to ensure a specific workflow is followed without waiting for auto-discovery.

## Slash Commands

The repo ships 23 slash commands under `.gemini/commands/` that map to the development lifecycle. Gemini CLI auto-discovers them when you run from the project root. A curated subset is shown below; see [workflow.md](workflow.md) for the full list.

| Command | What it does |
|---------|--------------|
| `/teikk-map-code-base` | Reverse-engineer the spec from an existing codebase |
| `/teikk-spec` | Write a structured spec before writing code |
| `/teikk-planning` | Break work into small, verifiable tasks |
| `/teikk-build` | Implement the next task incrementally |
| `/teikk-test` | Run TDD workflow — red, green, refactor |
| `/teikk-review` | Five-axis code review |
| `/teikk-code-simplify` | Reduce complexity without changing behavior |
| `/teikk-ship` | Pre-launch checklist via parallel persona fan-out |

Each command invokes the corresponding skill automatically — no manual skill loading required.

> All commands use the **`teikk-` prefix** (files: `.gemini/commands/teikk-*.toml`) to avoid conflicts with Gemini CLI built-in commands.

## Usage Tips

1. **Prefer skills over GEMINI.md** — Skills activate on demand and keep your context window focused. Only put skills in GEMINI.md if you want them always loaded.
2. **Skill descriptions matter** — Each SKILL.md has a `description` field in its frontmatter that tells agents when to activate it. The descriptions in this repo are optimized for auto-discovery across all supported tools (Claude Code, Gemini CLI, etc.) by clearly stating both *what* the skill does and *when* it should be triggered.
3. **Use agents for review** — Copy `agents/code-reviewer.md` content when requesting structured code reviews.
4. **Combine with references** — Reference checklists from `references/` when working on specific quality areas like testing or performance.
