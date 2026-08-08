#!/usr/bin/env node
/**
 * sync-targets.js
 *
 * Keeps every per-target command directory in content-sync with the canonical
 * OpenCode source in commands/*.toml.
 *
 *   commands/<name>.toml                ← canonical source (description + prompt)
 *     ├─ .gemini/commands/<name>.toml      verbatim copy (same TOML dialect)
 *     ├─ .cursor/commands/<name>.md        "# <description>\n\n<prompt>"
 *     ├─ .claude/commands/<name>.md        YAML frontmatter + body
 *     ├─ .opencode/commands/<name>.md      YAML frontmatter + body (Claude-shape)
 *     └─ .agents/workflows/<name>.md       "# <description>\n\n<prompt>"
 *
 * Per-target overrides inside the TOML prompt (so a single source can ship
 * dialect-specific phrasing without forking the command):
 *
 *     default line/paragraph that ships to every target
 *     <!-- @override:claude -->Claude-only phrasing<!-- @end -->
 *     default line/paragraph that ships to every target
 *
 * The marker block REPLACES the immediately-preceding line/paragraph for the
 * targets listed in `@override:<targets>` (comma-separated). For all other
 * targets the preceding default line is kept and the marker block is dropped.
 * Multiple `@override` blocks per prompt are supported. Targets: claude,
 * opencode, antigravity, cursor, gemini (any subset).
 *
 * Usage:
 *   node scripts/sync-targets.js          # check only — reports drift, exits 1 if any
 *   node scripts/sync-targets.js --write  # regenerate every target from source
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const SRC_DIR    = path.join(ROOT, 'commands');
const CURSOR_DIR = path.join(ROOT, '.cursor', 'commands');
const GEMINI_DIR = path.join(ROOT, '.gemini', 'commands');
const CLAUDE_DIR = path.join(ROOT, '.claude', 'commands');
const OPENCODE_DIR = path.join(ROOT, '.opencode', 'commands');
const AG_DIR     = path.join(ROOT, '.agents', 'workflows');

// ─── TOML (this repo's narrow command dialect) ───────────────────────────────

function parseCommandToml(content) {
  const descMatch = content.match(/^description\s*=\s*"((?:[^"\\]|\\.)*)"/m);
  const promptMatch = content.match(/prompt\s*=\s*"""\r?\n([\s\S]*?)\r?\n"""/);
  if (!descMatch || !promptMatch) return null;
  const description = descMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const prompt = promptMatch[1].replace(/\s+$/, '');
  return { description, prompt };
}

/**
 * Strip override marker blocks from raw TOML content so the Gemini target stays
 * verbatim-without-internal-comments. Handles both single-line markers and
 * multi-line marker blocks. The immediately-preceding line is kept (it's the
 * "default" content other targets use); only the marker block itself is
 * dropped. Blank lines around markers are preserved.
 */
function stripMarkersFromToml(content) {
  const lines = content.split('\n');
  const out = [];
  let i = 0;
  const SINGLE_RE      = /^[ \t]*<!--\s*@override:[\w,-]+\s*-->[\s\S]*?<!--\s*@end\s*-->\s*$/;
  const MULTI_START_RE = /^[ \t]*<!--\s*@override:[\w,-]+\s*-->\s*$/;
  const MULTI_END_RE   = /^[ \t]*<!--\s*@end\s*-->\s*$/;

  while (i < lines.length) {
    const line = lines[i];

    if (SINGLE_RE.test(line)) {
      // Drop single-line marker; preceding line (already in out) is the default.
      i++;
      continue;
    }
    if (MULTI_START_RE.test(line)) {
      // Drop multi-line marker block (open + content + close).
      i++;
      while (i < lines.length && !MULTI_END_RE.test(lines[i])) i++;
      if (i < lines.length) i++;
      continue;
    }
    out.push(line);
    i++;
  }
  return out.join('\n');
}

// ─── Marker-aware prompt extraction ──────────────────────────────────────────

const SINGLE_MARKER_RE = /^[ \t]*<!--\s*@override:([\w,-]+)\s*-->([\s\S]*?)<!--\s*@end\s*-->\s*$/;
const MULTI_START_RE   = /^[ \t]*<!--\s*@override:([\w,-]+)\s*-->\s*$/;
const MULTI_END_RE     = /^[ \t]*<!--\s*@end\s*-->\s*$/;

/**
 * Walk the prompt line-by-line so we can handle both single-line markers
 * (`<!-- @override:claude -->content<!-- @end -->` on one line) and
 * multi-line markers (open + content lines + close on separate lines).
 *
 * For each marker, the IMMEDIATELY-PRECEDING line is the default content.
 * For listed targets, the default is replaced by the marker content. For all
 * other targets, the default is kept and the marker block is dropped. If a
 * marker has no preceding line, its content is appended (addition semantics).
 */
function extractForTarget(prompt, target) {
  const lines = prompt.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const singleMatch = line.match(SINGLE_MARKER_RE);
    if (singleMatch) {
      const targets = singleMatch[1].split(',').map(s => s.trim());
      const content  = singleMatch[2].trim();
      const preceding = out.length > 0 ? out.pop() : '';
      if (targets.includes(target)) {
        if (content) out.push(content);
      } else if (preceding) {
        out.push(preceding);
      }
      i++;
      continue;
    }

    const startMatch = line.match(MULTI_START_RE);
    if (startMatch) {
      const targets = startMatch[1].split(',').map(s => s.trim());
      const contentLines = [];
      i++;
      while (i < lines.length && !MULTI_END_RE.test(lines[i])) {
        contentLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume end marker
      const preceding = out.length > 0 ? out.pop() : '';
      const block = contentLines.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
      if (targets.includes(target)) {
        if (block) out.push(block);
      } else if (preceding) {
        out.push(preceding);
      }
      continue;
    }

    out.push(line);
    i++;
  }
  return out.join('\n');
}

function toCursor({ description, prompt }) {
  const body = extractForTarget(prompt, 'cursor');
  return `# ${description}\n\n${body}\n`;
}

function toClaudeMd({ description, prompt }) {
  const body = extractForTarget(prompt, 'claude');
  return `---\ndescription: ${description}\n---\n\n${body}\n`;
}

function toAntigravityMd({ description, prompt }) {
  const body = extractForTarget(prompt, 'antigravity');
  return `# ${description}\n\n${body}\n`;
}

// OpenCode reads `.opencode/commands/<name>.md` in the same markdown+frontmatter
// shape as Claude (docs use the plural dir; binary also accepts `command/`);
// mirrors toClaudeMd but extracts the `opencode` override channel.
function toOpencodeMd({ description, prompt }) {
  const body = extractForTarget(prompt, 'opencode');
  return `---\ndescription: ${description}\n---\n\n${body}\n`;
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
      { file: path.join(GEMINI_DIR, `${name}.toml`), want: stripMarkersFromToml(srcRaw), label: `.gemini/commands/${name}.toml` },
      { file: path.join(CURSOR_DIR, `${name}.md`),   want: toCursor(parsed),             label: `.cursor/commands/${name}.md`   },
      { file: path.join(CLAUDE_DIR, `${name}.md`),   want: toClaudeMd(parsed),           label: `.claude/commands/${name}.md`   },
      { file: path.join(OPENCODE_DIR, `${name}.md`), want: toOpencodeMd(parsed),         label: `.opencode/commands/${name}.md` },
      { file: path.join(AG_DIR, `${name}.md`),       want: toAntigravityMd(parsed),      label: `.agents/workflows/${name}.md`  },
    ];

    for (const t of targets) {
      const have = fs.existsSync(t.file) ? fs.readFileSync(t.file, 'utf8') : null;
      if (have === t.want) { synced++; continue; }
      if (write) {
        fs.mkdirSync(path.dirname(t.file), { recursive: true });
        fs.writeFileSync(t.file, t.want, 'utf8');
        console.log(`  ↻  wrote ${t.label}`);
        synced++;
      } else {
        drift.push(t.label + (have === null ? ' (missing)' : ' (out of sync)'));
      }
    }
  }

  if (write) {
    console.log(`\nsync-targets — ${synced} file(s) up to date across ${sources.length} commands × 5 targets`);
    return;
  }

  if (drift.length === 0) {
    console.log(`  ✓  all 5 targets in sync with commands/ — ${sources.length} commands`);
    console.log(`\nsync-targets check — 0 drift — PASSED`);
  } else {
    for (const d of drift) console.log(`  ✗  ${d}`);
    console.log(`\nsync-targets check — ${drift.length} drift — FAILED (run: node scripts/sync-targets.js --write)`);
    process.exit(1);
  }
}

main();
