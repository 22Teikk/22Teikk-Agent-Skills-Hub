'use strict';

const fs = require('fs');
const path = require('path');
const { MANIFEST_FILE, PACKAGE_NAME } = require('./constants');
const {
  resolveTargets,
  mergeCopyPaths,
  mergeSymlinks,
  skillsAgentsToolDirs,
  needsSkillsAgents,
  TARGETS,
} = require('./targets');
const {
  copyMapped,
  isLegacyManagedLink,
  removeOwnedFiles,
  removeRelative,
} = require('./copy');
const { updateGitignore, buildPatterns } = require('./gitignore');
const { resolveProjectPack } = require('./platform');
const { bundleSkillReferences } = require('./bundle-references');
const { wireClaudeHooks, unwireClaudeHooks } = require('./claude-hooks');

/**
 * Legacy locations from prior releases that the current destination set no
 * longer covers, so the normal same-run pruner never touches them. Remove any
 * owned files under these prefixes explicitly on upgrade, else stale content
 * (and the pre-copy-model `.teikk-agents/` tree) lingers. `.teikk-agents`
 * covers the symlink-era shared tree; the bare root dirs cover the even older
 * flat-at-root layout.
 */
const LEGACY_ROOT_PREFIXES = ['.teikk-agents', 'skills', 'agents', 'references', 'hooks', 'lib/telemetry.sh'];

function findPackageRoot(startDir) {
  let dir = startDir;
  while (true) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        const data = JSON.parse(fs.readFileSync(pkg, 'utf8'));
        if (data.name === PACKAGE_NAME && fs.existsSync(path.join(dir, 'core', 'skills'))) {
          return dir;
        }
      } catch {
        // keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    `Could not locate ${PACKAGE_NAME} package. Run from a project with ${PACKAGE_NAME} installed, or use --package-root.`,
  );
}

/**
 * Package-side skills/agents sources, keyed by kind, for the copy-into-each-tool
 * model: core always + the pack matching the project's `.teikk/spec/PROJECT.yaml`
 * `platform:`, if any. install() copies each into every tool dir's
 * `skills/`/`agents/`, then bundles per-skill references.
 */
function resolveSkillsAgentsPackageSources(projectRoot) {
  const pack = resolveProjectPack(projectRoot);
  const skills = ['core/skills'];
  const agents = ['core/agents'];
  if (pack) {
    skills.push(`packs/${pack}/skills`);
    agents.push(`packs/${pack}/agents`);
  }
  return { skills, agents };
}

function readManifest(projectRoot) {
  const manifestPath = path.join(projectRoot, MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function writeManifest(projectRoot, targets, version, files, claudeHooks) {
  const manifestPath = path.join(projectRoot, MANIFEST_FILE);
  const existing = readManifest(projectRoot) || {};
  const mergedTargets = [...new Set([...(existing.targets || []), ...targets])].sort();

  const manifest = {
    version,
    targets: mergedTargets,
    files: [...new Set(files)].sort(),
    installedAt: new Date().toISOString(),
    package: PACKAGE_NAME,
  };
  const ownedHooks = claudeHooks !== undefined ? claudeHooks : existing.claudeHooks;
  if (ownedHooks && ownedHooks.length) {
    manifest.claudeHooks = ownedHooks;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

/**
 * Drops a stale symlink at `relativePath` (or inside it) so the physical copy
 * below can't write through it or collide with it. With `dropAny`, ANY symlink
 * at that exact path is removed — needed for the copy-into-each-tool model,
 * where a prior release left `<toolDir>/skills` → `.teikk-agents/skills` links
 * that are not legacy-global-cache links but must still be replaced by a real
 * directory. Without `dropAny`, only pre-3.0 global-cache links are removed.
 */
function dropLegacyLinks(projectRoot, relativePath, dropAny = false) {
  const abs = path.join(projectRoot, relativePath);
  let stat = null;
  try {
    stat = fs.lstatSync(abs);
  } catch {
    return;
  }

  if (stat.isSymbolicLink()) {
    if (dropAny || isLegacyManagedLink(abs)) {
      fs.unlinkSync(abs);
    }
    return;
  }

  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(abs)) {
      dropLegacyLinks(projectRoot, path.join(relativePath, entry), dropAny);
    }
  }
}

function install({ projectRoot, packageRoot, targetInput, version }) {
  const targets = resolveTargets(targetInput);
  const copyPaths = mergeCopyPaths(targets);
  const toolDirs = needsSkillsAgents(targets) ? skillsAgentsToolDirs(targets) : [];
  const pkgSources = toolDirs.length
    ? resolveSkillsAgentsPackageSources(projectRoot)
    : { skills: [], agents: [] };
  // Every tool dir gets its own physical skills/ + agents/ copy.
  const skillsAgentsDests = toolDirs.flatMap((d) => [`${d}/skills`, `${d}/agents`]);
  const destPrefixes = [...copyPaths.map((p) => p.dest), ...skillsAgentsDests];

  // Drop stale symlinks first. `.claude` and the legacy global-cache links are
  // handled conservatively (only links into the old cache). The skills/agents
  // dests, however, may be symlinks from the prior symlink-era release pointing
  // into `.teikk-agents/` — those MUST be unlinked unconditionally, or the
  // physical copy below silently skips them (copyOrMerge skips any symlink it
  // doesn't recognise as legacy-managed).
  dropLegacyLinks(projectRoot, '.claude');
  for (const relativePath of LEGACY_ROOT_PREFIXES) {
    dropLegacyLinks(projectRoot, relativePath);
  }
  for (const dest of [...copyPaths.map((p) => p.dest), ...skillsAgentsDests]) {
    dropLegacyLinks(projectRoot, dest, true);
  }

  const manifest = readManifest(projectRoot);
  const ownedFiles = new Set(manifest?.files || []);

  const copied = [];
  const skipped = [];
  const written = [];

  for (const { src, dest } of copyPaths) {
    copyMapped(packageRoot, projectRoot, src, dest, { skipped, written, ownedFiles });
    copied.push(dest);
  }
  // Copy core + pack skills/agents into EACH tool dir, then bundle each skill's
  // declared references into that skill's own references/ subdir.
  for (const toolDir of toolDirs) {
    for (const src of pkgSources.skills) {
      copyMapped(packageRoot, projectRoot, src, `${toolDir}/skills`, { skipped, written, ownedFiles });
    }
    for (const src of pkgSources.agents) {
      copyMapped(packageRoot, projectRoot, src, `${toolDir}/agents`, { skipped, written, ownedFiles });
    }
    bundleSkillReferences(packageRoot, projectRoot, `${toolDir}/skills`, { written });
    copied.push(`${toolDir}/skills`, `${toolDir}/agents`);
  }

  // The same-run pruner below only covers the CURRENT destination set, which
  // excludes LEGACY_ROOT_PREFIXES; prune owned files there so a prior release's
  // `.teikk-agents/` tree and older root dirs don't linger after the switch to
  // per-tool copies.
  const legacyStale = [...ownedFiles].filter((f) =>
    LEGACY_ROOT_PREFIXES.some((p) => f === p || f.startsWith(`${p}/`)),
  );
  removeOwnedFiles(projectRoot, legacyStale);

  // Anything we owned under a destination just processed, but that this run
  // didn't (re)write, came from a file the package no longer ships (or a
  // platform pack that's no longer selected) — remove it.
  const writtenSet = new Set(written);
  const stale = [...ownedFiles].filter(
    (f) => destPrefixes.some((p) => f === p || f.startsWith(`${p}/`)) && !writtenSet.has(f),
  );
  removeOwnedFiles(projectRoot, stale);

  const allTargets = [...new Set([...(manifest?.targets || []), ...targets])].sort();
  updateGitignore(projectRoot, allTargets);

  // The claude target's hooks/ directory ships hooks/hooks.json written for
  // Claude Code's plugin format (${CLAUDE_PLUGIN_ROOT}), which only resolves
  // for plugin-marketplace installs. A plain npm/CLI install needs those same
  // hooks (lifecycle telemetry, pre-compact checkpoint, session start) wired
  // into the project's own .claude/settings.json instead, or they silently
  // never fire. See lib/claude-hooks.js.
  let claudeHooks;
  if (allTargets.includes('claude')) {
    const result = wireClaudeHooks(projectRoot, packageRoot);
    if (result) claudeHooks = result.owned;
  }

  const staleSet = new Set([...stale, ...legacyStale]);
  const remainingOwned = [...ownedFiles].filter((f) => !staleSet.has(f));
  writeManifest(projectRoot, targets, version, [...remainingOwned, ...written], claudeHooks);

  return { targets, copied, skipped, gitignorePatterns: buildPatterns(allTargets) };
}

function uninstall({ projectRoot }) {
  const manifest = readManifest(projectRoot);
  if (!manifest?.targets?.length) {
    throw new Error(`No ${MANIFEST_FILE} found — nothing to uninstall.`);
  }

  const removed = removeOwnedFiles(projectRoot, manifest.files || []);

  for (const link of mergeSymlinks(manifest.targets)) {
    if (removeRelative(projectRoot, link.linkPath)) {
      removed.push(link.linkPath);
    }
  }

  if (manifest.claudeHooks?.length) {
    removed.push(...unwireClaudeHooks(projectRoot, manifest.claudeHooks));
  }

  removeRelative(projectRoot, MANIFEST_FILE);

  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const { stripManagedBlock } = require('./gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf8');
    fs.writeFileSync(gitignorePath, `${stripManagedBlock(content)}\n`, 'utf8');
  }

  return { targets: manifest.targets, removed };
}

function describeTargets(targetInput) {
  const targets = resolveTargets(targetInput);
  return targets.map((name) => ({
    name,
    label: TARGETS[name].label,
    description: TARGETS[name].description,
  }));
}

module.exports = {
  findPackageRoot,
  install,
  uninstall,
  describeTargets,
  readManifest,
  MANIFEST_FILE,
};
