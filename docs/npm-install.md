# npm Install

Install **agent-skills** into any project with npm. The CLI copies IDE-specific config into your repo and appends a managed block to `.gitignore` so installed files and workflow artifacts stay out of version control.

## Quick Start

```bash
# In your app project (not this repo)
npm install agent-skills --save-dev
npx agent-skills init cursor
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
npx agent-skills targets
```

## Auto-install on `npm install`

Skip the manual `init` step by declaring a target in your project's `package.json`:

```json
{
  "devDependencies": {
    "agent-skills": "^1.1.0"
  },
  "agent-skills": {
    "target": "cursor"
  }
}
```

Or use an environment variable:

```bash
AGENT_SKILLS_TARGET=cursor npm install agent-skills --save-dev
```

To disable postinstall (e.g. in CI for this package itself):

```bash
AGENT_SKILLS_SKIP_POSTINSTALL=1 npm install
```

## Update & Uninstall

```bash
# Refresh files after upgrading the npm package
npx agent-skills update cursor

# Remove installed files and the managed .gitignore block
npx agent-skills uninstall
```

`update` merges new targets into `.agent-skills.json` — running `init opencode` after `init cursor` keeps both.

## `.gitignore` management

`init` and `update` append (or replace) a marked block in your project's `.gitignore`:

```gitignore
# BEGIN agent-skills (managed by npm — do not edit)
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
# END agent-skills
```

Patterns depend on the installed target(s). The block always includes **workflow artifacts** your agent may create later (`SPEC.md`, `tasks/`, hook caches, etc.) so they stay local even before they exist.

Do not edit lines between the markers manually — re-run `npx agent-skills update` after changing targets.

## Install manifest

`.agent-skills.json` at the project root records what was installed:

```json
{
  "version": "1.1.0",
  "targets": ["cursor"],
  "installedAt": "2026-06-13T09:00:00.000Z",
  "package": "agent-skills"
}
```

This file is also gitignored. Use it to confirm targets before `uninstall`.

## From GitHub (no npm registry)

If the package is not published to npm yet, install from the repository:

```bash
npm install github:teikk/agent-skills --save-dev
npx agent-skills init cursor
```

Or pin a release tag:

```bash
npm install github:teikk/agent-skills#v1.1.0 --save-dev
npx agent-skills init cursor
```

## Claude Code marketplace (alternative)

Claude Code users can still use the native plugin marketplace — no npm required:

```
/plugin marketplace add teikk/agent-skills
/plugin install agent-skills@teikk-agent-skills
```

See [README](../README.md) for marketplace and other IDE-specific guides.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Unknown target` | Run `npx agent-skills targets` for valid names |
| Rules not loading in Cursor | Confirm `.cursor/rules/*.mdc` exists; restart Cursor |
| postinstall skipped | Set `agent-skills.target` in `package.json` or `AGENT_SKILLS_TARGET` |
| Want skills in git | Remove those lines from the managed `.gitignore` block (not recommended — use `update` to restore defaults) |
| Wrong symlink on Windows | Re-run `npx agent-skills update opencode`; requires Developer Mode or admin for symlinks |
