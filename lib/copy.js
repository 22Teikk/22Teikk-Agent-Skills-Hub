'use strict';

const fs = require('fs');
const path = require('path');
const { GLOBAL_DIR } = require('./constants');

function copyEntry(src, dest) {
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function syncGlobalDirectory(packageRoot) {
  fs.mkdirSync(GLOBAL_DIR, { recursive: true });

  const pathsToSync = [
    'skills',
    'agents',
    'references',
    'hooks',
    'commands',
    '.cursor',
    '.claude',
    '.agents',
    '.gemini',
    '.opencode',
    'AGENTS.md',
  ];

  for (const relativePath of pathsToSync) {
    const src = path.join(packageRoot, relativePath);
    const dest = path.join(GLOBAL_DIR, relativePath);
    if (fs.existsSync(src)) {
      copyEntry(src, dest);
    }
  }
}

function copyRelative(packageRoot, projectRoot, relativePath, opts = {}) {
  const targetPath = path.join(GLOBAL_DIR, relativePath);
  return ensureSymlink(projectRoot, relativePath, targetPath, opts);
}

function copyGeminiSkills(packageRoot, projectRoot, opts = {}) {
  const destSkills = path.join('.gemini', 'skills');
  const targetPath = path.join(GLOBAL_DIR, 'skills');
  return ensureSymlink(projectRoot, destSkills, targetPath, opts);
}

/** True when `absPath` is a symlink we created (points into the global store). */
function isManagedLink(absPath) {
  try {
    if (!fs.lstatSync(absPath).isSymbolicLink()) return false;
    const real = fs.realpathSync(absPath);
    return real === GLOBAL_DIR || real.startsWith(GLOBAL_DIR + path.sep);
  } catch {
    return false;
  }
}

function makeSymlink(absLink, resolvedTarget, absolute) {
  fs.mkdirSync(path.dirname(absLink), { recursive: true });
  const value = absolute
    ? resolvedTarget
    : path.relative(path.dirname(absLink), resolvedTarget);
  fs.symlinkSync(value, absLink);
}

/**
 * Additive linking. Never destroys a directory or file the user owns:
 *   - nothing present            → create the symlink
 *   - our symlink already present → leave it (or repoint if stale)
 *   - a real DIRECTORY the user owns, and our source is also a directory
 *                                → merge: link each child individually, so the
 *                                  user's own files inside it are preserved
 *   - a real FILE the user owns   → skip it, record the conflict, touch nothing
 */
function linkOrMerge(absLink, resolvedTarget, absolute, skipped) {
  let stat = null;
  try {
    stat = fs.lstatSync(absLink);
  } catch {
    // nothing there
  }

  if (stat && stat.isSymbolicLink()) {
    try {
      if (fs.realpathSync(absLink) === resolvedTarget) return;
    } catch {
      // dangling — replace below
    }
    fs.unlinkSync(absLink);
    makeSymlink(absLink, resolvedTarget, absolute);
    return;
  }

  if (!stat) {
    makeSymlink(absLink, resolvedTarget, absolute);
    return;
  }

  // A real, user-owned entry lives here.
  const targetIsDir =
    fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isDirectory();

  if (stat.isDirectory() && targetIsDir) {
    for (const entry of fs.readdirSync(resolvedTarget)) {
      linkOrMerge(
        path.join(absLink, entry),
        path.join(resolvedTarget, entry),
        absolute,
        skipped,
      );
    }
    return;
  }

  // Type conflict (e.g. a real file where we would place a symlink) —
  // leave the user's content untouched.
  skipped.push(absLink);
}

function ensureSymlink(projectRoot, linkPath, targetPath, opts = {}) {
  const absLink = path.join(projectRoot, linkPath);
  const absolute = path.isAbsolute(targetPath);
  const resolvedTarget = path.resolve(path.dirname(absLink), targetPath);
  const skipped = opts.skipped || [];

  linkOrMerge(absLink, resolvedTarget, absolute, skipped);
  return linkPath;
}

/**
 * Removes only the symlinks we created, recursing into merged directories and
 * pruning them when empty. A user-owned file or directory is never deleted.
 */
function removeManagedLinks(projectRoot, relativePath) {
  const abs = path.join(projectRoot, relativePath);
  let stat = null;
  try {
    stat = fs.lstatSync(abs);
  } catch {
    return false;
  }

  if (stat.isSymbolicLink()) {
    if (isManagedLink(abs)) {
      fs.unlinkSync(abs);
      return true;
    }
    return false;
  }

  if (stat.isDirectory()) {
    let removedAny = false;
    for (const entry of fs.readdirSync(abs)) {
      if (removeManagedLinks(projectRoot, path.join(relativePath, entry))) {
        removedAny = true;
      }
    }
    try {
      if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
    } catch {
      // leave non-empty user dir in place
    }
    return removedAny;
  }

  return false;
}

function removeRelative(projectRoot, relativePath) {
  const abs = path.join(projectRoot, relativePath);
  if (!fs.existsSync(abs) && !isManagedLink(abs)) {
    return false;
  }
  fs.rmSync(abs, { recursive: true, force: true });
  return true;
}

module.exports = {
  copyRelative,
  copyGeminiSkills,
  ensureSymlink,
  isManagedLink,
  removeManagedLinks,
  removeRelative,
  syncGlobalDirectory,
};
