#!/usr/bin/env node
/**
 * sync-targets.js
 *
 * Keeps the "generic-dialect" command targets (Cursor, Gemini) in content-sync
 * with the canonical OpenCode source in commands/*.toml.
 *
 *   commands/<name>.toml   →  canonical source (description + prompt)
 *     ├─ .gemini/commands/<name>.toml   verbatim copy (same TOML dialect)
 *     └─ .cursor/commands/<name>.md     "# <description>\n\n<prompt>"
 *
 * (Claude Code and Antigravity carry their own dialect and are maintained
 *  alongside commands/ — they are not touched here.)
 *
 * Usage:
 *   node scripts/sync-targets.js          # check only — reports drift, exits 1 if any
 *   node scripts/sync-targets.js --write  # regenerate Cursor + Gemini from source
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const SRC_DIR    = path.join(ROOT, 'commands');
const CURSOR_DIR = path.join(ROOT, '.cursor', 'commands');
const GEMINI_DIR = path.join(ROOT, '.gemini', 'commands');

// ─── TOML (this repo's narrow command dialect) ───────────────────────────────

function parseCommandToml(content) {
  const descMatch = content.match(/^description\s*=\s*"((?:[^"\\]|\\.)*)"/m);
  const promptMatch = content.match(/prompt\s*=\s*"""\r?\n([\s\S]*?)\r?\n"""/);
  if (!descMatch || !promptMatch) return null;
  const description = descMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const prompt = promptMatch[1].replace(/\s+$/, '');
  return { description, prompt };
}

function toCursor({ description, prompt }) {
  return `# ${description}\n\n${prompt}\n`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const write = process.argv.includes('--write');

  const sources = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.toml')).sort();
  const drift = [];
  let synced = 0;

  for (const file of sources) {
    const name = file.slice(0, -'.toml'.length);
    const srcRaw = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
    const parsed = parseCommandToml(srcRaw);
    if (!parsed) {
      drift.push(`commands/${file}: could not parse description/prompt`);
      continue;
    }

    const targets = [
      { file: path.join(GEMINI_DIR, `${name}.toml`), want: srcRaw,           label: `.gemini/commands/${name}.toml` },
      { file: path.join(CURSOR_DIR, `${name}.md`),   want: toCursor(parsed), label: `.cursor/commands/${name}.md` },
    ];

    for (const t of targets) {
      const have = fs.existsSync(t.file) ? fs.readFileSync(t.file, 'utf8') : null;
      if (have === t.want) { synced++; continue; }
      if (write) {
        fs.writeFileSync(t.file, t.want, 'utf8');
        console.log(`  ↻  wrote ${t.label}`);
        synced++;
      } else {
        drift.push(t.label + (have === null ? ' (missing)' : ' (out of sync)'));
      }
    }
  }

  if (write) {
    console.log(`\nsync-targets — ${synced} file(s) up to date across ${sources.length} commands`);
    return;
  }

  if (drift.length === 0) {
    console.log(`  ✓  cursor + gemini content in sync with commands/ — ${sources.length} commands`);
    console.log(`\nsync-targets check — 0 drift — PASSED`);
  } else {
    for (const d of drift) console.log(`  ✗  ${d}`);
    console.log(`\nsync-targets check — ${drift.length} drift — FAILED (run: node scripts/sync-targets.js --write)`);
    process.exit(1);
  }
}

main();
