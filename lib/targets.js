'use strict';

/**
 * Install profiles per IDE / CLI.
 * `copyPaths` — directories or files copied from the package root into the project.
 * `symlinks` — { linkPath, targetPath } relative to project root.
 */
const TARGETS = {
  cursor: {
    label: 'Cursor',
    description: 'Rules, slash commands, skills, and agents for Cursor',
    copyPaths: [
      '.cursor',
      'AGENTS.md',
      'skills',
      'agents',
      'references',
    ],
  },
  claude: {
    label: 'Claude Code',
    description: 'Slash commands, hooks, skills, and agents for Claude Code',
    copyPaths: [
      '.claude',
      'hooks',
      'AGENTS.md',
      'skills',
      'agents',
      'references',
    ],
  },
  antigravity: {
    label: 'Antigravity',
    description: 'Rules, workflows, and skills for Antigravity IDE / CLI',
    copyPaths: [
      '.agents',
      'commands',
      'AGENTS.md',
      'skills',
      'agents',
      'references',
    ],
  },
  gemini: {
    label: 'Gemini CLI',
    description: 'Slash commands and on-demand skills for Gemini CLI',
    copyPaths: ['.gemini'],
    /** skills/ is copied into .gemini/skills/ at install time */
    geminiSkills: true,
  },
  opencode: {
    label: 'OpenCode',
    description: 'AGENTS.md skill routing and OpenCode skill discovery',
    copyPaths: ['AGENTS.md', 'skills', 'agents'],
    symlinks: [{ linkPath: '.opencode/skills', targetPath: '../skills' }],
  },
};

const TARGET_NAMES = Object.keys(TARGETS);

function resolveTargets(input) {
  if (!input || input === 'all') {
    return TARGET_NAMES;
  }
  const name = input.toLowerCase();
  if (!TARGETS[name]) {
    const available = [...TARGET_NAMES, 'all'].join(', ');
    throw new Error(`Unknown target "${input}". Available: ${available}`);
  }
  return [name];
}

function mergeCopyPaths(targetList) {
  const paths = new Set();
  for (const name of targetList) {
    for (const p of TARGETS[name].copyPaths) {
      paths.add(p);
    }
  }
  return [...paths];
}

function mergeSymlinks(targetList) {
  const links = [];
  const seen = new Set();
  for (const name of targetList) {
    for (const link of TARGETS[name].symlinks || []) {
      const key = `${link.linkPath}→${link.targetPath}`;
      if (!seen.has(key)) {
        seen.add(key);
        links.push(link);
      }
    }
  }
  return links;
}

function needsGeminiSkills(targetList) {
  return targetList.some((name) => TARGETS[name].geminiSkills);
}

module.exports = {
  TARGETS,
  TARGET_NAMES,
  resolveTargets,
  mergeCopyPaths,
  mergeSymlinks,
  needsGeminiSkills,
};
