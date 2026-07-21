#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SCORE_WEIGHTS = { quality: 0.35, verification: 0.30, efficiency: 0.20, contextIntegrity: 0.15 };

function readEvents(file) {
  if (!file || !fs.existsSync(file)) return [];
  const events = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try { events.push(JSON.parse(t)); } catch { /* skip malformed line */ }
  }
  return events;
}

function rate(num, den) {
  return den === 0 ? null : num / den;
}

function computeMetrics(events) {
  const count = (ev) => events.filter(e => e.event === ev).length;

  const verPass = count('verification_passed');
  const verFail = count('verification_failed');
  const taskDone = count('task_completed');
  const taskStart = count('task_started');
  const contextResets = count('context_reset');
  const duplicates = count('duplicate_detected');
  const decisionsCreated = count('decision_created');
  const decisionsReused = count('decision_reused');

  const durations = events.filter(e => typeof e.dur_ms === 'number').map(e => e.dur_ms);
  const avgRuntime = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  return {
    verificationPassRate: rate(verPass, verPass + verFail),
    taskSuccessRate:      rate(taskDone, taskStart),
    decisionReuseRate:    rate(decisionsReused, decisionsCreated + decisionsReused),
    duplicateWorkCount:   duplicates,
    contextResetCount:    contextResets,
    avgRuntimeMs:         avgRuntime,
    totalEvents:          events.length,
  };
}

function frameworkScore(m) {
  const quality      = m.taskSuccessRate ?? 0;
  const verification = m.verificationPassRate ?? 0;
  const efficiency   = m.duplicateWorkCount === 0 ? 1 : Math.max(0, 1 - m.duplicateWorkCount / 10);
  const contextIntegrity = m.contextResetCount === 0 ? 1 : Math.max(0, 1 - m.contextResetCount / 10);

  const score =
    quality * SCORE_WEIGHTS.quality +
    verification * SCORE_WEIGHTS.verification +
    efficiency * SCORE_WEIGHTS.efficiency +
    contextIntegrity * SCORE_WEIGHTS.contextIntegrity;

  return { score: Math.round(score * 1000) / 1000, quality, verification, efficiency, contextIntegrity };
}

function pct(v) { return v === null || v === undefined ? 'n/a' : `${Math.round(v * 100)}%`; }

function version() {
  try { return require(path.join(ROOT, 'package.json')).version; } catch { return 'unknown'; }
}

function renderMarkdown(m, s, baseline) {
  const delta = baseline && typeof baseline.score === 'number'
    ? ` (baseline ${baseline.score}, Δ ${(s.score - baseline.score >= 0 ? '+' : '')}${Math.round((s.score - baseline.score) * 1000) / 1000})`
    : '';
  return `# Framework Benchmark

**Version:** ${version()}
**Date:** ${new Date().toISOString().slice(0, 10)}
**Total events:** ${m.totalEvents}

## Framework Score: ${s.score}${delta}

| Component | Weight | Value |
|-----------|--------|-------|
| Quality (task success) | ${SCORE_WEIGHTS.quality} | ${pct(s.quality)} |
| Verification (pass rate) | ${SCORE_WEIGHTS.verification} | ${pct(s.verification)} |
| Efficiency (no duplicate work) | ${SCORE_WEIGHTS.efficiency} | ${pct(s.efficiency)} |
| Context integrity (few resets) | ${SCORE_WEIGHTS.contextIntegrity} | ${pct(s.contextIntegrity)} |

## Metrics

| Metric | Value |
|--------|-------|
| Task success rate | ${pct(m.taskSuccessRate)} |
| Verification pass rate | ${pct(m.verificationPassRate)} |
| Decision reuse rate | ${pct(m.decisionReuseRate)} |
| Duplicate work count | ${m.duplicateWorkCount} |
| Context reset count | ${m.contextResetCount} |
| Avg runtime (ms) | ${m.avgRuntimeMs === null ? 'n/a' : Math.round(m.avgRuntimeMs)} |

_Deterministic: computed only from recorded telemetry events. No AI evaluation._
`;
}

function main() {
  const args = process.argv.slice(2);
  const arg = (name, def) => {
    const i = args.indexOf(name);
    return i !== -1 ? args[i + 1] : def;
  };

  const eventsFile   = arg('--events', path.resolve(process.cwd(), '.teikk/cache/telemetry/events.jsonl'));
  const baselineFile = arg('--baseline', null);
  const outFile      = arg('--out', null);
  const asJson       = args.includes('--json');

  const events = readEvents(eventsFile);
  const metrics = computeMetrics(events);
  const score = frameworkScore(metrics);

  let baseline = null;
  if (baselineFile && fs.existsSync(baselineFile)) {
    try { baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8')); } catch { baseline = null; }
  }

  if (asJson) {
    const out = { version: version(), date: new Date().toISOString().slice(0, 10), score: score.score, components: score, metrics };
    const json = JSON.stringify(out, null, 2) + '\n';
    if (outFile) fs.writeFileSync(outFile, json, 'utf8');
    else process.stdout.write(json);
    return;
  }

  const md = renderMarkdown(metrics, score, baseline);
  if (outFile) { fs.writeFileSync(outFile, md, 'utf8'); console.log(`wrote ${outFile}`); }
  else process.stdout.write(md);
}

main();
