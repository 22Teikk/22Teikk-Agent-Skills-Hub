'use strict';

const os = require('os');
const path = require('path');

const PACKAGE_NAME = 'teikk-agents-skills';
const CONFIG_KEY = 'teikk-agents-skills';
const ENV_TARGET = 'TEIKK_AGENTS_SKILLS_TARGET';
const ENV_SKIP_POSTINSTALL = 'TEIKK_AGENTS_SKILLS_SKIP_POSTINSTALL';

/**
 * Pre-3.0 installs synced content into this shared home-directory cache and
 * symlinked project files into it — a single package-version conflict there
 * broke every project on the machine. 3.0 copies files directly into each
 * project instead; this path is kept only to detect and migrate away from
 * those stale symlinks on upgrade.
 *
 * Overridable via TEIKK_AGENTS_SKILLS_TEST_LEGACY_DIR so migration tests can
 * simulate a legacy install without touching the real machine-wide cache.
 */
const LEGACY_GLOBAL_DIR =
  process.env.TEIKK_AGENTS_SKILLS_TEST_LEGACY_DIR || path.join(os.homedir(), '.teikk-agents-skills');

/**
 * Platforms shipped as install packs (packs/<name>/skills, packs/<name>/agents),
 * layered on top of core/skills + core/agents. A project's `.teikk/spec/PROJECT.yaml`
 * (fallback `.teikk/PROJECT.yaml`) `platform:` field selects at most one of these;
 * any other value (or no PROJECT.yaml at all) means core-only.
 */
const SUPPORTED_PACKS = ['android', 'ios', 'flutter'];

/** Marker block in .gitignore — idempotent updates replace this section. */
const GITIGNORE_BEGIN = `# BEGIN ${PACKAGE_NAME} (managed by npm — do not edit)`;
const GITIGNORE_END = `# END ${PACKAGE_NAME}`;

/**
 * Workflow artifacts and caches created after install.
 * Every workflow writes under a single project-local `.teikk/` directory
 * (spec/ — SPEC.md, PROJECT.yaml, QUICKSTART.md, WORKFLOW.md — plus tasks/,
 * DECISIONS.md, DOCTOR.md, SHIP-REPORT.md, maestro flows, hook caches) so
 * nothing is scattered across the repo and one ignore line covers it all.
 */
const GENERATED_PATTERNS = ['.teikk/'];

/** Per-target paths to hide from version control. */
const TARGET_GITIGNORE = {
  cursor: ['.cursor/'],
  claude: ['.claude/commands/', 'hooks/', 'lib/telemetry.sh'],
  antigravity: ['.agents/', 'commands/'],
  gemini: ['.gemini/'],
  opencode: ['.opencode/'],
};

/**
 * Shared content copied by most targets. Individual `scripts/*` paths, not
 * `scripts/` itself — that directory name is common enough in user projects
 * that ignoring the whole thing would be unsafe.
 */
const SHARED_GITIGNORE = [
  'skills/',
  'agents/',
  'references/',
  'scripts/benchmark.js',
  'scripts/decisions.js',
  'scripts/rollback.sh',
];

const MANIFEST_FILE = `.${PACKAGE_NAME}.json`;

const REPO = {
  owner: '22Teikk',
  name: '22Teikk-Agent-Skills-Hub',
  https: 'https://github.com/22Teikk/22Teikk-Agent-Skills-Hub',
  ssh: 'git@github.com:22Teikk/22Teikk-Agent-Skills-Hub.git',
  sshAlias: 'git@teikk:22Teikk/22Teikk-Agent-Skills-Hub.git',
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
  LEGACY_GLOBAL_DIR,
  SUPPORTED_PACKS,
};
