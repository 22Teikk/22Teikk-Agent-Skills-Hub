'use strict';

const fs = require('fs');
const path = require('path');
const {
  GITIGNORE_BEGIN,
  GITIGNORE_END,
  GENERATED_PATTERNS,
  TARGET_GITIGNORE,
  SHARED_GITIGNORE,
} = require('./constants');

function buildPatterns(targetList) {
  const patterns = new Set(GENERATED_PATTERNS);

  for (const name of targetList) {
    for (const p of TARGET_GITIGNORE[name] || []) {
      patterns.add(p);
    }
  }

  if (targetList.length > 0) {
    for (const p of SHARED_GITIGNORE) {
      patterns.add(p);
    }
  }

  return [...patterns].sort();
}

function renderBlock(targetList) {
  const patterns = buildPatterns(targetList);
  const lines = [
    '',
    GITIGNORE_BEGIN,
    ...patterns.map((p) => p),
    GITIGNORE_END,
    '',
  ];
  return lines.join('\n');
}

function stripManagedBlock(content) {
  const beginIdx = content.indexOf(GITIGNORE_BEGIN);
  if (beginIdx === -1) {
    return content.replace(/\s*$/, '');
  }

  const endIdx = content.indexOf(GITIGNORE_END, beginIdx);
  if (endIdx === -1) {
    return content.replace(/\s*$/, '');
  }

  const afterEnd = endIdx + GITIGNORE_END.length;
  const before = content.slice(0, beginIdx).replace(/\s*$/, '');
  const after = content.slice(afterEnd).replace(/^\s*/, '');
  if (!before) {
    return after.replace(/\s*$/, '');
  }
  if (!after) {
    return before;
  }
  return `${before}\n\n${after}`.replace(/\s*$/, '');
}

function updateGitignore(projectRoot, targetList) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const block = renderBlock(targetList);

  let existing = '';
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, 'utf8');
  }

  const stripped = stripManagedBlock(existing);
  const next = stripped ? `${stripped}${block}` : block.trimStart();

  fs.writeFileSync(gitignorePath, `${next}\n`, 'utf8');
  return gitignorePath;
}

module.exports = {
  buildPatterns,
  renderBlock,
  stripManagedBlock,
  updateGitignore,
};
