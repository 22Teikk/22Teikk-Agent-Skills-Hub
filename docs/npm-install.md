# npm Install

Install **teikk-agents-skills** into any project with npm. The CLI copies IDE-specific config into your repo and appends a managed block to `.gitignore` so installed files and workflow artifacts stay out of version control.

Maintained by [22Teikk](https://github.com/22Teikk) — [22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub).

## Quick Start

```bash
# In your app project (not this repo)
npm install teikk-agents-skills --save-dev
npx teikk-agents-skills init cursor
```

Replace `cursor` with your IDE / CLI:

| Target | IDE / CLI | What gets installed |
|--------|-----------|---------------------|
| `cursor` | [Cursor](cursor-setup.md) | `.cursor/rules/`, `.cursor/commands/`, `skills/`, `agents/`, `AGENTS.md` |
| `claude` | [Claude Code](getting-started.md) | `.claude/commands/`, `hooks/`, `skills/`, `agents/`, `AGENTS.md` |
| `antigravity` | [Antigravity](antigravity-setup.md) | `.agents/`, `commands/`, `skills/`, `agents/`, `AGENTS.md` |
| `gemini` | [Gemini CLI](gemini-cli-setup.md) | `.gemini/commands/`, `.gemini/skills/` |
| `opencode` | [OpenCode](opencode-setup.md) | `AGENTS.md`, `skills/`, `.opencode/skills` → `../skills` |
| `all` | Every target above | Merged install for multi-tool teams |

List targets:

```bash
npx teikk-agents-skills targets
```

## Auto-install on `npm install`

Skip the manual `init` step by declaring a target in your project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "^1.2.0"
  },
  "teikk-agents-skills": {
    "target": "cursor"
  }
}
```

Or use an environment variable:

```bash
TEIKK_AGENTS_SKILLS_TARGET=cursor npm install teikk-agents-skills --save-dev
```

To disable postinstall (e.g. in CI for this package itself):

```bash
TEIKK_AGENTS_SKILLS_SKIP_POSTINSTALL=1 npm install
```

## Update & Uninstall

```bash
# Refresh files after upgrading the npm package
npx teikk-agents-skills update cursor

# Remove installed files and the managed .gitignore block
npx teikk-agents-skills uninstall
```

`update` merges new targets into `.teikk-agents-skills.json` — running `init opencode` after `init cursor` keeps both.

## `.gitignore` management

`init` and `update` append (or replace) a marked block in your project's `.gitignore`:

```gitignore
# BEGIN teikk-agents-skills (managed by npm — do not edit)
.cursor/
AGENTS.md
skills/
agents/
references/
SPEC.md
docs/SPEC.md
spec/
tasks/
.claude/.simplify-ignore-cache/
.claude/sdd-cache/
# END teikk-agents-skills
```

Patterns depend on the installed target(s). The block always includes **workflow artifacts** your agent may create later (`SPEC.md`, `tasks/`, hook caches, etc.) so they stay local even before they exist.

Do not edit lines between the markers manually — re-run `npx teikk-agents-skills update` after changing targets.

## Install manifest

`.teikk-agents-skills.json` at the project root records what was installed:

```json
{
  "version": "1.2.0",
  "targets": ["cursor"],
  "installedAt": "2026-06-13T09:00:00.000Z",
  "package": "teikk-agents-skills"
}
```

This file is also gitignored. Use it to confirm targets before `uninstall`.

## From GitHub

Install directly from the repository:

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub --save-dev
npx teikk-agents-skills init cursor
```

Or pin a release tag:

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v1.2.0 --save-dev
npx teikk-agents-skills init cursor
```

SSH clone (recommended for 22Teikk maintainers):

```bash
git clone git@github.com:22Teikk/22Teikk-Agent-Skills-Hub.git
```

## Claude Code marketplace (alternative)

Claude Code users can use the native plugin marketplace — no npm required:

```
/plugin marketplace add 22Teikk/22Teikk-Agent-Skills-Hub
/plugin install teikk-agents-skills@teikk-agents-skills-hub
```

See [README](../README.md) for marketplace and other IDE-specific guides.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Unknown target` | Run `npx teikk-agents-skills targets` for valid names |
| Rules not loading in Cursor | Confirm `.cursor/rules/*.mdc` exists; restart Cursor |
| postinstall skipped | Set `teikk-agents-skills.target` in `package.json` or `TEIKK_AGENTS_SKILLS_TARGET` |
| Want skills in git | Remove those lines from the managed `.gitignore` block (not recommended — use `update` to restore defaults) |
| Wrong symlink on Windows | Re-run `npx teikk-agents-skills update opencode`; requires Developer Mode or admin for symlinks |
