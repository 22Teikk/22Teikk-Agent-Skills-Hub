'use strict';

const fs = require('fs');
const path = require('path');
const { MANIFEST_FILE, PACKAGE_NAME } = require('./constants');
const {
  resolveTargets,
  mergeCopyPaths,
  mergeSymlinks,
  TARGETS,
} = require('./targets');
const {
  copyRelative,
  ensureSymlink,
  isLegacyManagedLink,
  removeOwnedFiles,
  removeRelative,
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

function writeManifest(projectRoot, targets, version, files) {
  const manifestPath = path.join(projectRoot, MANIFEST_FILE);
  const existing = readManifest(projectRoot) || {};
  const mergedTargets = [...new Set([...(existing.targets || []), ...targets])].sort();

  const manifest = {
    version,
    targets: mergedTargets,
    files: [...new Set(files)].sort(),
    installedAt: new Date().toISOString(),
    package: PACKAGE_NAME,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

/**
 * Drops any symlink at `relativePath` (or inside it) left over from the
 * pre-3.0 global-cache install, so the physical copy below can't write
 * through a stale link or collide with it.
 */
function dropLegacyLinks(projectRoot, relativePath) {
  const abs = path.join(projectRoot, relativePath);
  let stat = null;
  try {
    stat = fs.lstatSync(abs);
  } catch {
    return;
  }

  if (stat.isSymbolicLink()) {
    if (isLegacyManagedLink(abs)) {
      fs.unlinkSync(abs);
    }
    return;
  }

  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(abs)) {
      dropLegacyLinks(projectRoot, path.join(relativePath, entry));
    }
  }
}

function install({ projectRoot, packageRoot, targetInput, version }) {
  const targets = resolveTargets(targetInput);
  const copyPaths = mergeCopyPaths(targets);
  const symlinks = mergeSymlinks(targets);

  // Legacy migration: pre-3.0 installs symlinked every copy path (and the
  // whole `.claude/` dir pre-2.0) into a shared global cache. Drop those
  // stale links first, otherwise the physical copy below would write
  // *through* them into the old cache instead of the project.
  dropLegacyLinks(projectRoot, '.claude');
  for (const relativePath of copyPaths) {
    dropLegacyLinks(projectRoot, relativePath);
  }
  for (const link of symlinks) {
    dropLegacyLinks(projectRoot, link.linkPath);
  }

  const manifest = readManifest(projectRoot);
  const ownedFiles = new Set(manifest?.files || []);

  const copied = [];
  const skipped = [];
  const written = [];

  for (const relativePath of copyPaths) {
    copied.push(copyRelative(packageRoot, projectRoot, relativePath, { skipped, written, ownedFiles }));
  }

  // Anything we owned under a copy path just processed, but that this run
  // didn't (re)write, came from a file the package no longer ships — remove it.
  const writtenSet = new Set(written);
  const stale = [...ownedFiles].filter(
    (f) => copyPaths.some((p) => f === p || f.startsWith(`${p}/`)) && !writtenSet.has(f),
  );
  removeOwnedFiles(projectRoot, stale);

  for (const link of symlinks) {
    copied.push(ensureSymlink(projectRoot, link.linkPath, link.targetPath, { skipped }));
  }

  const allTargets = [...new Set([...(manifest?.targets || []), ...targets])].sort();
  updateGitignore(projectRoot, allTargets);

  const staleSet = new Set(stale);
  const remainingOwned = [...ownedFiles].filter((f) => !staleSet.has(f));
  writeManifest(projectRoot, targets, version, [...remainingOwned, ...written]);

  return { targets, copied, skipped, gitignorePatterns: buildPatterns(allTargets) };
}

function uninstall({ projectRoot }) {
  const manifest = readManifest(projectRoot);
  if (!manifest?.targets?.length) {
    throw new Error(`No ${MANIFEST_FILE} found — nothing to uninstall.`);
  }

  const removed = removeOwnedFiles(projectRoot, manifest.files || []);

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
