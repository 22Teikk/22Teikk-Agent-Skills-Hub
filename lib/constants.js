'use strict';

/** Marker block in .gitignore — idempotent updates replace this section. */
const GITIGNORE_BEGIN = '# BEGIN agent-skills (managed by npm — do not edit)';
const GITIGNORE_END = '# END agent-skills';

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

const MANIFEST_FILE = '.agent-skills.json';

module.exports = {
  GITIGNORE_BEGIN,
  GITIGNORE_END,
  GENERATED_PATTERNS,
  TARGET_GITIGNORE,
  SHARED_GITIGNORE,
  MANIFEST_FILE,
};
