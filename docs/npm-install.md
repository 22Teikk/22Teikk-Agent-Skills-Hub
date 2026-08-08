# npm Install

Install **teikk-agents-skills** into any project with npm. The CLI copies skills and configurations directly into your project (self-contained, no shared global state), and appends a managed block to `.gitignore` so those copied folders stay out of version control. All workflow output lands in one physical `.teikk/` directory.

Maintained by [22Teikk](https://github.com/22Teikk) — [22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub).

## Quick Start

Run all commands from the **root of the consuming app**, not from your home directory and not from a parent workspace:

```bash
cd /absolute/path/to/your-mobile-project
```

For OpenCode on Android, iOS, or Flutter, declare exactly one platform before installing:

```bash
mkdir -p .teikk/spec
printf 'platform: android\n' > .teikk/spec/PROJECT.yaml
```

Use `ios` or `flutter` instead of `android` when appropriate. The platform value is lowercase and singular.

### Latest-source installation

The examples below deliberately track the latest source instead of hardcoding an old release:

1. **Published npm package (recommended when available):**

   ```bash
   npm install teikk-agents-skills@latest --save-dev
   ```

2. **GitHub `main` over HTTPS (works without GitHub SSH keys):**

   ```bash
   npm install \
     'git+https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git#main' \
     --save-dev
   ```

Use a release tarball only when reproducibility is more important than automatically receiving the newest release:

```bash
npm install \
  https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/archive/refs/tags/vX.Y.Z.tar.gz \
  --save-dev
```

Replace `X.Y.Z` with an explicitly chosen release. Do not copy `vX.Y.Z` literally.

Avoid the shorthand `github:22Teikk/...` when onboarding arbitrary machines: npm/Git configurations may rewrite it to SSH and fail with `Permission denied (publickey)`.

For OpenCode, add this configuration to the consuming project's `package.json` so future `npm install` runs initialize the target automatically:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "latest"
  },
  "teikk-agents-skills": {
    "target": "opencode"
  }
}
```

If your team needs deterministic CI, commit `package-lock.json` and use `npm ci`; use `@latest` for developer opt-in to the newest published version, not for reproducible release builds.

Then initialize or refresh the target explicitly:

```bash
npx teikk-agents-skills init opencode
```

Replace `opencode` with another target when needed:

Skills and agents are copied directly into each tool's own dir (no shared tree, no symlinks); each skill bundles the reference docs it uses. Only `scripts/` (and Antigravity's `commands/`) sit at the project root.

| Target | IDE / CLI | What gets copied into your project |
|--------|-----------|-------------------------------------|
| `cursor` | [Cursor](cursor-setup.md) | `.cursor/` with `skills/`, `agents/` |
| `claude` | [Claude Code](getting-started.md) | `.claude/` with `commands/`, `skills/`, `agents/`, `hooks/`, `lib/telemetry.sh` |
| `antigravity` | [Antigravity](antigravity-setup.md) | `.agents/` with `skills/`, `agents/`; root `commands/` |
| `gemini` | [Gemini CLI](gemini-cli-setup.md) | `.gemini/` with `skills/`, `agents/` |
| `opencode` | [OpenCode](opencode-setup.md) | `.opencode/` with `commands/` (23 native `.md`), `skills/`, `agents/` |
| `all` | Every target above | Per-tool copies for multi-tool teams |

List targets:

```bash
npx teikk-agents-skills targets
```

## Auto-install on `npm install`

Skip the manual `init` step by declaring a target in your project's `package.json`:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "latest"
  },
  "teikk-agents-skills": {
    "target": "cursor"
  }
}
```

Until the package is published to npm, use the latest GitHub source over HTTPS:

```bash
npm install 'git+https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git#main' --save-dev
```

Or use an environment variable:

```bash
TEIKK_AGENTS_SKILLS_TARGET=cursor npm install teikk-agents-skills@latest --save-dev
```

To disable postinstall (e.g. in CI for this package itself):

```bash
TEIKK_AGENTS_SKILLS_SKIP_POSTINSTALL=1 npm install
```

## Update & Uninstall

Refresh the latest published package and update the installed target:

```bash
npm install teikk-agents-skills@latest --save-dev
npx teikk-agents-skills update opencode
```

Until npm publishing is enabled, refresh the latest GitHub source over HTTPS:

```bash
npm install \
  'git+https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git#main' \
  --save-dev
npx teikk-agents-skills update opencode
```

For a reproducible release build, replace `main` or `latest` with an explicit release tag/version chosen by the team.

Use `npm ci` on CI after committing `package-lock.json`. Do not mix a stale global/home-directory install with the app install; verify with `npm ls teikk-agents-skills` from the app root.

Remove installed files and the managed `.gitignore` block before uninstalling the package:

```bash
npx teikk-agents-skills uninstall
npm uninstall teikk-agents-skills --save-dev
```

`update` merges new targets into `.teikk-agents-skills.json` — running `init opencode` after `init cursor` keeps both.

## `.gitignore` management

`init` and `update` append (or replace) a marked block in your project's `.gitignore`. Most paths are files copied directly into your project by the CLI; `.teikk/` is the one physical directory where every workflow writes its output. All of it stays out of your repository:

```gitignore
# BEGIN teikk-agents-skills (managed by npm — do not edit)
.cursor/
.teikk/
# END teikk-agents-skills
```

(Example shown for the `cursor` target. Other targets add their own tool dir — `claude` lists `.claude/commands/`, `.claude/skills/`, `.claude/agents/`, `.claude/hooks/`, `.claude/lib/` (its `.claude/` also holds user files like CLAUDE.md, so subdirs are listed individually); `opencode` adds `.opencode/`.)

> `AGENTS.md` is no longer shipped by any target (since v5 — see CHANGELOG). If you authored your own project-local `AGENTS.md`, it stays untracked on you. The managed block no longer includes it.

Patterns depend on the installed target(s). The block always includes `.teikk/`, the single directory that holds **all workflow artifacts** your agent may create later (`.teikk/spec/SPEC.md`, `.teikk/tasks/`, `.teikk/DECISIONS.md`, `.teikk/maestro/flows/`, hook caches) so they stay local even before they exist.

Do not edit lines between the markers manually — re-run `npx teikk-agents-skills update` after changing targets.

**`.claude/settings.json` is deliberately NOT in this block.** For the `claude` target, `init`/`update` auto-wire 7 lifecycle hooks (telemetry, pre-compact checkpoint, session start) into it — but unlike everything else the CLI copies, Claude Code settings are meant to be team-shared, so it's left for you to commit or gitignore as you prefer. If you commit it, every hook command is wrapped in an existence guard so a teammate who pulls it before running `init claude` themselves gets a silent no-op instead of a "file not found" error, until they run `init`/`update` and get the gitignored `.claude/hooks/`, `.claude/lib/telemetry.sh`, and `scripts/` files on disk too. See `hooks/LIFECYCLE-TELEMETRY.md`.

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

The current release workflow creates GitHub tags/releases but does **not** bump `package.json` or publish to npm. Therefore `@latest` is valid only after the package has been published; before that, use the HTTPS GitHub `main` command above.

Before publishing a release, make these values match:

```text
package.json version = release tag version = published npm version
```

One-time setup:

```bash
npm login                    # use your npmjs.com account
npm whoami                   # confirm logged in
```

Publish from this repo:

```bash
  npm test
# Publish only after package.json.version and the release tag are aligned.
npm publish --access public
# Create/push the matching tag through the release process after merge.
# Example: vX.Y.Z (replace with the actual package.json version).
```

After publish, users can run:

```bash
npm install teikk-agents-skills --save-dev
npx teikk-agents-skills init cursor
```

## Reproducible release pins (GitHub)

For production and CI, pin an explicit release tag and use HTTPS so the install does not depend on local SSH configuration:

```bash
npm install \
  https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/archive/refs/tags/vX.Y.Z.tar.gz \
  --save-dev
```

Replace `X.Y.Z` with the release selected by your team. If Git is available and you need a Git URL rather than a tarball:

```bash
npm install \
  'git+https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git#vX.Y.Z' \
  --save-dev
```

The release tag, `package.json.version`, and manifest version must be the same release number. Verify the installed package from the consuming project root:

```bash
npm ls teikk-agents-skills
node -p "require('teikk-agents-skills/package.json').version"
cat .teikk-agents-skills.json
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
| `E404` on `npm install teikk-agents-skills@latest` | npm publishing is not enabled yet — use `npm install 'git+https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git#main' --save-dev` |
| `Unknown target` | Run `npx teikk-agents-skills targets` for valid names |
| Rules not loading in Cursor | Confirm `.cursor/rules/*.mdc` exists; restart Cursor |
| postinstall skipped | Set `teikk-agents-skills.target` in `package.json` or `TEIKK_AGENTS_SKILLS_TARGET` |
| Want skills in git | Remove those lines from the managed `.gitignore` block (not recommended — use `update` to restore defaults) |
| Missing skills after upgrade from a symlink-era install | The old `<toolDir>/skills` symlinks are detected and replaced with real copies automatically — re-run `npx teikk-agents-skills update <target>` if needed |
| Upgrading from a pre-3.0 install | Just run `npx teikk-agents-skills update <target>` — stale symlinks from the old global-cache install are detected and replaced with real files automatically |
