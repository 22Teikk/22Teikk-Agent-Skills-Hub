# Using agent-skills with Antigravity 2.0

Antigravity 2.0 uses workspace-level **Rules** and **Workflows** under `.agents/`. This repo ships a ready-made `.agents/` directory — the Antigravity equivalent of `.cursor/rules/` for Cursor.

## Setup

### Option 1: Workspace Rules + Workflows (Recommended for Antigravity 2.0 IDE)

Antigravity 2.0 discovers project configuration automatically:

| Path | Purpose |
|------|---------|
| `.agents/rules/` | Model-triggered behavior guidelines (scoped by activation mode, not always-on) |
| `.agents/workflows/` | Slash commands (`/teikk-spec`, `/teikk-build`, `/teikk-ship`, …) |
| `AGENTS.md` (optional, manual copy) | Skill routing + lifecycle mapping — NOT shipped since v5 (see CHANGELOG). Routing happens via slash commands, skill frontmatter descriptions, or the `using-agent-skills` meta-skill. |

**Use this repo as-is** — open it in Antigravity and the bundled `.agents/` config loads automatically.

**Use in another project** — copy the pieces you need:

```bash
# Rules (model-triggered — scoped, not always-on)
mkdir -p .agents/rules .agents/workflows
cp /path/to/22Teikk-Agent-Skills-Hub/.agents/rules/*.md .agents/rules/

# Lifecycle slash commands
cp /path/to/22Teikk-Agent-Skills-Hub/.agents/workflows/teikk-*.md .agents/workflows/

# Skills + personas (for the slash commands to invoke)
cp -r /path/to/22Teikk-Agent-Skills-Hub/skills .
cp -r /path/to/22Teikk-Agent-Skills-Hub/agents .

# Optional: AGENTS.md (not shipped since v5 — only needed if you want implicit skill routing without slash commands)
# cp /path/to/22Teikk-Agent-Skills-Hub/AGENTS.md .
```

Rules in `.agents/rules/` are loaded via **Customizations → Rules** in the Antigravity agent panel. Workflows appear as `/` commands in chat.

For strict lifecycle enforcement (the agent auto-detects and invokes skills without explicit slash commands), write your own project-specific `AGENTS.md` at the repo root instructing the agent to check `skills/<name>/SKILL.md` before acting. Don't copy this repo's `AGENTS.md` verbatim — it documents this repo, not your project.

> **Antigravity 2.0 path:** Workspace rules default to `.agents/rules/` (backward compatible with `.agent/rules/`). Workflows default to `.agents/workflows/` (backward compatible with `.agent/workflows/`).

### Option 2: Antigravity CLI Plugin

For the `agy` CLI plugin system (skills, subagents, and TOML slash commands):

```bash
agy plugin install https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git
```

Or from a local clone:

```bash
git clone https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git
agy plugin install ./22Teikk-Agent-Skills-Hub
```

The plugin exposes commands from `commands/*.toml` and discovers skills from `skills/`.

## Recommended Configuration

### Scoped Rules (Model-Triggered)

Three core rules ship in `.agents/rules/` with `activation: model_decision` (scoped down from `always_on` to cut always-on context cost):

1. `test-driven-development.md` — TDD workflow and Prove-It pattern
2. `code-review-and-quality.md` — Five-axis review
3. `incremental-implementation.md` — Build in small verifiable slices

Add a `globs` field (or stricter `activation: always_on`) only if your project genuinely needs the rule on every turn — see Customizations → Rules in the Antigravity agent panel.

### Lifecycle Workflows (Slash Commands)

| Command | Workflow file | Skill / persona |
|---------|---------------|-----------------|
| `/teikk-map-code-base` | `teikk-map-code-base.md` | map-code-base |
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

1. Open **Customizations → Rules** — confirm the three core rules appear under Workspace (with `model_decision` activation).
2. Type `/teikk` — autocomplete should list `/teikk-spec`, `/teikk-planning`, `/teikk-build`, `/teikk-test`, `/teikk-review`, `/teikk-ship`, and others.
3. Invoke any slash command (e.g. `/teikk-spec`) — it should load the corresponding skill and follow it instead of improvising.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Rules not loading | Confirm files are in `.agents/rules/` (not `.agent/rules/` unless using legacy path) |
| Workflows missing | Confirm `teikk-*.md` files are in `.agents/workflows/` with YAML frontmatter |
| Skills not found | Copy `skills/` into the project, or install the CLI plugin. (`AGENTS.md` is optional and not auto-shipped since v5 — only needed if you want implicit routing without slash commands.) |
