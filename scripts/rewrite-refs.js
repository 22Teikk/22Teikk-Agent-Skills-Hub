#!/usr/bin/env node
'use strict';

/**
 * One-off migration (kept for auditability): convert the `.teikk-agents/`-path
 * content refs in command/skill/agent bodies to the copy-into-each-tool model,
 * where skills/agents are resolved BY NAME (both Claude and OpenCode resolve
 * them by name) and a reference used by a skill is bundled into that skill and
 * addressed by the relative `references/<name>.md` path.
 *
 * Carriers (all delimited — never touches a bare word in a sentence):
 *   `.teikk-agents/skills/X/SKILL.md`  → `X`
 *   `.teikk-agents/skills/X`           → `X`
 *   `.teikk-agents/agents/Y.md`        → `Y`
 *   `.teikk-agents/agents/Y`           → `Y`
 *   [.teikk-agents/agents/Z.md](t)     → [the Z persona](t)     (link text only)
 *   @.teikk-agents/references/R.md      → references/R.md         (in-skill relative)
 * Post-pass collapses a resulting `` `X` (`X`) `` duplication to `` `X` ``.
 *
 * References used by AGENT/COMMAND bodies (not skill bodies) are handled
 * separately by hand (routed through the owning skill), since they need natural
 * phrasing, not a mechanical path swap.
 *
 * Usage:
 *   node scripts/rewrite-refs.js --report   # print every ref + proposed change
 *   node scripts/rewrite-refs.js --write     # apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['commands', 'core', 'packs'];
const EXTS = new Set(['.md', '.toml']);

const NAME = '[a-z0-9][a-z0-9-]*';

const RULES = [
  {
    label: 'agent-link',
    re: new RegExp(`\\[\\.teikk-agents/agents/(${NAME})\\.md\\]\\(([^)]+)\\)`, 'g'),
    apply: (_m, name, target) =>
      name === 'README' || name === 'readme'
        ? `[the personas README](${target})`
        : `[the ${name} persona](${target})`,
  },
  {
    label: 'skill-backtick',
    re: new RegExp('`\\.teikk-agents/skills/(' + NAME + ')(?:/SKILL\\.md)?`', 'g'),
    apply: (_m, name) => '`' + name + '`',
  },
  {
    label: 'agent-backtick',
    re: new RegExp('`\\.teikk-agents/agents/(' + NAME + ')(?:\\.md)?`', 'g'),
    apply: (_m, name) => '`' + name + '`',
  },
  {
    label: 'reference-at',
    re: new RegExp(`@?\\.teikk-agents/references/(${NAME})\\.md`, 'g'),
    apply: (_m, name) => `references/${name}.md`,
    skillOnly: true,
  },
];

// Collapse `X` (`X`) → `X` created when a skill ref that already had the name
// appended in parens gets rewritten to that same name.
const DEDUP_RE = /`([a-z0-9-]+)` \(`\1`\)/g;

// A reference is bundled into (and addressed relative to) a SKILL only. In
// skill bodies the path becomes `references/X.md`; refs from agent/command
// bodies are re-routed through the owning skill by hand, so the mechanical
// reference-at rule is skipped for non-skill files.
function isSkillFile(relPath) {
  return /(^|\/)skills\/[^/]+\/SKILL\.md$/.test(relPath);
}

function transform(content, relPath) {
  let out = content;
  let count = 0;
  const skill = isSkillFile(relPath);
  for (const rule of RULES) {
    if (rule.skillOnly && !skill) continue;
    out = out.replace(rule.re, (...args) => {
      count++;
      return rule.apply(...args);
    });
  }
  out = out.replace(DEDUP_RE, '`$1`');
  return { out, count };
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, acc);
    else if (EXTS.has(path.extname(e.name))) acc.push(abs);
  }
}

function report(files) {
  let n = 0;
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const skill = isSkillFile(rel);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const rule of RULES) {
        if (rule.skillOnly && !skill) continue;
        const re = new RegExp(rule.re.source, 'g');
        let m;
        while ((m = re.exec(line))) {
          const after = rule.apply(...m);
          n++;
          console.log(`${rel}:${i + 1} [${rule.label}]`);
          console.log(`   - ${m[0]}`);
          console.log(`   + ${after}`);
        }
      }
    });
  }
  console.log(`\nrewrite-refs report — ${n} refs`);
}

function main() {
  const files = [];
  for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);

  if (process.argv.includes('--report')) return report(files);

  const write = process.argv.includes('--write');
  let total = 0;
  let touched = 0;
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    const { out, count } = transform(before, path.relative(ROOT, file));
    if (count > 0 && out !== before) {
      total += count;
      touched++;
      console.log(`  ${String(count).padStart(3)}  ${path.relative(ROOT, file)}`);
      if (write) fs.writeFileSync(file, out, 'utf8');
    }
  }
  console.log(`\nrewrite-refs — ${total} refs across ${touched} files${write ? ' (written)' : ' (dry-run; --write to apply, --report for details)'}`);
}

main();
