# Using agent-skills with Antigravity 2.0

Antigravity 2.0 uses workspace-level **Rules** and **Workflows** under `.agents/`. This repo ships a ready-made `.agents/` directory — the Antigravity equivalent of `.cursor/rules/` for Cursor.

## Setup

### Option 1: Workspace Rules + Workflows (Recommended for Antigravity 2.0 IDE)

Antigravity 2.0 discovers project configuration automatically:

| Path | Purpose |
|------|---------|
| `.agents/rules/` | Always-on or model-triggered behavior guidelines |
| `.agents/workflows/` | Slash commands (`/teikk-spec`, `/teikk-build`, `/teikk-ship`, …) |
| `AGENTS.md` (repo root) | Skill routing and lifecycle mapping |

**Use this repo as-is** — open it in Antigravity and the bundled `.agents/` config loads automatically.

**Use in another project** — copy the pieces you need:

```bash
# Essential rules (always-on engineering workflows)
mkdir -p .agents/rules .agents/workflows
cp /path/to/agent-skills/.agents/rules/*.md .agents/rules/

# Lifecycle slash commands
cp /path/to/agent-skills/.agents/workflows/teikk-*.md .agents/workflows/

# Skill routing (required for strict lifecycle enforcement)
cp /path/to/agent-skills/AGENTS.md .
cp -r /path/to/agent-skills/skills .
cp -r /path/to/agent-skills/agents .
```

Rules in `.agents/rules/` are loaded via **Customizations → Rules** in the Antigravity agent panel. Workflows appear as `/` commands in chat.

> **Antigravity 2.0 path:** Workspace rules default to `.agents/rules/` (backward compatible with `.agent/rules/`). Workflows default to `.agents/workflows/` (backward compatible with `.agent/workflows/`).

### Option 2: Antigravity CLI Plugin

For the `agy` CLI plugin system (skills, subagents, and TOML slash commands):

```bash
agy plugin install https://github.com/addyosmani/agent-skills.git
```

Or from a local clone:

```bash
git clone https://github.com/addyosmani/agent-skills.git
agy plugin install ./agent-skills
```

The plugin exposes commands from `commands/*.toml` and discovers skills from `skills/`.

## Recommended Configuration

### Essential Rules (Always On)

These three rules are bundled in `.agents/rules/` with `activation: always_on`:

1. `test-driven-development.md` — TDD workflow and Prove-It pattern
2. `code-review-and-quality.md` — Five-axis review
3. `incremental-implementation.md` — Build in small verifiable slices

### Lifecycle Workflows (Slash Commands)

| Command | Workflow file | Skill / persona |
|---------|---------------|-----------------|
| `/teikk-spec` | `teikk-spec.md` | spec-driven-development |
| `/teikk-planning` | `teikk-planning.md` | planning-and-task-breakdown |
| `/teikk-build` | `teikk-build.md` | incremental-implementation + TDD |
| `/teikk-test` | `teikk-test.md` | test-driven-development |
| `/teikk-review` | `teikk-review.md` | code-review-and-quality |
| `/teikk-code-simplify` | `teikk-code-simplify.md` | code-simplification |
| `/teikk-ship` | `teikk-ship.md` | shipping-and-launch + parallel personas |
| `/teikk-androidperf` | `teikk-androidperf.md` | android-performance-auditor |

> All commands use the **`teikk-` prefix** to avoid conflicts with Antigravity built-in slash commands.

### Phase-Specific Rules (Load on Demand)

Add these to `.agents/rules/` when working on relevant tasks, then remove when done to manage context limits:

| Rule file | Source |
|-----------|--------|
| `spec-driven-development.md` | `skills/spec-driven-development/SKILL.md` |
| `android-ui.md` | `skills/android-ui-kotlin/SKILL.md` (or `-java`) |
| `security.md` | `skills/security-and-hardening/SKILL.md` |

Set `activation: model_decision` (or configure via **Customizations → Rules**) so they load only when relevant.

## Usage Tips

1. **Don't load all skills at once** — Antigravity has context limits. Keep 2–3 essential rules always on; add phase-specific rules as needed.
2. **Reference skills explicitly** — Tell the agent "Follow the test-driven-development rules for this change" to ensure it reads loaded rules.
3. **Use workflows for lifecycle phases** — Type `/teikk-spec` to start a spec, `/teikk-planning` to break work down, `/teikk-build` to implement incrementally.
4. **Use personas for review** — Workflows reference `agents/code-reviewer.md`, `agents/security-auditor.md`, and `agents/test-engineer.md` for `/teikk-ship`.
5. **Global preferences** — Personal coding standards that apply to every project live in `~/.gemini/GEMINI.md`.

## Verify Setup

In Antigravity chat:

1. Open **Customizations → Rules** — confirm the three essential rules appear under Workspace.
2. Type `/teikk` — autocomplete should list `/teikk-spec`, `/teikk-planning`, `/teikk-build`, `/teikk-test`, `/teikk-review`, `/teikk-ship`, and others.
3. Ask the agent to "follow AGENTS.md skill routing" — it should invoke skills from `skills/` instead of improvising.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Rules not loading | Confirm files are in `.agents/rules/` (not `.agent/rules/` unless using legacy path) |
| Workflows missing | Confirm `teikk-*.md` files are in `.agents/workflows/` with YAML frontmatter |
| Skills not found | Copy `skills/` and `AGENTS.md` into the project, or install the CLI plugin |
