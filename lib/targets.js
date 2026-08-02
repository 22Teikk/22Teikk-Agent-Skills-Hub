'use strict';

/**
 * User-facing CLI tools that any target's skills/references may point a user
 * at (e.g. documentation-and-adrs/SKILL.md → `scripts/decisions.js`,
 * failure-recovery.md → `scripts/rollback.sh`, observability-and-benchmark.md
 * → `scripts/benchmark.js`). Only `fs`/`path`/`git` dependencies — no
 * dependency on the rest of this package — so they run standalone once
 * copied. Copied for every target since the skills/references that mention
 * them are too (via `skillsAgents`). Deliberately excludes this repo's own
 * maintainer/CI scripts (build-registry.js, sync-targets.js,
 * validate-parity.js, validate-skills.js, test-install.js, postinstall.js),
 * which have no meaning inside an installed project.
 */
const SHARED_SCRIPTS = ['scripts/benchmark.js', 'scripts/decisions.js', 'scripts/rollback.sh'];

/**
 * Install profiles per IDE / CLI.
 * `copyPaths` — entries copied from the package root into the project. A plain
 *   string copies to the SAME relative path; a `{ src, dest }` object remaps
 *   (e.g. claude's `hooks` → `.claude/hooks`).
 * `skillsAgents` — when set to a tool dir (e.g. `.claude`), the merged
 *   core+pack skills and agents are COPIED PHYSICALLY into `<toolDir>/skills`
 *   and `<toolDir>/agents`, and each skill's referenced `references/*.md` are
 *   bundled into `<toolDir>/skills/<skill>/references/`. Every tool gets its
 *   own self-contained copy (no shared tree, no symlinks). See lib/install.js.
 */
const TARGETS = {
  cursor: {
    label: 'Cursor',
    description: 'Rules, slash commands, skills, and agents for Cursor',
    copyPaths: [
      '.cursor',
      ...SHARED_SCRIPTS,
    ],
    skillsAgents: '.cursor',
  },
  claude: {
    label: 'Claude Code',
    description: 'Slash commands, hooks, skills, and agents for Claude Code',
    copyPaths: [
      '.claude/commands',
      { src: 'hooks', dest: '.claude/hooks' },
      { src: 'lib/telemetry.sh', dest: '.claude/lib/telemetry.sh' },
      ...SHARED_SCRIPTS,
    ],
    skillsAgents: '.claude',
  },
  antigravity: {
    label: 'Antigravity',
    description: 'Rules, workflows, and skills for Antigravity IDE / CLI',
    copyPaths: [
      '.agents',
      'commands',
      ...SHARED_SCRIPTS,
    ],
    skillsAgents: '.agents',
  },
  gemini: {
    label: 'Gemini CLI',
    description: 'Slash commands and on-demand skills for Gemini CLI',
    copyPaths: ['.gemini', ...SHARED_SCRIPTS],
    skillsAgents: '.gemini',
  },
  // NOTE: AGENTS.md is intentionally NOT shipped to any target project. Auto-loading
  // it into every session costs ~5K tokens of always-on context. Skill routing
  // happens via slash commands (explicit invocation), skill frontmatter descriptions
  // (LLM-driven fallback), or `using-agent-skills` skill (opt-in meta-router).
  // Project-specific AGENTS.md remains a user-authored file if they want their own.
  opencode: {
    label: 'OpenCode',
    description: 'Native slash commands, skills, and agents for OpenCode',
    copyPaths: ['.opencode/commands'],
    skillsAgents: '.opencode',
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
  const seen = new Set();
  const entries = [];
  for (const name of targetList) {
    for (const p of TARGETS[name].copyPaths) {
      const src = typeof p === 'string' ? p : p.src;
      const dest = typeof p === 'string' ? p : p.dest;
      const key = `${src}→${dest}`;
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({ src, dest });
      }
    }
  }
  return entries;
}

// Retained as a stub so uninstall() on a manifest written by the symlink-era
// release still resolves (older manifests referenced symlink linkPaths). The
// copy-into-each-tool model creates no symlinks, so this is always empty now.
function mergeSymlinks() {
  return [];
}

/** Tool dirs (e.g. `.claude`, `.opencode`) that get a physical skills/agents copy. */
function skillsAgentsToolDirs(targetList) {
  const dirs = [];
  for (const name of targetList) {
    const dir = TARGETS[name].skillsAgents;
    if (dir && !dirs.includes(dir)) dirs.push(dir);
  }
  return dirs;
}

/** True if any resolved target needs a skills/ + agents/ copy. */
function needsSkillsAgents(targetList) {
  return targetList.some((name) => TARGETS[name].skillsAgents);
}

module.exports = {
  TARGETS,
  TARGET_NAMES,
  resolveTargets,
  mergeCopyPaths,
  mergeSymlinks,
  skillsAgentsToolDirs,
  needsSkillsAgents,
};
