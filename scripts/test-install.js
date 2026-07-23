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
    assert(fs.existsSync(path.join(tmp, 'skills')), 'missing skills/');
    assert(fs.existsSync(path.join(tmp, MANIFEST_FILE)), 'missing manifest');
    assert(
      !fs.lstatSync(path.join(tmp, 'skills')).isSymbolicLink(),
      'skills/ should be a real directory, not a symlink',
    );
    for (const script of ['benchmark.js', 'decisions.js', 'rollback.sh']) {
      assert(
        fs.existsSync(path.join(tmp, 'scripts', script)),
        `missing scripts/${script} — user-facing CLI tools should be usable in-project, no clone needed`,
      );
    }

    readGitignoreBlock(tmp);

    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'opencode', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(update.status === 0, `update failed: ${update.stderr}`);
    assert(fs.existsSync(path.join(tmp, '.opencode', 'skills')), 'missing .opencode/skills symlink');
    assert(
      fs.lstatSync(path.join(tmp, '.opencode', 'skills')).isSymbolicLink(),
      '.opencode/skills should remain an in-project symlink',
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
    assert(!fs.existsSync(path.join(tmp, 'skills')), 'uninstall left skills/ behind');

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

    const v2Paths = ['.claude/commands', 'hooks', 'skills', 'agents', 'references'];
    for (const relPath of v2Paths) {
      const legacyTarget = path.join(fakeLegacyDir, relPath);
      fs.mkdirSync(legacyTarget, { recursive: true });
      fs.writeFileSync(path.join(legacyTarget, 'stale-marker.txt'), 'stale\n');
      const absLink = path.join(tmp, relPath);
      fs.mkdirSync(path.dirname(absLink), { recursive: true });
      fs.symlinkSync(legacyTarget, absLink);
    }

    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'claude', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8', env },
    );
    assert(update.status === 0, `v2 migration failed: ${update.stderr}`);

    for (const relPath of v2Paths) {
      const abs = path.join(tmp, relPath);
      assert(
        !fs.lstatSync(abs).isSymbolicLink(),
        `${relPath} should no longer be a symlink after v2 migration`,
      );
    }
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'commands', 'teikk-build.md')),
      'commands not repopulated after v2 migration',
    );
    assert(
      !fs.existsSync(path.join(tmp, 'skills', 'stale-marker.txt')),
      'stale marker from legacy global cache leaked into project',
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
    const staleRel = path.join('skills', '__fake-removed-skill__', 'SKILL.md');
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

    assert(
      !fs.existsSync(path.join(tmp, 'skills', '__fake-removed-skill__')),
      'stale owned file/directory was not cleaned up on update',
    );
    assert(
      fs.existsSync(path.join(tmp, 'skills')) && fs.readdirSync(path.join(tmp, 'skills')).length > 0,
      'real skill files should remain after stale cleanup',
    );

    process.stdout.write('test-install: stale-file cleanup on update passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// The claude target's hooks/hooks.json uses ${CLAUDE_PLUGIN_ROOT}, which only
// resolves for plugin-marketplace installs. A plain npm/CLI install must wire
// the same 7 lifecycle hooks into the project's own .claude/settings.json
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

    // The wired hook is actually runnable: lib/telemetry.sh (its dependency)
    // must have been copied alongside hooks/, and firing the hook must
    // produce valid, parseable JSONL.
    assert(
      fs.existsSync(path.join(tmp, 'lib', 'telemetry.sh')),
      'lib/telemetry.sh not copied — lifecycle-telemetry.sh hook would silently no-op',
    );
    const fired = spawnSync('bash', [path.join(tmp, 'hooks', 'lifecycle-telemetry.sh'), 'TaskCreated'], {
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
    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST_FILE), 'utf8'));
    assert(
      Array.isArray(manifest.claudeHooks) && manifest.claudeHooks.length === 7,
      'manifest missing claudeHooks list',
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
    for (const script of ['benchmark.js', 'decisions.js', 'rollback.sh']) {
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
    for (const script of ['benchmark.js', 'decisions.js', 'rollback.sh']) {
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

run();
runAdditive();
runLegacyUpgrade();
runV2Migration();
runStaleCleanup();
runClaudeHooksWiring();
runSharedScripts();
