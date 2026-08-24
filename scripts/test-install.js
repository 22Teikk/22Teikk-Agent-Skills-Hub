#!/usr/bin/env node
'use strict';

/**
 * Smoke test for npm install flow — runs in CI without publishing.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { PACKAGE_NAME, GITIGNORE_BEGIN, GITIGNORE_END, MANIFEST_FILE } = require('../lib/constants');

const REPO_ROOT = path.resolve(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'bin', 'teikk-agents-skills.js');
// The hub's own version (package.json) — CI bumps it on merge to uat/main;
// the legacy-manifest fixtures below simulate a previously-installed version
// so they must stay in sync with the current package version.
const HUB_VERSION = require(path.join(REPO_ROOT, 'package.json')).version;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readGitignoreBlock(projectRoot) {
  const content = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf8');
  assert(content.includes(GITIGNORE_BEGIN), 'missing gitignore begin marker');
  assert(content.includes(GITIGNORE_END), 'missing gitignore end marker');
  assert(content.includes('.teikk/'), 'missing .teikk/ in gitignore');
  assert(content.includes('.cursor/'), 'missing .cursor/ in gitignore');
  return content;
}

function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-test-`));

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');

    const init = spawnSync(
      process.execPath,
      [CLI, 'init', 'cursor', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(init.status === 0, `init failed: ${init.stderr}`);

    assert(fs.existsSync(path.join(tmp, '.cursor', 'rules')), 'missing .cursor/rules');
    assert(fs.existsSync(path.join(tmp, '.cursor', 'commands')), 'missing .cursor/commands');
    assert(
      fs.existsSync(path.join(tmp, '.cursor', 'skills', 'spec-driven-development', 'SKILL.md')),
      'missing .cursor/skills — skills must be physically copied into each tool dir',
    );
    assert(fs.existsSync(path.join(tmp, MANIFEST_FILE)), 'missing manifest');
    assert(
      !fs.lstatSync(path.join(tmp, '.cursor', 'skills')).isSymbolicLink(),
      '.cursor/skills should be a real directory, not a symlink',
    );
    assert(
      fs.existsSync(path.join(tmp, '.cursor', 'agents', 'code-reviewer.md')),
      '.cursor/agents must be physically copied',
    );
    assert(
      !fs.existsSync(path.join(tmp, '.teikk-agents')),
      '.teikk-agents/ must NOT exist — each tool dir is self-contained',
    );
    assert(
      !fs.existsSync(path.join(tmp, 'skills')),
      'root skills/ must NOT exist',
    );
    for (const script of [
      'benchmark.js',
      'check-open-questions.sh',
      'check-request-overlap.sh',
      'check-traceability.sh',
      'check-phase-build.sh',
      'check-phase-tests.sh',
      'decisions.js',
      'phase-status.sh',
      'rollback.sh',
    ]) {
      assert(
        fs.existsSync(path.join(tmp, 'scripts', script)),
        `missing scripts/${script} — user-facing CLI tools should be usable in-project, no clone needed`,
      );
    }

    readGitignoreBlock(tmp);

    fs.mkdirSync(path.join(tmp, '.teikk', 'spec'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.teikk', 'spec', 'PROJECT.yaml'), 'platform: android\n');

    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'opencode', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(update.status === 0, `update failed: ${update.stderr}`);
    assert(
      fs.existsSync(path.join(tmp, '.opencode', 'skills', 'spec-driven-development', 'SKILL.md')),
      'missing .opencode/skills — must be physically copied',
    );
    assert(
      fs.existsSync(path.join(tmp, '.opencode', 'skills', 'android-ui-kotlin', 'SKILL.md')),
      'missing Android skill — platform pack was not selected',
    );
    assert(
      !fs.lstatSync(path.join(tmp, '.opencode', 'skills')).isSymbolicLink(),
      '.opencode/skills should be a real directory, not a symlink',
    );
    assert(
      fs.existsSync(path.join(tmp, '.opencode', 'agents', 'code-reviewer.md')),
      'missing .opencode/agents — must be physically copied',
    );
    assert(
      fs.existsSync(path.join(tmp, '.opencode', 'commands', 'teikk-spec.md')),
      'missing .opencode/commands/teikk-spec.md — OpenCode must get native slash commands',
    );
    assert(
      fs.existsSync(
        path.join(tmp, '.opencode', 'skills', 'code-review-and-quality', 'references', 'domain-guardrails.md'),
      ),
      'missing bundled reference — references must be copied into each skill that uses them',
    );

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST_FILE), 'utf8'));
    assert(manifest.targets.includes('cursor'), 'manifest missing cursor');
    assert(manifest.targets.includes('opencode'), 'manifest missing opencode');
    assert(Array.isArray(manifest.files) && manifest.files.length > 0, 'manifest missing files list');

    const uninstall = spawnSync(
      process.execPath,
      [CLI, 'uninstall', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(uninstall.status === 0, `uninstall failed: ${uninstall.stderr}`);
    assert(!fs.existsSync(path.join(tmp, MANIFEST_FILE)), 'manifest not removed');
    assert(
      !fs.existsSync(path.join(tmp, '.opencode', 'skills')),
      'uninstall left .opencode/skills behind',
    );
    assert(
      !fs.existsSync(path.join(tmp, '.cursor', 'skills')),
      'uninstall left .cursor/skills behind',
    );

    const gitignore = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8');
    assert(!gitignore.includes(GITIGNORE_BEGIN), 'gitignore block not removed');

    process.stdout.write('test-install: all checks passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Installing must be ADDITIVE: it may never delete a user's own .claude/ config.
function runAdditive() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-additive-`));

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');

    // Pre-existing user config the install must not touch.
    fs.mkdirSync(path.join(tmp, '.claude', 'commands'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.claude', 'settings.local.json'), '{ "mine": true }\n');
    fs.writeFileSync(path.join(tmp, '.claude', 'commands', 'my-own.md'), '# my own command\n');

    const init = spawnSync(
      process.execPath,
      [CLI, 'init', 'claude', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(init.status === 0, `additive init failed: ${init.stderr}`);

    // User files survive untouched.
    assert(
      fs.readFileSync(path.join(tmp, '.claude', 'settings.local.json'), 'utf8').includes('mine'),
      'install destroyed user .claude/settings.local.json',
    );
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'commands', 'my-own.md')),
      'install destroyed user .claude/commands/my-own.md',
    );
    // Our commands landed alongside as real files (physical copy, not symlinks).
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'commands', 'teikk-build.md')),
      'teikk command not copied into merged .claude/commands',
    );
    assert(
      !fs.lstatSync(path.join(tmp, '.claude', 'commands', 'teikk-build.md')).isSymbolicLink(),
      '.claude/commands/teikk-build.md should be a real file, not a symlink',
    );

    const uninstall = spawnSync(
      process.execPath,
      [CLI, 'uninstall', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(uninstall.status === 0, `additive uninstall failed: ${uninstall.stderr}`);

    // Uninstall removes only our files; the user's files remain.
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'settings.local.json')),
      'uninstall removed user settings.local.json',
    );
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'commands', 'my-own.md')),
      'uninstall removed user command my-own.md',
    );
    assert(
      !fs.existsSync(path.join(tmp, '.claude', 'commands', 'teikk-build.md')),
      'uninstall left our teikk-build.md file behind',
    );

    process.stdout.write('test-install: additive (non-destructive) checks passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// A 1.x install symlinked the whole .claude/ dir. Upgrading in place must drop
// that stale link and copy fresh files into .claude/commands — never write
// through the old symlink.
function runLegacyUpgrade() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-legacy-`));
  // Isolated fake legacy dir — must NEVER be the real ~/.teikk-agents-skills.
  const fakeLegacyDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-fake-legacy-`)));
  const env = { ...process.env, TEIKK_AGENTS_SKILLS_TEST_LEGACY_DIR: fakeLegacyDir };

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');

    // Simulate the 1.x layout: .claude -> <fakeLegacyDir>/.claude
    const legacyTarget = path.join(fakeLegacyDir, '.claude');
    fs.mkdirSync(legacyTarget, { recursive: true });
    fs.symlinkSync(legacyTarget, path.join(tmp, '.claude'));

    const init = spawnSync(
      process.execPath,
      [CLI, 'init', 'claude', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8', env },
    );
    assert(init.status === 0, `legacy upgrade failed: ${init.stderr}`);

    // .claude is now a real dir; .claude/commands holds real copied files.
    assert(
      !fs.lstatSync(path.join(tmp, '.claude')).isSymbolicLink(),
      'legacy whole-.claude symlink was not migrated',
    );
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'commands', 'teikk-build.md')),
      'commands not copied after legacy migration',
    );
    assert(
      !fs.lstatSync(path.join(tmp, '.claude', 'commands', 'teikk-build.md')).isSymbolicLink(),
      'commands should be real files after legacy migration',
    );

    process.stdout.write('test-install: legacy 1.x upgrade migration passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(fakeLegacyDir, { recursive: true, force: true });
  }
}

// A 2.x install symlinked every copy path into the shared global cache.
// Upgrading in place must drop every one of those stale links and replace
// them with real, project-local copies.
function runV2Migration() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-v2migration-`));
  // Isolated fake legacy dir — must NEVER be the real ~/.teikk-agents-skills.
  const fakeLegacyDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-fake-legacy-`)));
  const env = { ...process.env, TEIKK_AGENTS_SKILLS_TEST_LEGACY_DIR: fakeLegacyDir };

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');

    // Legacy links live at the OLD root paths a pre-3.0 install created.
    const legacyLinkPaths = ['.claude/commands', 'hooks', 'skills', 'agents', 'references'];
    for (const relPath of legacyLinkPaths) {
      const legacyTarget = path.join(fakeLegacyDir, relPath);
      fs.mkdirSync(legacyTarget, { recursive: true });
      fs.writeFileSync(path.join(legacyTarget, 'stale-marker.txt'), 'stale\n');
      const absLink = path.join(tmp, relPath);
      fs.mkdirSync(path.dirname(absLink), { recursive: true });
      fs.symlinkSync(legacyTarget, absLink);
    }
    // NOTE: AGENTS.md is no longer shipped by any target (see lib/targets.js).
    // We don't simulate a legacy AGENTS.md symlink here — pre-3.0 installs that
    // symlinked it are the user's own file to clean up, not ours to migrate.

    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'claude', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8', env },
    );
    assert(update.status === 0, `v2 migration failed: ${update.stderr}`);

    // .claude/commands is repopulated as a real dir; the bare-root legacy links
    // (skills/agents/references/hooks) are dropped and content now lives under
    // .claude/{skills,agents,hooks}, so those root paths must be gone.
    assert(
      !fs.lstatSync(path.join(tmp, '.claude', 'commands')).isSymbolicLink(),
      '.claude/commands should no longer be a symlink after v2 migration',
    );
    for (const relPath of ['skills', 'agents', 'references', 'hooks']) {
      assert(
        !fs.existsSync(path.join(tmp, relPath)),
        `legacy root ${relPath}/ should be gone after v2 migration`,
      );
    }
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'commands', 'teikk-build.md')),
      'commands not repopulated after v2 migration',
    );
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'skills', 'spec-driven-development', 'SKILL.md')) &&
        !fs.lstatSync(path.join(tmp, '.claude', 'skills')).isSymbolicLink(),
      '.claude/skills should be a real dir after v2 migration',
    );

    process.stdout.write('test-install: legacy 2.x symlink migration passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(fakeLegacyDir, { recursive: true, force: true });
  }
}

// Files the package used to ship but no longer does must be cleaned up on
// update, not left behind forever as orphaned copies.
function runStaleCleanup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-stale-`));

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');

    const init = spawnSync(
      process.execPath,
      [CLI, 'init', 'cursor', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(init.status === 0, `stale-cleanup init failed: ${init.stderr}`);

    // Simulate a leftover from a previous package version: a file physically
    // present and tracked as ours, but no longer produced by packageRoot.
    const staleRel = path.join('.cursor', 'skills', '__fake-removed-skill__', 'SKILL.md');
    fs.mkdirSync(path.dirname(path.join(tmp, staleRel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, staleRel), '# stale\n');

    const manifestPath = path.join(tmp, MANIFEST_FILE);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.files.push(staleRel.split(path.sep).join('/'));
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'cursor', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(update.status === 0, `stale-cleanup update failed: ${update.stderr}`);

    const skillsTree = path.join(tmp, '.cursor', 'skills');
    assert(
      !fs.existsSync(path.join(skillsTree, '__fake-removed-skill__')),
      'stale owned file/directory was not cleaned up on update',
    );
    assert(
      fs.existsSync(skillsTree) && fs.readdirSync(skillsTree).length > 0,
      'real skill files should remain after stale cleanup',
    );

    process.stdout.write('test-install: stale-file cleanup on update passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Regression for the symlink-era → copy-model upgrade: a prior release left
// `<toolDir>/skills` and `<toolDir>/agents` as symlinks into `.teikk-agents/`.
// The copy install MUST unlink them first, or copyOrMerge silently skips the
// symlink and installs zero skills. This test would fail (empty skills dir)
// before the dropLegacyLinks(dropAny) fix.
function runSymlinkToCopyUpgrade() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-symlink-upgrade-`));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');

    // Simulate the old layout: a real .teikk-agents/skills tree owned via the
    // manifest + a .opencode/skills symlink into it (exactly what the prior
    // symlink-era release wrote).
    const shared = path.join(tmp, '.teikk-agents', 'skills', 'old-skill');
    fs.mkdirSync(shared, { recursive: true });
    fs.writeFileSync(path.join(shared, 'SKILL.md'), '# old\n');
    fs.mkdirSync(path.join(tmp, '.opencode'), { recursive: true });
    fs.symlinkSync(
      path.join('..', '.teikk-agents', 'skills'),
      path.join(tmp, '.opencode', 'skills'),
    );
    fs.writeFileSync(
      path.join(tmp, MANIFEST_FILE),
      `${JSON.stringify({ version: HUB_VERSION, targets: ['opencode'], files: ['.teikk-agents/skills/old-skill/SKILL.md'], package: PACKAGE_NAME }, null, 2)}\n`,
    );

    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'opencode', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(update.status === 0, `symlink→copy upgrade failed: ${update.stderr}`);

    const skillsDir = path.join(tmp, '.opencode', 'skills');
    assert(
      !fs.lstatSync(skillsDir).isSymbolicLink(),
      '.opencode/skills should be a real dir after upgrade, not the old symlink',
    );
    assert(
      fs.existsSync(path.join(skillsDir, 'spec-driven-development', 'SKILL.md')),
      'skills silently not copied — the symlink→copy upgrade bug regressed',
    );
    assert(
      !fs.existsSync(path.join(tmp, '.teikk-agents')),
      'old .teikk-agents/ tree should be pruned after upgrade',
    );

    process.stdout.write('test-install: symlink→copy upgrade passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// The claude target's hooks/hooks.json uses ${CLAUDE_PLUGIN_ROOT}, which only
// resolves for plugin-marketplace installs. A plain npm/CLI install must wire
// the same lifecycle hooks into the project's own .claude/settings.json
// (rewritten to ${CLAUDE_PROJECT_DIR}), additively — preserving any hooks or
// other settings the user already had — and unwire only what it added on
// uninstall.
function runClaudeHooksWiring() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-claude-hooks-`));

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');

    // Pre-existing user settings.json with its own hook and permissions —
    // must survive both install and uninstall untouched.
    fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.claude', 'settings.json'),
      `${JSON.stringify(
        {
          permissions: { allow: ['Bash(git status)'] },
          hooks: {
            PreToolUse: [
              { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo custom-hook' }] },
            ],
          },
        },
        null,
        2,
      )}\n`,
    );

    const init = spawnSync(
      process.execPath,
      [CLI, 'init', 'claude', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(init.status === 0, `claude-hooks init failed: ${init.stderr}`);

    const settingsPath = path.join(tmp, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    // User's own hook and permissions preserved.
    assert(
      settings.permissions?.allow?.includes('Bash(git status)'),
      'install destroyed user permissions in settings.json',
    );
    assert(
      settings.hooks.PreToolUse?.[0]?.hooks?.[0]?.command === 'echo custom-hook',
      'install destroyed user PreToolUse hook in settings.json',
    );

    // All 7 lifecycle events wired, rewritten to ${CLAUDE_PROJECT_DIR}.
    for (const event of [
      'SessionStart',
      'PreCompact',
      'TaskCreated',
      'TaskCompleted',
      'SubagentStart',
      'SubagentStop',
      'Stop',
    ]) {
      const commands = (settings.hooks[event] || []).flatMap((g) => g.hooks.map((h) => h.command));
      assert(commands.length > 0, `${event} hook not wired into settings.json`);
      assert(
        commands.some((c) => c.includes('${CLAUDE_PROJECT_DIR}')),
        `${event} hook command not rewritten to \${CLAUDE_PROJECT_DIR}`,
      );
      assert(
        !commands.some((c) => c.includes('${CLAUDE_PLUGIN_ROOT}')),
        `${event} hook command still references \${CLAUDE_PLUGIN_ROOT}`,
      );
      assert(
        commands.some((c) => c.startsWith('[ -f "')),
        `${event} hook command missing the existence guard (.claude/settings.json is committed to git, ` +
          'not gitignored, so it must degrade gracefully for a teammate who pulled it before running init)',
      );
    }

    // The wired hook is actually runnable from its new nested home: its
    // dependency .claude/lib/telemetry.sh must have been copied alongside
    // .claude/hooks/, and firing the hook must produce valid, parseable JSONL.
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'lib', 'telemetry.sh')),
      '.claude/lib/telemetry.sh not copied — lifecycle-telemetry.sh hook would silently no-op',
    );
    const fired = spawnSync('bash', [path.join(tmp, '.claude', 'hooks', 'lifecycle-telemetry.sh'), 'TaskCreated'], {
      cwd: tmp,
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmp },
    });
    assert(fired.status === 0, `lifecycle-telemetry.sh TaskCreated exited nonzero: ${fired.stderr}`);
    const eventsPath = path.join(tmp, '.teikk', 'cache', 'telemetry', 'events.jsonl');
    assert(fs.existsSync(eventsPath), 'firing the wired hook did not write events.jsonl');
    const lines = fs.readFileSync(eventsPath, 'utf8').trim().split('\n');
    let parsed;
    try {
      parsed = JSON.parse(lines[lines.length - 1]);
    } catch (err) {
      throw new Error(`hook emitted malformed JSON: ${lines[lines.length - 1]} (${err.message})`);
    }
    assert(parsed.event === 'task_started', `expected task_started event, got ${JSON.stringify(parsed)}`);
    assert(
      typeof parsed.meta === 'object' && parsed.meta !== null,
      `meta field did not parse as an object: ${JSON.stringify(parsed)}`,
    );

    // .claude/settings.json is committed to git (not gitignored), but
    // hooks/lib/telemetry.sh are. A teammate who pulls the committed
    // settings.json before ever running `init claude` must not see the
    // hook command blow up — the guard must make it a silent, exit-0 no-op.
    const teammateCommand = settings.hooks.TaskCreated[0].hooks[0].command;
    const noHooksDir = spawnSync('sh', ['-c', teammateCommand], {
      cwd: tmp,
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: path.join(tmp, 'no-hooks-here') },
    });
    assert(
      noHooksDir.status === 0,
      `guarded hook command exited nonzero when hooks/ is missing (teammate-without-init scenario): ${noHooksDir.stderr}`,
    );

    // Manifest records exactly what was wired, so uninstall can remove only that.
    // Count derived from the canonical hooks/hooks.json (one entry per hook,
    // not per event — SessionStart and PreCompact each have two entries).
    const expectedHookCount = Object.values(
      JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks,
    ).reduce((n, groups) => n + groups.reduce((m, g) => m + (g.hooks || []).length, 0), 0);
    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST_FILE), 'utf8'));
    assert(
      Array.isArray(manifest.claudeHooks) && manifest.claudeHooks.length === expectedHookCount,
      `manifest.claudeHooks length mismatch — expected ${expectedHookCount} from hooks/hooks.json, got ${manifest.claudeHooks?.length}`,
    );

    // Re-running install (update) must not duplicate hook entries.
    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'claude', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(update.status === 0, `claude-hooks update failed: ${update.stderr}`);
    const settingsAfterUpdate = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert(
      settingsAfterUpdate.hooks.Stop.length === 1,
      're-running install duplicated an already-wired hook entry',
    );

    const uninstall = spawnSync(
      process.execPath,
      [CLI, 'uninstall', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(uninstall.status === 0, `claude-hooks uninstall failed: ${uninstall.stderr}`);

    const settingsAfterUninstall = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert(
      settingsAfterUninstall.permissions?.allow?.includes('Bash(git status)'),
      'uninstall destroyed user permissions in settings.json',
    );
    assert(
      settingsAfterUninstall.hooks.PreToolUse?.[0]?.hooks?.[0]?.command === 'echo custom-hook',
      'uninstall destroyed user PreToolUse hook in settings.json',
    );
    assert(
      !settingsAfterUninstall.hooks.Stop,
      'uninstall left our Stop lifecycle hook behind',
    );

    process.stdout.write('test-install: claude lifecycle hook auto-wiring passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// scripts/{benchmark,decisions,rollback} are shared user-facing CLI tools
// copied alongside skills/agents/references — `scripts/` is a directory name
// common enough in user projects that the merge must not disturb anything
// the user put there themselves, on either install or uninstall.
function runSharedScripts() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-shared-scripts-`));

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'scripts', 'my-build.js'), '// my own build script\n');

    const init = spawnSync(
      process.execPath,
      [CLI, 'init', 'cursor', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(init.status === 0, `shared-scripts init failed: ${init.stderr}`);

    assert(
      fs.readFileSync(path.join(tmp, 'scripts', 'my-build.js'), 'utf8').includes('my own build script'),
      'install destroyed user scripts/my-build.js',
    );
    for (const script of [
      'benchmark.js',
      'check-open-questions.sh',
      'check-request-overlap.sh',
      'check-traceability.sh',
      'check-phase-build.sh',
      'check-phase-tests.sh',
      'decisions.js',
      'phase-status.sh',
      'rollback.sh',
    ]) {
      assert(fs.existsSync(path.join(tmp, 'scripts', script)), `scripts/${script} not copied`);
    }

    const uninstall = spawnSync(
      process.execPath,
      [CLI, 'uninstall', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(uninstall.status === 0, `shared-scripts uninstall failed: ${uninstall.stderr}`);

    assert(
      fs.existsSync(path.join(tmp, 'scripts', 'my-build.js')),
      'uninstall removed user scripts/my-build.js',
    );
    for (const script of [
      'benchmark.js',
      'check-open-questions.sh',
      'check-request-overlap.sh',
      'check-traceability.sh',
      'check-phase-build.sh',
      'check-phase-tests.sh',
      'decisions.js',
      'phase-status.sh',
      'rollback.sh',
    ]) {
      assert(
        !fs.existsSync(path.join(tmp, 'scripts', script)),
        `uninstall left scripts/${script} behind`,
      );
    }

    process.stdout.write('test-install: shared scripts/ preserve user files passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function runPlatformPackSelection() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-platform-pack-`));

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');
    fs.mkdirSync(path.join(tmp, '.teikk', 'spec'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.teikk', 'spec', 'PROJECT.yaml'), 'platform: flutter\n');

    const init = spawnSync(
      process.execPath,
      [CLI, 'init', 'opencode', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(init.status === 0, `flutter pack install failed: ${init.stderr}`);
    assert(
      fs.existsSync(path.join(tmp, '.opencode', 'skills', 'flutter-ui', 'SKILL.md')),
      'flutter platform must install the flutter skill pack',
    );
    for (const skill of [
      'flutter-ui',
      'flutter-data-and-concurrency',
      'flutter-di-and-build',
      'flutter-testing-and-benchmark',
      'flutter-error-handling',
      'flutter-state-riverpod',
      'flutter-state-bloc',
      'flutter-state-provider',
      'flutter-navigation',
      'flutter-di',
      'flutter-data-networking',
      'flutter-data-persistence',
      'flutter-project-structure',
      'flutter-theming',
      'flutter-localization',
      'flutter-e2e',
      'flutter-animations',
    ]) {
      assert(
        fs.existsSync(path.join(tmp, '.opencode', 'skills', skill, 'SKILL.md')),
        `flutter platform must install the ${skill} skill`,
      );
    }
    for (const agent of ['flutter-expert.md', 'flutter-performance-auditor.md']) {
      assert(
        fs.existsSync(path.join(tmp, '.opencode', 'agents', agent)),
        `flutter platform must install the ${agent} agent`,
      );
    }

    fs.writeFileSync(path.join(tmp, '.teikk', 'spec', 'PROJECT.yaml'), 'platforms: [ios, android]\n');
    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'opencode', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(update.status === 0, `ambiguous legacy platform update failed: ${update.stderr}`);
    assert(
      !fs.existsSync(path.join(tmp, '.opencode', 'skills', 'flutter-ui')),
      'ambiguous legacy platforms must install core only, not retain a platform pack',
    );
    assert(
      update.stderr.includes('install core only'),
      'ambiguous legacy platforms must emit the migration warning',
    );

    process.stdout.write('test-install: platform pack selection passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function runOmpTarget() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-omp-`));

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');

    const init = spawnSync(
      process.execPath,
      [CLI, 'init', 'omp', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(init.status === 0, `init omp failed: ${init.stderr}`);

    assert(fs.existsSync(path.join(tmp, '.omp', 'commands')), 'missing .omp/commands');
    assert(
      fs.existsSync(path.join(tmp, '.omp', 'commands', 'teikk-spec.md')),
      'missing .omp/commands/teikk-spec.md',
    );
    assert(
      fs.existsSync(path.join(tmp, '.omp', 'commands', 'teikk-ship.md')),
      'missing .omp/commands/teikk-ship.md',
    );
    assert(
      fs.existsSync(path.join(tmp, '.omp', 'skills', 'spec-driven-development', 'SKILL.md')),
      'missing .omp/skills — skills must be physically copied into .omp/skills',
    );
    assert(
      !fs.lstatSync(path.join(tmp, '.omp', 'skills')).isSymbolicLink(),
      '.omp/skills should be a real directory, not a symlink',
    );
    assert(
      fs.existsSync(
        path.join(tmp, '.omp', 'skills', 'code-review-and-quality', 'references', 'domain-guardrails.md'),
      ),
      'missing bundled reference in .omp/skills',
    );
    assert(
      fs.existsSync(path.join(tmp, '.omp', 'agents', 'code-reviewer.md')),
      '.omp/agents must be physically copied',
    );
    assert(
      !fs.lstatSync(path.join(tmp, '.omp', 'agents')).isSymbolicLink(),
      '.omp/agents should be a real directory, not a symlink',
    );
    for (const script of [
      'benchmark.js',
      'check-open-questions.sh',
      'check-request-overlap.sh',
      'check-traceability.sh',
      'check-phase-build.sh',
      'check-phase-tests.sh',
      'decisions.js',
      'phase-status.sh',
      'rollback.sh',
    ]) {
      assert(
        fs.existsSync(path.join(tmp, 'scripts', script)),
        `missing scripts/${script} for omp target`,
      );
    }

    const gitignoreContent = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8');
    assert(gitignoreContent.includes(GITIGNORE_BEGIN), 'missing gitignore begin marker');
    assert(gitignoreContent.includes(GITIGNORE_END), 'missing gitignore end marker');
    assert(gitignoreContent.includes('.teikk/'), 'missing .teikk/ in gitignore');
    assert(gitignoreContent.includes('.omp/commands/'), 'missing .omp/commands/ in gitignore');
    assert(gitignoreContent.includes('.omp/skills/'), 'missing .omp/skills/ in gitignore');
    assert(gitignoreContent.includes('.omp/agents/'), 'missing .omp/agents/ in gitignore');

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST_FILE), 'utf8'));
    assert(manifest.targets.includes('omp'), 'manifest missing omp');

    // Test platform pack update for omp
    fs.mkdirSync(path.join(tmp, '.teikk', 'spec'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.teikk', 'spec', 'PROJECT.yaml'), 'platform: android\n');

    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'omp', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(update.status === 0, `update omp failed: ${update.stderr}`);
    assert(
      fs.existsSync(path.join(tmp, '.omp', 'skills', 'android-ui-kotlin', 'SKILL.md')),
      'missing Android skill in .omp/skills after update',
    );
    assert(
      fs.existsSync(path.join(tmp, '.omp', 'agents', 'kotlin-specialist.md')),
      'missing Android agent in .omp/agents after update',
    );

    // Test clean uninstall
    const uninstall = spawnSync(
      process.execPath,
      [CLI, 'uninstall', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(uninstall.status === 0, `uninstall failed: ${uninstall.stderr}`);
    assert(!fs.existsSync(path.join(tmp, MANIFEST_FILE)), 'manifest not removed');
    assert(!fs.existsSync(path.join(tmp, '.omp', 'commands')), 'uninstall left .omp/commands behind');
    assert(!fs.existsSync(path.join(tmp, '.omp', 'skills')), 'uninstall left .omp/skills behind');
    assert(!fs.existsSync(path.join(tmp, '.omp', 'agents')), 'uninstall left .omp/agents behind');

    const gitignoreAfter = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8');
    assert(!gitignoreAfter.includes(GITIGNORE_BEGIN), 'gitignore block not removed');

    process.stdout.write('test-install: omp target tests passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

run();
runAdditive();
runLegacyUpgrade();
runV2Migration();
runSymlinkToCopyUpgrade();
runStaleCleanup();
runClaudeHooksWiring();
runSharedScripts();
runPlatformPackSelection();
runOmpTarget();
