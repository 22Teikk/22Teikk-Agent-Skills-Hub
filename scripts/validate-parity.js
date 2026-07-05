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
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

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

const AGENTS_DIR      = path.join(ROOT, 'agents');
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

  const personas = fs.existsSync(AGENTS_DIR)
    ? fs.readdirSync(AGENTS_DIR)
        .filter(f => f.endsWith('.md') && f !== 'README.md')
        .map(f => f.slice(0, -3))
        .sort()
    : [];

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

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const cmd = checkCommandParity();
  const agt = checkAgentRegistration();
  const errors = [...cmd.errors, ...agt.errors];

  if (errors.length === 0) {
    console.log(`  ✓  command parity — ${cmd.count} commands across ${COMMAND_TARGETS.length} targets`);
    console.log(`  ✓  agent registration — ${agt.count} personas all registered`);
  } else {
    for (const msg of errors) console.log(`  ✗  ${msg}`);
  }

  const status = errors.length > 0 ? 'FAILED' : 'PASSED';
  console.log(`\nparity check — ${errors.length} error(s) — ${status}`);

  if (errors.length > 0) process.exit(1);
}

main();
