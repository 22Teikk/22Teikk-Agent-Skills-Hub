'use strict';

/**
 * Optional postinstall: reads TEIKK_AGENTS_SKILLS_TARGET env var or
 * package.json → "teikk-agents-skills".target from the consuming project.
 */
const fs = require('fs');
const path = require('path');
const { PACKAGE_NAME, CONFIG_KEY, ENV_TARGET, ENV_SKIP_POSTINSTALL } = require('../lib/constants');

function readConsumerConfig(projectRoot) {
  const envTarget = process.env[ENV_TARGET];
  if (envTarget) {
    return envTarget;
  }

  const consumerPkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(consumerPkgPath)) {
    return null;
  }

  try {
    const consumerPkg = JSON.parse(fs.readFileSync(consumerPkgPath, 'utf8'));
    return consumerPkg[CONFIG_KEY]?.target || null;
  } catch {
    return null;
  }
}

function main() {
  if (process.env[ENV_SKIP_POSTINSTALL] === '1') {
    return;
  }

  const packageRoot = path.resolve(__dirname, '..');
  const initScript = path.join(packageRoot, 'bin', 'teikk-agents-skills.js');

  let projectRoot = process.env.INIT_CWD || process.cwd();
  if (projectRoot.includes(`${path.sep}node_modules${path.sep}${PACKAGE_NAME}`)) {
    projectRoot = path.resolve(packageRoot, '..', '..', '..');
  }

  const target = readConsumerConfig(projectRoot);
  if (!target) {
    process.stderr.write(
      `${PACKAGE_NAME}: skipped postinstall (set ${ENV_TARGET} or package.json → ${CONFIG_KEY}.target to auto-install)\n`,
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
