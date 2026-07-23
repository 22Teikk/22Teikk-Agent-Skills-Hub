#!/usr/bin/env node
/**
 * validate-parity.js
 *
 * Guards against drift between the per-target install directories. When a new
 * teikk-* command or agent persona is added, it must land in EVERY target so
 * users of each tool get the same feature set.
 *
 * Checks (errors block CI):
 *   - Every command-source directory ships the same set of teikk-* commands
 *     (compared by base name, ignoring the .md / .toml extension).
 *   - Every persona in agents/ is registered in .claude-plugin/plugin.json.
 *
 * Additional check (warns only, never blocks CI):
 *   - Content drift between .claude/commands/*.md and .agents/workflows/*.md.
 *     These two are the only hand-maintained targets — sync-targets.js keeps
 *     .cursor/ and .gemini/ mechanically in sync with commands/*.toml, but
 *     Claude and Antigravity have no equivalent sync script. Some drift is
 *     intentional (Antigravity often carries more verbose inline templates
 *     because it reads external files less reliably), so this is a WARN, not
 *     a failure — it exists purely to surface drift for a human to eyeball,
 *     not to force byte-identical content across two dialects.
 *
 * Exit codes: 0 = all clear, 1 = one or more errors (warnings never affect this)
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

// Command directories per target. `ext` is the file extension whose base names
// define that target's command set.
const COMMAND_TARGETS = [
  { label: 'claude',      dir: '.claude/commands',  ext: '.md'   },
  { label: 'antigravity', dir: '.agents/workflows', ext: '.md'   },
  { label: 'opencode',    dir: 'commands',          ext: '.toml' },
  { label: 'cursor',      dir: '.cursor/commands',  ext: '.md'   },
  { label: 'gemini',      dir: '.gemini/commands',  ext: '.toml' },
];

const PACKS_DIR       = path.join(ROOT, 'packs');
const AGENT_SOURCE_DIRS = [
  path.join(ROOT, 'core', 'agents'),
  ...(fs.existsSync(PACKS_DIR)
    ? fs.readdirSync(PACKS_DIR)
        .filter(d => fs.statSync(path.join(PACKS_DIR, d)).isDirectory())
        .map(d => path.join(PACKS_DIR, d, 'agents'))
        .filter(p => fs.existsSync(p))
    : []),
];
const PLUGIN_MANIFEST = path.join(ROOT, '.claude-plugin', 'plugin.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function commandSet(target) {
  const abs = path.join(ROOT, target.dir);
  if (!fs.existsSync(abs)) return null;
  return new Set(
    fs.readdirSync(abs)
      .filter(f => f.endsWith(target.ext))
      .map(f => f.slice(0, -target.ext.length))
  );
}

function diff(a, b) {
  return [...a].filter(x => !b.has(x)).sort();
}

// ─── Checks ──────────────────────────────────────────────────────────────────

function checkCommandParity() {
  const errors = [];
  const sets = COMMAND_TARGETS.map(t => ({ ...t, set: commandSet(t) }));

  for (const t of sets) {
    if (t.set === null) {
      errors.push(`Target '${t.label}': directory ${t.dir}/ not found`);
    }
  }

  const present = sets.filter(t => t.set !== null);
  if (present.length < 2) return { errors, count: 0 };

  // Reference = union of every target's commands. Anything a target is missing
  // (or has extra) is drift.
  const union = new Set();
  for (const t of present) for (const c of t.set) union.add(c);

  for (const t of present) {
    const missing = diff(union, t.set);
    const extra   = diff(t.set, union);
    if (missing.length) {
      errors.push(`Target '${t.label}' (${t.dir}/) missing: ${missing.join(', ')}`);
    }
    if (extra.length) {
      errors.push(`Target '${t.label}' (${t.dir}/) has commands no other target has: ${extra.join(', ')}`);
    }
  }

  return { errors, count: union.size };
}

function checkAgentRegistration() {
  const errors = [];

  const personas = AGENT_SOURCE_DIRS.flatMap(dir =>
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .map(f => f.slice(0, -3))
  ).sort();

  if (!fs.existsSync(PLUGIN_MANIFEST)) {
    errors.push(`.claude-plugin/plugin.json not found`);
    return { errors, count: personas.length };
  }

  const manifest = JSON.parse(fs.readFileSync(PLUGIN_MANIFEST, 'utf8'));
  const registered = new Set(
    (manifest.agents || []).map(p => path.basename(p, '.md'))
  );

  for (const persona of personas) {
    if (!registered.has(persona)) {
      errors.push(`Agent '${persona}' exists in agents/ but is NOT registered in .claude-plugin/plugin.json`);
    }
  }
  for (const reg of registered) {
    if (!personas.includes(reg)) {
      errors.push(`plugin.json registers agent '${reg}' but agents/${reg}.md does not exist`);
    }
  }

  return { errors, count: personas.length };
}

function hashFile(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

// Reviewed-and-confirmed intentional Claude↔Antigravity dialect divergences.
// Each entry pins the 12-char sha256 prefix of BOTH sides; if either changes,
// the pair stops matching and the drift warning re-fires for human re-review —
// this acknowledges known-good drift without silencing genuinely stale drift.
const INTENTIONAL_DRIFT = {
  'teikk-android-setup':   { claude: 'e442d7d511dd', antigravity: 'f3c7f2b81518' },
  'teikk-androidperf':     { claude: 'f01c747e73d8', antigravity: '7d993e914fdb' },
  'teikk-build':           { claude: 'f52cefab951a', antigravity: 'dfd314e76be0' },
  'teikk-ci':              { claude: '8c98b309288c', antigravity: 'e952437c0c05' },
  'teikk-code-simplify':   { claude: '13aae953e5bf', antigravity: '2128dee71f4b' },
  'teikk-docs':            { claude: '46e7d7ba7ca2', antigravity: '89a8d52c58f2' },
  'teikk-doctor':          { claude: '968391ef2dca', antigravity: 'ab0576fc2aaa' },
  'teikk-idea':            { claude: '53891f08346b', antigravity: 'd2356f18a5a3' },
  'teikk-interview':       { claude: '03f18dcdd2d3', antigravity: 'd43ef0c71d76' },
  'teikk-machine-audit':   { claude: 'b09625eb1fce', antigravity: '119dbbd49eb0' },
  'teikk-observability':   { claude: '61d1482cb903', antigravity: '09b9ad80fa6d' },
  'teikk-quick-implement': { claude: 'eeeef30a39e4', antigravity: 'b804baf802f5' },
  'teikk-spec':            { claude: '2de320e6c970', antigravity: '6976033fec70' },
};

// Non-blocking: reports content drift between the two hand-maintained command
// targets (Claude, Antigravity). Cursor and Gemini are excluded — they're
// mechanically regenerated by sync-targets.js from commands/*.toml, so any
// drift there is a sync-targets bug, not something for a human to eyeball.
function checkClaudeAntigravityDrift() {
  const claudeDir = path.join(ROOT, '.claude', 'commands');
  const agDir     = path.join(ROOT, '.agents', 'workflows');
  if (!fs.existsSync(claudeDir) || !fs.existsSync(agDir)) return { warnings: [] };

  const claudeSet = commandSet({ dir: '.claude/commands', ext: '.md' });
  const agSet     = commandSet({ dir: '.agents/workflows', ext: '.md' });
  if (!claudeSet || !agSet) return { warnings: [] };

  const shared = [...claudeSet].filter(c => agSet.has(c)).sort();
  const warnings = [];
  let acknowledged = 0;

  for (const name of shared) {
    const claudeFile = path.join(claudeDir, `${name}.md`);
    const agFile      = path.join(agDir, `${name}.md`);
    const claudeHash = hashFile(claudeFile);
    const agHash     = hashFile(agFile);
    if (claudeHash === agHash) continue;

    const known = INTENTIONAL_DRIFT[name];
    if (known && claudeHash.startsWith(known.claude) && agHash.startsWith(known.antigravity)) {
      acknowledged++;
      continue;
    }

    const reason = known
      ? `'${name}' drift CHANGED since it was last reviewed as intentional — re-confirm and update INTENTIONAL_DRIFT in scripts/validate-parity.js (claude ${claudeHash.slice(0, 12)}, antigravity ${agHash.slice(0, 12)}).`
      : `'${name}' content differs between .claude/commands/ and .agents/workflows/ — review whether the drift is intentional (Antigravity often carries more inline detail) or accidental staleness. If intentional, add it to INTENTIONAL_DRIFT in scripts/validate-parity.js (claude ${claudeHash.slice(0, 12)}, antigravity ${agHash.slice(0, 12)}).`;
    warnings.push(reason);
  }

  return { warnings, acknowledged };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const cmd  = checkCommandParity();
  const agt  = checkAgentRegistration();
  const drift = checkClaudeAntigravityDrift();
  const errors = [...cmd.errors, ...agt.errors];

  if (errors.length === 0) {
    console.log(`  ✓  command parity — ${cmd.count} commands across ${COMMAND_TARGETS.length} targets`);
    console.log(`  ✓  agent registration — ${agt.count} personas all registered`);
  } else {
    for (const msg of errors) console.log(`  ✗  ${msg}`);
  }

  if (drift.acknowledged > 0) {
    console.log(`  ✓  claude↔antigravity drift — ${drift.acknowledged} reviewed-intentional divergence(s) acknowledged`);
  }

  if (drift.warnings.length > 0) {
    console.log(`\n  ⚠  content drift (non-blocking, ${drift.warnings.length} command(s)):`);
    for (const msg of drift.warnings) console.log(`     - ${msg}`);
  }

  const status = errors.length > 0 ? 'FAILED' : 'PASSED';
  console.log(`\nparity check — ${errors.length} error(s), ${drift.warnings.length} content warning(s) — ${status}`);

  if (errors.length > 0) process.exit(1);
}

main();
