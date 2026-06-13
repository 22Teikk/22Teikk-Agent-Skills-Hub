'use strict';

/**
 * Optional postinstall: reads AGENT_SKILLS_TARGET env var or
 * package.json → "agent-skills".target from the consuming project.
 */
const fs = require('fs');
const path = require('path');

function readConsumerConfig(projectRoot) {
  const envTarget = process.env.AGENT_SKILLS_TARGET;
  if (envTarget) {
    return envTarget;
  }

  const consumerPkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(consumerPkgPath)) {
    return null;
  }

  try {
    const consumerPkg = JSON.parse(fs.readFileSync(consumerPkgPath, 'utf8'));
    return consumerPkg['agent-skills']?.target || null;
  } catch {
    return null;
  }
}

function main() {
  if (process.env.AGENT_SKILLS_SKIP_POSTINSTALL === '1') {
    return;
  }

  const packageRoot = path.resolve(__dirname, '..');
  const initScript = path.join(packageRoot, 'bin', 'agent-skills.js');

  let projectRoot = process.env.INIT_CWD || process.cwd();
  if (projectRoot.includes(`${path.sep}node_modules${path.sep}agent-skills`)) {
    projectRoot = path.resolve(packageRoot, '..', '..', '..');
  }

  const target = readConsumerConfig(projectRoot);
  if (!target) {
    process.stderr.write(
      'agent-skills: skipped postinstall (set AGENT_SKILLS_TARGET or package.json → agent-skills.target to auto-install)\n',
    );
    return;
  }

  const { spawnSync } = require('child_process');
  const result = spawnSync(
    process.execPath,
    [initScript, 'init', target, '--cwd', projectRoot, '--package-root', packageRoot],
    { stdio: 'inherit' },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main();
