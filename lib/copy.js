'use strict';

const fs = require('fs');
const path = require('path');
const { LEGACY_GLOBAL_DIR } = require('./constants');

/** True when `absPath` is a symlink left over from the pre-3.0 global-cache install. */
function isLegacyManagedLink(absPath) {
  try {
    if (!fs.lstatSync(absPath).isSymbolicLink()) return false;
    const real = fs.realpathSync(absPath);
    return real === LEGACY_GLOBAL_DIR || real.startsWith(LEGACY_GLOBAL_DIR + path.sep);
  } catch {
    return false;
  }
}

/**
 * Additive physical copy. Never destroys content the user owns:
 *   - nothing present                 → copy
 *   - a stale symlink into the old global cache → drop it, then copy fresh
 *   - a file we placed on a prior run (tracked in `ownedFiles`) → overwrite (refresh)
 *   - a real file/dir the user owns, not tracked → skip, record the conflict
 *   - both sides are directories      → recurse per-child, so the user's own
 *                                        files inside are preserved
 * `relPath` is always POSIX-style (forward slashes), independent of OS, so it
 * can be stored verbatim in the manifest's `files` list.
 */
function copyOrMerge(absSrc, absDest, relPath, ownedFiles, written, skipped) {
  if (!fs.existsSync(absSrc)) return;

  let destStat = null;
  try {
    destStat = fs.lstatSync(absDest);
  } catch {
    // nothing there
  }

  if (destStat && destStat.isSymbolicLink()) {
    if (isLegacyManagedLink(absDest)) {
      fs.rmSync(absDest, { force: true });
      destStat = null;
    } else {
      skipped.push(relPath);
      return;
    }
  }

  const srcIsDir = fs.statSync(absSrc).isDirectory();

  if (!destStat) {
    if (srcIsDir) {
      fs.mkdirSync(absDest, { recursive: true });
      for (const entry of fs.readdirSync(absSrc)) {
        copyOrMerge(
          path.join(absSrc, entry),
          path.join(absDest, entry),
          `${relPath}/${entry}`,
          ownedFiles,
          written,
          skipped,
        );
      }
    } else {
      fs.mkdirSync(path.dirname(absDest), { recursive: true });
      fs.copyFileSync(absSrc, absDest);
      written.push(relPath);
    }
    return;
  }

  const destIsDir = destStat.isDirectory();

  if (srcIsDir && destIsDir) {
    for (const entry of fs.readdirSync(absSrc)) {
      copyOrMerge(
        path.join(absSrc, entry),
        path.join(absDest, entry),
        `${relPath}/${entry}`,
        ownedFiles,
        written,
        skipped,
      );
    }
    return;
  }

  if (!srcIsDir && !destIsDir) {
    if (ownedFiles.has(relPath)) {
      fs.copyFileSync(absSrc, absDest);
      written.push(relPath);
    } else {
      skipped.push(relPath);
    }
    return;
  }

  // Type mismatch (file where we'd place a dir, or vice versa) — user-owned.
  skipped.push(relPath);
}

function copyRelative(packageRoot, projectRoot, relativePath, opts = {}) {
  const absSrc = path.join(packageRoot, relativePath);
  const absDest = path.join(projectRoot, relativePath);
  const skipped = opts.skipped || [];
  const written = opts.written || [];
  const ownedFiles = opts.ownedFiles || new Set();

  copyOrMerge(absSrc, absDest, relativePath, ownedFiles, written, skipped);
  return relativePath;
}

/**
 * Deletes exactly the files we own (per the manifest), then prunes any
 * directory that became empty as a result, walking up toward the project
 * root. A non-empty directory (holding the user's own files) is left as-is.
 */
function removeOwnedFiles(projectRoot, relativeFilePaths) {
  const removed = [];
  const dirsToPrune = new Set();

  for (const relPath of relativeFilePaths) {
    const abs = path.join(projectRoot, ...relPath.split('/'));
    if (fs.existsSync(abs)) {
      fs.rmSync(abs, { force: true });
      removed.push(relPath);
    }
    dirsToPrune.add(path.dirname(abs));
  }

  for (const dir of [...dirsToPrune].sort((a, b) => b.length - a.length)) {
    let current = dir;
    while (current !== projectRoot && current.startsWith(projectRoot + path.sep)) {
      try {
        if (fs.readdirSync(current).length > 0) break;
        fs.rmdirSync(current);
        current = path.dirname(current);
      } catch {
        break;
      }
    }
  }

  return removed;
}

function makeSymlink(absLink, resolvedTarget, absolute) {
  fs.mkdirSync(path.dirname(absLink), { recursive: true });
  const value = absolute
    ? resolvedTarget
    : path.relative(path.dirname(absLink), resolvedTarget);
  fs.symlinkSync(value, absLink);
}

/**
 * Additive linking, used only for the small set of in-project alias symlinks
 * (e.g. `.opencode/skills` → `../skills`). Never destroys a directory or file
 * the user owns:
 *   - nothing present            → create the symlink
 *   - our symlink already present → leave it (or repoint if stale/legacy)
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

function removeRelative(projectRoot, relativePath) {
  const abs = path.join(projectRoot, relativePath);
  if (!fs.existsSync(abs)) {
    try {
      fs.lstatSync(abs);
    } catch {
      return false;
    }
  }
  fs.rmSync(abs, { recursive: true, force: true });
  return true;
}

module.exports = {
  copyRelative,
  ensureSymlink,
  isLegacyManagedLink,
  removeOwnedFiles,
  removeRelative,
};
