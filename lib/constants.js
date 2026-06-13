'use strict';

const PACKAGE_NAME = 'teikk-agents-skills';
const CONFIG_KEY = 'teikk-agents-skills';
const ENV_TARGET = 'TEIKK_AGENTS_SKILLS_TARGET';
const ENV_SKIP_POSTINSTALL = 'TEIKK_AGENTS_SKILLS_SKIP_POSTINSTALL';

/** Marker block in .gitignore — idempotent updates replace this section. */
const GITIGNORE_BEGIN = `# BEGIN ${PACKAGE_NAME} (managed by npm — do not edit)`;
const GITIGNORE_END = `# END ${PACKAGE_NAME}`;

/** Workflow artifacts and caches created after install. */
const GENERATED_PATTERNS = [
  'SPEC.md',
  'docs/SPEC.md',
  'spec/',
  'tasks/',
  '.claude/.simplify-ignore-cache/',
  '.claude/sdd-cache/',
];

/** Per-target paths to hide from version control. */
const TARGET_GITIGNORE = {
  cursor: ['.cursor/'],
  claude: ['.claude/', 'hooks/'],
  antigravity: ['.agents/', 'commands/'],
  gemini: ['.gemini/'],
  opencode: ['.opencode/'],
};

/** Shared content copied by most targets. */
const SHARED_GITIGNORE = ['AGENTS.md', 'skills/', 'agents/', 'references/'];

const MANIFEST_FILE = `.${PACKAGE_NAME}.json`;

const REPO = {
  owner: '22Teikk',
  name: '22Teikk-Agent-Skills-Hub',
  https: 'https://github.com/22Teikk/22Teikk-Agent-Skills-Hub',
  ssh: 'git@github.com:22Teikk/22Teikk-Agent-Skills-Hub.git',
  clonePath: '22Teikk-Agent-Skills-Hub',
};

module.exports = {
  PACKAGE_NAME,
  CONFIG_KEY,
  ENV_TARGET,
  ENV_SKIP_POSTINSTALL,
  GITIGNORE_BEGIN,
  GITIGNORE_END,
  GENERATED_PATTERNS,
  TARGET_GITIGNORE,
  SHARED_GITIGNORE,
  MANIFEST_FILE,
  REPO,
};
