#!/usr/bin/env node
'use strict';

/**
 * Smoke test for npm install flow — runs in CI without publishing.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'bin', 'agent-skills.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readGitignoreBlock(projectRoot) {
  const content = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf8');
  assert(content.includes('# BEGIN agent-skills'), 'missing gitignore begin marker');
  assert(content.includes('# END agent-skills'), 'missing gitignore end marker');
  assert(content.includes('SPEC.md'), 'missing SPEC.md in gitignore');
  assert(content.includes('.cursor/'), 'missing .cursor/ in gitignore');
  return content;
}

function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-test-'));

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
    assert(fs.existsSync(path.join(tmp, '.agent-skills.json')), 'missing manifest');

    readGitignoreBlock(tmp);

    const update = spawnSync(
      process.execPath,
      [CLI, 'update', 'opencode', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(update.status === 0, `update failed: ${update.stderr}`);
    assert(fs.existsSync(path.join(tmp, '.opencode', 'skills')), 'missing .opencode/skills symlink');

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, '.agent-skills.json'), 'utf8'));
    assert(manifest.targets.includes('cursor'), 'manifest missing cursor');
    assert(manifest.targets.includes('opencode'), 'manifest missing opencode');

    const uninstall = spawnSync(
      process.execPath,
      [CLI, 'uninstall', '--cwd', tmp, '--package-root', REPO_ROOT],
      { encoding: 'utf8' },
    );
    assert(uninstall.status === 0, `uninstall failed: ${uninstall.stderr}`);
    assert(!fs.existsSync(path.join(tmp, '.agent-skills.json')), 'manifest not removed');

    const gitignore = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8');
    assert(!gitignore.includes('# BEGIN agent-skills'), 'gitignore block not removed');

    process.stdout.write('test-install: all checks passed\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

run();
