#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const DEFAULT_PATHS = [
  '.teikk/DECISIONS.md',
  '.teikk/spec/DECISIONS.md',
];

function findDecisionsFile(explicit) {
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  for (const p of DEFAULT_PATHS) {
    if (fs.existsSync(path.resolve(process.cwd(), p))) return path.resolve(process.cwd(), p);
  }
  return null;
}

function parseDecisions(content) {
  const entries = [];
  const blocks = content.split(/\n(?=## )/);
  for (const block of blocks) {
    const head = block.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*[—-]\s*(.+)$/m);
    if (!head) continue;
    const date  = head[1];
    const title = head[2].trim();
    const field = (name) => {
      const m = block.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*([^\\n]+)`, 'i'));
      return m ? m[1].trim() : '';
    };
    entries.push({
      date,
      title,
      context:   field('Context'),
      decision:  field('Decision'),
      rejected:  field('Rejected'),
      reference: field('Reference'),
    });
  }
  return entries;
}

function matches(entry, term) {
  if (!term) return true;
  const hay = `${entry.date} ${entry.title} ${entry.context} ${entry.decision} ${entry.rejected} ${entry.reference}`.toLowerCase();
  return hay.includes(term.toLowerCase());
}

function printHuman(entries) {
  if (entries.length === 0) { console.log('No matching decisions.'); return; }
  for (const e of entries) {
    console.log(`${e.date} — ${e.title}`);
    if (e.decision)  console.log(`    decision:  ${e.decision}`);
    if (e.reference) console.log(`    reference: ${e.reference}`);
  }
  console.log(`\n${entries.length} decision(s).`);
}

function main() {
  const args = process.argv.slice(2);
  const cmd  = args[0] || 'list';
  const fileArgIdx = args.indexOf('--file');
  const explicit = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;
  const asJson = args.includes('--json');

  const file = findDecisionsFile(explicit);
  if (!file) {
    console.error('No DECISIONS.md found (looked for .teikk/DECISIONS.md, .teikk/spec/DECISIONS.md).');
    console.error('Pass --file <path> to point at one.');
    process.exit(2);
  }

  const entries = parseDecisions(fs.readFileSync(file, 'utf8'));

  let result;
  let term = '';
  switch (cmd) {
    case 'list':
      result = entries;
      break;
    case 'find': {
      term = args.slice(1).filter(a => !a.startsWith('--') && a !== explicit).join(' ');
      result = entries.filter(e => matches(e, term));
      break;
    }
    case 'count':
      console.log(asJson ? JSON.stringify({ count: entries.length }) : `${entries.length} decision(s).`);
      return;
    default:
      console.error(`usage: decisions.js {list | find <term> | count} [--json] [--file <path>]`);
      process.exit(2);
  }

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }
}

main();
