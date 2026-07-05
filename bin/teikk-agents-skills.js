#!/usr/bin/env node
'use strict';

const path = require('path');
const { findPackageRoot, install, uninstall, describeTargets } = require('../lib/install');
const { TARGET_NAMES } = require('../lib/targets');
const { PACKAGE_NAME, CONFIG_KEY, ENV_TARGET } = require('../lib/constants');

const pkg = require('../package.json');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cwd') {
      args.cwd = argv[++i];
    } else if (arg === '--package-root') {
      args.packageRoot = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (!arg.startsWith('-')) {
      args._.push(arg);
    }
  }
  return args;
}

function printHelp() {
  const targetLines = TARGET_NAMES.map((name) => `  ${name.padEnd(12)}`).join('\n');
  process.stdout.write(`${PACKAGE_NAME} — install engineering skills for AI coding agents (22Teikk)

Usage:
  ${PACKAGE_NAME} init <target> [--cwd <dir>]
  ${PACKAGE_NAME} update [<target>] [--cwd <dir>]
  ${PACKAGE_NAME} uninstall [--cwd <dir>]
  ${PACKAGE_NAME} targets

Targets:
${targetLines}  all           Install every supported target

Examples:
  npx ${PACKAGE_NAME} init cursor
  npm install ${PACKAGE_NAME} --save-dev && npx ${PACKAGE_NAME} init cursor
  npx ${PACKAGE_NAME} init all --cwd ./my-app

Auto-install (optional):
  Set "${CONFIG_KEY}": { "target": "cursor" } in your package.json, or
  ${ENV_TARGET}=cursor npm install ${PACKAGE_NAME}

Each init/update copies IDE-specific config into your project and appends a
managed block to .gitignore (workflow artifacts + installed ${PACKAGE_NAME} files).
`);
}

function resolveRoots(args) {
  const projectRoot = path.resolve(args.cwd || process.cwd());
  const packageRoot = args.packageRoot
    ? path.resolve(args.packageRoot)
    : findPackageRoot(path.dirname(__dirname));
  return { projectRoot, packageRoot };
}

function runInit(args) {
  const target = args._[1];
  if (!target) {
    process.stderr.write(`Error: missing target. Example: ${PACKAGE_NAME} init cursor\n`);
    process.exit(1);
  }

  const { projectRoot, packageRoot } = resolveRoots(args);
  const result = install({
    projectRoot,
    packageRoot,
    targetInput: target,
    version: pkg.version,
  });

  process.stderr.write(`${PACKAGE_NAME} ${pkg.version} installed for: ${result.targets.join(', ')}\n`);
  process.stderr.write(`Project: ${projectRoot}\n`);
  process.stderr.write('Copied:\n');
  for (const item of result.copied) {
    process.stderr.write(`  - ${item}\n`);
  }
  process.stderr.write(`Updated .gitignore (${result.gitignorePatterns.length} patterns)\n`);
  if (result.skipped && result.skipped.length) {
    process.stderr.write('Left untouched (your own files — not overwritten):\n');
    for (const item of result.skipped) {
      process.stderr.write(`  - ${item}\n`);
    }
  }
}

function runUpdate(args) {
  const target = args._[1] || 'all';
  runInit({ ...args, _: ['init', target] });
}

function runUninstall(args) {
  const { projectRoot } = resolveRoots(args);
  const result = uninstall({ projectRoot });
  process.stderr.write(`Removed ${PACKAGE_NAME} for: ${result.targets.join(', ')}\n`);
  for (const item of result.removed) {
    process.stderr.write(`  - ${item}\n`);
  }
  process.stderr.write('Cleaned .gitignore block and manifest\n');
}

function runTargets() {
  const rows = describeTargets('all');
  for (const row of rows) {
    process.stdout.write(`${row.name.padEnd(12)} ${row.label} — ${row.description}\n`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const command = args._[0];
  try {
    switch (command) {
      case 'init':
        runInit(args);
        break;
      case 'update':
        runUpdate(args);
        break;
      case 'uninstall':
        runUninstall(args);
        break;
      case 'targets':
        runTargets();
        break;
      default:
        process.stderr.write(`Unknown command: ${command}\n`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
