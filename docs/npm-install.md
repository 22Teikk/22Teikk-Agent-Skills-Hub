# npm Install

Install **teikk-agents-skills** into any project with npm. The CLI copies skills and configurations directly into your project (self-contained, no shared global state), and appends a managed block to `.gitignore` so those copied folders stay out of version control. All workflow output lands in one physical `.teikk/` directory.

Maintained by [22Teikk](https://github.com/22Teikk) — [22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub).

## Quick Start

> **Not on npmjs.org yet.** Install from GitHub (works today). After [npm publish](#publish-to-npmjsorg-maintainers), `npm install teikk-agents-skills` will work too.

```bash
# In your app project (not this repo)
npm install github:22Teikk/22Teikk-Agent-Skills-Hub --save-dev
npx teikk-agents-skills init cursor
```

Replace `cursor` with your IDE / CLI:

| Target | IDE / CLI | What gets copied into your project |
|--------|-----------|-------------------------------------|
| `cursor` | [Cursor](cursor-setup.md) | `.cursor/`, `skills/`, `agents/`, `references/`, `AGENTS.md` |
| `claude` | [Claude Code](getting-started.md) | `.claude/commands/`, `hooks/`, `skills/`, `agents/`, `references/`, `AGENTS.md` |
| `antigravity` | [Antigravity](antigravity-setup.md) | `.agents/`, `commands/`, `skills/`, `agents/`, `references/`, `AGENTS.md` |
| `gemini` | [Gemini CLI](gemini-cli-setup.md) | `.gemini/`, `skills/` (with `.gemini/skills` symlink) |
| `opencode` | [OpenCode](opencode-setup.md) | `AGENTS.md`, `skills/`, `agents/`, and `.opencode/skills` symlink |
| `all` | Every target above | Merged copies for multi-tool teams |

List targets:

```bash
npx teikk-agents-skills targets
```

## Auto-install on `npm install`

Skip the manual `init` step by declaring a target in your project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "github:22Teikk/22Teikk-Agent-Skills-Hub"
  },
  "teikk-agents-skills": {
    "target": "cursor"
  }
}
```

Or use an environment variable:

```bash
TEIKK_AGENTS_SKILLS_TARGET=cursor npm install github:22Teikk/22Teikk-Agent-Skills-Hub --save-dev
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

`init` and `update` append (or replace) a marked block in your project's `.gitignore`. Most paths are files copied directly into your project by the CLI; `.teikk/` is the one physical directory where every workflow writes its output. All of it stays out of your repository:

```gitignore
# BEGIN teikk-agents-skills (managed by npm — do not edit)
.cursor/
.teikk/
AGENTS.md
agents/
references/
skills/
# END teikk-agents-skills
```

Patterns depend on the installed target(s). The block always includes `.teikk/`, the single directory that holds **all workflow artifacts** your agent may create later (`.teikk/SPEC.md`, `.teikk/tasks/`, `.teikk/maestro/flows/`, hook caches) so they stay local even before they exist.

Do not edit lines between the markers manually — re-run `npx teikk-agents-skills update` after changing targets.

## Install manifest

`.teikk-agents-skills.json` at the project root records what was installed:

```json
{
  "version": "2.2.0",
  "targets": ["cursor"],
  "files": ["skills/interview-me/SKILL.md", "..."],
  "installedAt": "2026-06-13T09:00:00.000Z",
  "package": "teikk-agents-skills"
}
```

`files` lists every path the CLI has copied into your project — it's what lets `update` refresh (and `uninstall` remove) exactly the files this tool owns, without touching anything of yours. This file is also gitignored. Use it to confirm targets before `uninstall`.

## Publish to npmjs.org (maintainers)

The package is **not** on [npmjs.org](https://www.npmjs.com/package/teikk-agents-skills) yet. Until you publish, users must install from GitHub (see Quick Start).

One-time setup:

```bash
npm login                    # use your npmjs.com account
npm whoami                   # confirm logged in
```

Publish from this repo:

```bash
npm test
npm publish --access public  # required for unscoped packages on first publish
git tag -a v2.2.0 -f -m "v2.2.0"
git push origin v2.2.0 --force
```

After publish, users can run:

```bash
npm install teikk-agents-skills --save-dev
npx teikk-agents-skills init cursor
```

## Version pins (GitHub)

Install latest from `main`:

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub --save-dev
```

Pin a release branch or installation (recommended):

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub --save-dev
npx teikk-agents-skills init cursor
```

SSH clone (22Teikk maintainers with `Host teikk` in `~/.ssh/config`):

```bash
git clone git@teikk:22Teikk/22Teikk-Agent-Skills-Hub.git
```

Or standard GitHub SSH:

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
| `E404` on `npm install teikk-agents-skills` | Package not on npmjs.org yet — use `npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v2.2.0 --save-dev` |
| `Unknown target` | Run `npx teikk-agents-skills targets` for valid names |
| Rules not loading in Cursor | Confirm `.cursor/rules/*.mdc` exists; restart Cursor |
| postinstall skipped | Set `teikk-agents-skills.target` in `package.json` or `TEIKK_AGENTS_SKILLS_TARGET` |
| Want skills in git | Remove those lines from the managed `.gitignore` block (not recommended — use `update` to restore defaults) |
| Wrong symlink on Windows | Re-run `npx teikk-agents-skills update opencode`/`gemini`; requires Developer Mode or admin for the `.opencode/skills`/`.gemini/skills` symlinks |
| Upgrading from a pre-3.0 install | Just run `npx teikk-agents-skills update <target>` — stale symlinks from the old global-cache install are detected and replaced with real files automatically |
