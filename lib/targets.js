'use strict';

/**
 * Install profiles per IDE / CLI.
 * `copyPaths` — directories or files copied from the package root into the project
 *   at the SAME relative path (no core/pack remapping).
 * `skillsAgents` — when true, this target also receives the merged
 *   core/skills + core/agents (+ the project's platform pack, if any) at the
 *   flat project-side `skills/` and `agents/` destination. See lib/install.js
 *   for how the core+pack merge is computed and copied.
 * `symlinks` — { linkPath, targetPath } relative to project root.
 */
const TARGETS = {
  cursor: {
    label: 'Cursor',
    description: 'Rules, slash commands, skills, and agents for Cursor',
    copyPaths: [
      '.cursor',
      'AGENTS.md',
      'references',
    ],
    skillsAgents: true,
  },
  claude: {
    label: 'Claude Code',
    description: 'Slash commands, hooks, skills, and agents for Claude Code',
    copyPaths: [
      '.claude/commands',
      'hooks',
      'AGENTS.md',
      'references',
    ],
    skillsAgents: true,
  },
  antigravity: {
    label: 'Antigravity',
    description: 'Rules, workflows, and skills for Antigravity IDE / CLI',
    copyPaths: [
      '.agents',
      'commands',
      'AGENTS.md',
      'references',
    ],
    skillsAgents: true,
  },
  gemini: {
    label: 'Gemini CLI',
    description: 'Slash commands and on-demand skills for Gemini CLI',
    copyPaths: ['.gemini'],
    skillsAgents: true,
    symlinks: [{ linkPath: '.gemini/skills', targetPath: '../skills' }],
  },
  opencode: {
    label: 'OpenCode',
    description: 'AGENTS.md skill routing and OpenCode skill discovery',
    copyPaths: ['AGENTS.md'],
    skillsAgents: true,
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

/** True if any resolved target needs the merged skills/ + agents/ destination. */
function needsSkillsAgents(targetList) {
  return targetList.some((name) => TARGETS[name].skillsAgents);
}

module.exports = {
  TARGETS,
  TARGET_NAMES,
  resolveTargets,
  mergeCopyPaths,
  mergeSymlinks,
  needsSkillsAgents,
};
