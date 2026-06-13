'use strict';

const fs = require('fs');
const path = require('path');

function copyEntry(src, dest) {
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function copyRelative(packageRoot, projectRoot, relativePath) {
  const src = path.join(packageRoot, relativePath);
  const dest = path.join(projectRoot, relativePath);

  if (!fs.existsSync(src)) {
    throw new Error(`Missing package asset: ${relativePath}`);
  }

  copyEntry(src, dest);
  return relativePath;
}

function copyGeminiSkills(packageRoot, projectRoot) {
  const srcSkills = path.join(packageRoot, 'skills');
  const destSkills = path.join(projectRoot, '.gemini', 'skills');

  if (!fs.existsSync(srcSkills)) {
    throw new Error('Missing package asset: skills/');
  }

  fs.mkdirSync(path.join(projectRoot, '.gemini'), { recursive: true });
  copyEntry(srcSkills, destSkills);
  return '.gemini/skills/';
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

  fs.symlinkSync(path.relative(path.dirname(absLink), resolvedTarget), absLink);
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
};
