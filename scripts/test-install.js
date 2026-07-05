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

    readGitignoreBlock(tmp);

    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'opencode', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(update.status === 0, `update failed: ${update.stderr}`);
    assert(fs.existsSync(path.join(tmp, '.opencode', 'skills')), 'missing .opencode/skills symlink');

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST_FILE), 'utf8'));
    assert(manifest.targets.includes('cursor'), 'manifest missing cursor');
    assert(manifest.targets.includes('opencode'), 'manifest missing opencode');

    const uninstall = spawnSync(
      process.execPath,
      [CLI, 'uninstall', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(uninstall.status === 0, `uninstall failed: ${uninstall.stderr}`);
    assert(!fs.existsSync(path.join(tmp, MANIFEST_FILE)), 'manifest not removed');

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
    // Our commands landed alongside as symlinks.
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'commands', 'teikk-build.md')),
      'teikk command not linked into merged .claude/commands',
    );

    const uninstall = spawnSync(
      process.execPath,
      [CLI, 'uninstall', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(uninstall.status === 0, `additive uninstall failed: ${uninstall.stderr}`);

    // Uninstall removes only our links; the user's files remain.
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
      'uninstall left our teikk-build.md link behind',
    );

    process.stdout.write('test-install: additive (non-destructive) checks passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// A 1.x install symlinked the whole .claude/ dir. Upgrading in place must drop
// that stale link and re-link only .claude/commands — never write through it.
function runLegacyUpgrade() {
  const { GLOBAL_DIR } = require('../lib/constants');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${PACKAGE_NAME}-legacy-`));

  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ "name": "fixture-app" }\n');

    // Simulate the 1.x layout: .claude -> ~/.teikk-agents-skills/.claude
    const legacyTarget = path.join(GLOBAL_DIR, '.claude');
    fs.mkdirSync(legacyTarget, { recursive: true });
    fs.symlinkSync(legacyTarget, path.join(tmp, '.claude'));

    const init = spawnSync(
      process.execPath,
      [CLI, 'init', 'claude', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(init.status === 0, `legacy upgrade failed: ${init.stderr}`);

    // .claude is now a real dir; .claude/commands is a fresh link to the store.
    assert(
      !fs.lstatSync(path.join(tmp, '.claude')).isSymbolicLink(),
      'legacy whole-.claude symlink was not migrated',
    );
    assert(
      fs.existsSync(path.join(tmp, '.claude', 'commands', 'teikk-build.md')),
      'commands not linked after legacy migration',
    );

    process.stdout.write('test-install: legacy 1.x upgrade migration passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

run();
runAdditive();
runLegacyUpgrade();
