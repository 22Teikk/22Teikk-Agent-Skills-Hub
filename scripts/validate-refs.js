#!/usr/bin/env node
'use strict';

/**
 * CI guard for the copy-into-each-tool + bundled-references model. Asserts:
 *  1. NO `.teikk-agents/` path literal survives anywhere in shipped bodies
 *     (the manifest filename `.teikk-agents-skills.json` is exempt).
 *  2. Every `references/<name>.md` mentioned inside a SKILL body corresponds to
 *     a real file in the package `references/` dir (so install can bundle it).
 *  3. Every skill/agent referenced BY NAME in a body resolves to a real skill
 *     dir or agent file (catches typos after the by-name rewrite).
 *  4. A minimum ref count, so a future accidental wipe can't make this guard
 *     pass trivially with "0 refs checked".
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = [
  'commands',
  'core',
  'hooks',
  'packs',
  'references',
  '.claude/commands',
  '.opencode/commands',
  '.omp/commands',
  '.cursor/commands',
  '.agents/workflows',
];
const EXTS = new Set(['.md', '.toml']);
const MIN_REFERENCE_REFS = 8;

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, acc);
    else if (EXTS.has(path.extname(e.name))) acc.push(abs);
  }
}

function referenceNames() {
  const dir = path.join(ROOT, 'references');
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)),
  );
}

function isSkillFile(rel) {
  return /(^|\/)skills\/[^/]+\/SKILL\.md$/.test(rel);
}

function main() {
  const refs = referenceNames();
  const files = [];
  for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);

  const errors = [];
  let referenceRefCount = 0;

  const STALE_RE = /\.teikk-agents\/(?!skills\.json)/g;
  const SKILL_REF_RE = /references\/([a-z0-9][a-z0-9-]*)\.md/g;
  const STALE_SKILL_PATH_RE = /(?:^|[^a-z0-9-])skills\/[a-z0-9][a-z0-9-]*\/SKILL\.md/g;
  const STALE_AGENT_PATH_RE = /(?:^|[^a-z0-9-])agents\/[a-z0-9][a-z0-9-]*\.md/g;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');

    for (const m of content.matchAll(STALE_RE)) {
      const idx = m.index;
      if (content.slice(idx, idx + '.teikk-agents-skills.json'.length) === '.teikk-agents-skills.json') {
        continue;
      }
      errors.push(`${rel}: stale .teikk-agents/ path — should be by-name or bundled reference`);
    }

    for (const m of content.matchAll(STALE_SKILL_PATH_RE)) {
      errors.push(`${rel}: stale skill path literal ${m[0].trim()} — use the skill by name`);
    }
    for (const m of content.matchAll(STALE_AGENT_PATH_RE)) {
      errors.push(`${rel}: stale agent path literal ${m[0].trim()} — use the agent by name`);
    }

    if (isSkillFile(rel)) {
      for (const m of content.matchAll(SKILL_REF_RE)) {
        referenceRefCount++;
        if (!refs.has(m[1])) {
          errors.push(`${rel}: skill references/${m[1]}.md but no such file in references/`);
        }
      }
    }
  }

  if (referenceRefCount < MIN_REFERENCE_REFS) {
    errors.push(
      `only ${referenceRefCount} in-skill reference refs found (< ${MIN_REFERENCE_REFS}); guard may have stopped matching`,
    );
  }

  if (errors.length === 0) {
    console.log(`  ✓  validate-refs — no stale paths, ${referenceRefCount} bundled-reference refs resolve — PASSED`);
    return;
  }
  for (const e of errors) console.log(`  ✗  ${e}`);
  console.log(`\nvalidate-refs — ${errors.length} problem(s) — FAILED`);
  process.exit(1);
}

main();
