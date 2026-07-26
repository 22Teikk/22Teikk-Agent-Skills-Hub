#!/usr/bin/env node
// scripts/diff-aggregates.js
//
// Compare two teikk telemetry aggregates side-by-side.
// Usage: node scripts/diff-aggregates.js <file1> <file2>
// Both files should be events.jsonl. Outputs a delta report: which events
// grew, shrank, or are new/missing between the two periods.

'use strict';

const fs = require('fs');

const [, , file1, file2] = process.argv;
if (!file1 || !file2) {
  console.error('Usage: node scripts/diff-aggregates.js <before.jsonl> <after.jsonl>');
  process.exit(1);
}

function aggregate(file) {
  if (!fs.existsSync(file)) return { counts: {}, total: 0, first: null, last: null };
  const events = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
  const counts = {};
  let first = null, last = null;
  for (const e of events) {
    counts[e.event] = (counts[e.event] || 0) + 1;
    if (!first || e.ts < first) first = e.ts;
    if (!last || e.ts > last) last = e.ts;
  }
  return { counts, total: events.length, first, last };
}

const a = aggregate(file1);
const b = aggregate(file2);
const keys = new Set([...Object.keys(a.counts), ...Object.keys(b.counts)]);

console.log(`# teikk telemetry diff`);
console.log(`Before: ${file1}  (${a.total} events${a.first ? `, ${a.first} → ${a.last}` : ''})`);
console.log(`After:  ${file2}  (${b.total} events${b.first ? `, ${b.first} → ${b.last}` : ''})`);
console.log();
console.log(`## Delta per event (sorted by absolute change)`);
const deltas = [...keys].map(k => ({
  event: k,
  before: a.counts[k] || 0,
  after:  b.counts[k] || 0,
  delta:  (b.counts[k] || 0) - (a.counts[k] || 0),
}));
deltas.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
for (const d of deltas) {
  const sign = d.delta > 0 ? '+' : d.delta < 0 ? '-' : ' ';
  console.log(`  ${sign}${String(Math.abs(d.delta)).padStart(5)}  ${d.event.padEnd(28)}  ${d.before} → ${d.after}`);
}
