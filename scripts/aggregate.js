#!/usr/bin/env node
// scripts/aggregate.js
//
// Aggregate a teikk telemetry events.jsonl into a summary report.
// Reads from .teikk/cache/telemetry/events.jsonl (or path from $1).
// Outputs: total events, unique event types, top-N counts, time range.

'use strict';

const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(process.cwd(), '.teikk', 'cache', 'telemetry', 'events.jsonl');

if (!fs.existsSync(file)) {
  console.error(`No telemetry file at: ${file}`);
  console.error('Run with TEIKK_TELEMETRY=on first, then invoke /teikk-* commands to generate events.');
  process.exit(1);
}

const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
const events = [];
for (const line of lines) {
  try { events.push(JSON.parse(line)); }
  catch { /* skip malformed */ }
}

const counts = {};
const statuses = {};
const byHour = {};
let first = null, last = null;

for (const e of events) {
  counts[e.event] = (counts[e.event] || 0) + 1;
  const key = `${e.event}:${e.status || ''}`;
  statuses[key] = (statuses[key] || 0) + 1;
  const hour = (e.ts || '').slice(0, 13);
  byHour[hour] = (byHour[hour] || 0) + 1;
  if (!first || e.ts < first) first = e.ts;
  if (!last || e.ts > last) last = e.ts;
}

console.log(`# teikk telemetry aggregate`);
console.log(`Source: ${file}`);
console.log(`Events: ${events.length}`);
if (first) console.log(`Range:  ${first} → ${last}`);
console.log();
console.log(`## Event counts (top 20)`);
Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20)
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(6)}  ${k}`));
console.log();
console.log(`## Event × status`);
Object.entries(statuses).sort()
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(6)}  ${k}`));
console.log();
console.log(`## Events per hour`);
Object.entries(byHour).sort()
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(6)}  ${k}`));
