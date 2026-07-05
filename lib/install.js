'use strict';

const fs = require('fs');
const path = require('path');
const { MANIFEST_FILE, PACKAGE_NAME } = require('./constants');
const {
  resolveTargets,
  mergeCopyPaths,
  mergeSymlinks,
  needsGeminiSkills,
  TARGETS,
} = require('./targets');
const {
  copyRelative,
  copyGeminiSkills,
  ensureSymlink,
  isManagedLink,
  removeManagedLinks,
  removeRelative,
  syncGlobalDirectory,
} = require('./copy');
const { updateGitignore, buildPatterns } = require('./gitignore');

function findPackageRoot(startDir) {
  let dir = startDir;
  while (true) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        const data = JSON.parse(fs.readFileSync(pkg, 'utf8'));
        if (data.name === PACKAGE_NAME && fs.existsSync(path.join(dir, 'skills'))) {
          return dir;
        }
      } catch {
        // keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    `Could not locate ${PACKAGE_NAME} package. Run from a project with ${PACKAGE_NAME} installed, or use --package-root.`,
  );
}

function readManifest(projectRoot) {
  const manifestPath = path.join(projectRoot, MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function writeManifest(projectRoot, targets, version) {
  const manifestPath = path.join(projectRoot, MANIFEST_FILE);
  const existing = readManifest(projectRoot) || {};
  const mergedTargets = [...new Set([...(existing.targets || []), ...targets])].sort();

  const manifest = {
    version,
    targets: mergedTargets,
    installedAt: new Date().toISOString(),
    package: PACKAGE_NAME,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

function install({ projectRoot, packageRoot, targetInput, version }) {
  const targets = resolveTargets(targetInput);

  // Sync assets from packageRoot to global storage
  syncGlobalDirectory(packageRoot);

  // Legacy migration: 1.x symlinked the whole `.claude/` directory; 2.x links
  // only `.claude/commands`. Drop the stale whole-dir link first, otherwise the
  // new `.claude/commands` link would resolve *through* it into the global store.
  const legacyClaude = path.join(projectRoot, '.claude');
  if (isManagedLink(legacyClaude)) {
    fs.unlinkSync(legacyClaude);
  }

  const copied = [];
  const skipped = [];

  for (const relativePath of mergeCopyPaths(targets)) {
    copied.push(copyRelative(packageRoot, projectRoot, relativePath, { skipped }));
  }

  if (needsGeminiSkills(targets)) {
    copied.push(copyGeminiSkills(packageRoot, projectRoot, { skipped }));
  }

  for (const link of mergeSymlinks(targets)) {
    copied.push(ensureSymlink(projectRoot, link.linkPath, link.targetPath, { skipped }));
  }

  const manifest = readManifest(projectRoot);
  const allTargets = [...new Set([...(manifest?.targets || []), ...targets])].sort();
  updateGitignore(projectRoot, allTargets);
  writeManifest(projectRoot, targets, version);

  return { targets, copied, skipped, gitignorePatterns: buildPatterns(allTargets) };
}

function uninstall({ projectRoot }) {
  const manifest = readManifest(projectRoot);
  if (!manifest?.targets?.length) {
    throw new Error(`No ${MANIFEST_FILE} found — nothing to uninstall.`);
  }

  const removed = [];
  const copyPaths = mergeCopyPaths(manifest.targets);

  for (const relativePath of copyPaths) {
    if (removeManagedLinks(projectRoot, relativePath)) {
      removed.push(relativePath);
    }
  }

  if (manifest.targets.includes('gemini')) {
    if (removeRelative(projectRoot, '.gemini/skills')) {
      removed.push('.gemini/skills/');
    }
  }

  for (const link of mergeSymlinks(manifest.targets)) {
    if (removeRelative(projectRoot, link.linkPath)) {
      removed.push(link.linkPath);
    }
  }

  removeRelative(projectRoot, MANIFEST_FILE);

  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const { stripManagedBlock } = require('./gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf8');
    fs.writeFileSync(gitignorePath, `${stripManagedBlock(content)}\n`, 'utf8');
  }

  return { targets: manifest.targets, removed };
}

function describeTargets(targetInput) {
  const targets = resolveTargets(targetInput);
  return targets.map((name) => ({
    name,
    label: TARGETS[name].label,
    description: TARGETS[name].description,
  }));
}

module.exports = {
  findPackageRoot,
  install,
  uninstall,
  describeTargets,
  readManifest,
  MANIFEST_FILE,
};
