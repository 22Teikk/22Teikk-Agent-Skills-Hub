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

function copyRelative(packageRoot, projectRoot, relativePath) {
  const targetPath = path.join(GLOBAL_DIR, relativePath);
  return ensureSymlink(projectRoot, relativePath, targetPath);
}

function copyGeminiSkills(packageRoot, projectRoot) {
  const destSkills = path.join('.gemini', 'skills');
  const targetPath = path.join(GLOBAL_DIR, 'skills');
  return ensureSymlink(projectRoot, destSkills, targetPath);
}

function ensureSymlink(projectRoot, linkPath, targetPath) {
  const absLink = path.join(projectRoot, linkPath);
  const resolvedTarget = path.resolve(path.dirname(absLink), targetPath);

  fs.mkdirSync(path.dirname(absLink), { recursive: true });

  if (fs.existsSync(absLink)) {
    const stat = fs.lstatSync(absLink);
    if (stat.isSymbolicLink()) {
      if (fs.realpathSync(absLink) === resolvedTarget) {
        return linkPath;
      }
      fs.unlinkSync(absLink);
    } else {
      fs.rmSync(absLink, { recursive: true, force: true });
    }
  }

  const symlinkTarget = path.isAbsolute(targetPath)
    ? resolvedTarget
    : path.relative(path.dirname(absLink), resolvedTarget);

  fs.symlinkSync(symlinkTarget, absLink);
  return linkPath;
}

function removeRelative(projectRoot, relativePath) {
  const abs = path.join(projectRoot, relativePath);
  if (!fs.existsSync(abs)) {
    return false;
  }
  fs.rmSync(abs, { recursive: true, force: true });
  return true;
}

module.exports = {
  copyRelative,
  copyGeminiSkills,
  ensureSymlink,
  removeRelative,
  syncGlobalDirectory,
};
