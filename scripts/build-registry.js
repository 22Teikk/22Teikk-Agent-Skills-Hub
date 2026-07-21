#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const SKILLS_DIR  = path.join(ROOT, 'skills');
const AGENTS_DIR  = path.join(ROOT, 'agents');
const REGISTRY    = path.join(ROOT, 'registry.json');

const DEFAULT_VERSION = '1.0.0';

// Platform classification drives the conditional intent-map in AGENTS.md.
// A wrong tag silently mis-routes intent, so the map is explicit and reviewed,
// never inferred from the filename at runtime. Anything not listed is generic.
const PLATFORM = {
  'android-data-and-concurrency-java':   'android',
  'android-data-and-concurrency-kotlin': 'android',
  'android-di-and-build':                'android',
  'android-e2e-maestro':                 'android',
  'android-testing-and-benchmark-java':  'android',
  'android-testing-and-benchmark-kotlin':'android',
  'android-ui-java':                     'android',
  'android-ui-kotlin':                   'android',
  'android-performance-auditor':         'android',
  'kotlin-specialist':                   'android',
  'swift-expert':                        'ios',
  'flutter-expert':                      'flutter',
};

const SKILL_REF_PATTERNS = [
  /\buse the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bfollow the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\binvoke the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bcontinue with `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /\buse `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` skill\b/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` persona\b/g,
  /\bsee `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /→ `([a-z][a-z0-9-]+[a-z0-9])`/g,
];

function splitFrontmatter(content) {
  const m = content.match(/^(---[ \t]*\r?\n)([\s\S]*?)(\r?\n---[ \t]*\r?\n)/);
  if (!m) return null;
  return { open: m[1], body: m[2], close: m[3], rest: content.slice(m[0].length), raw: m[0] };
}

function parseKeys(body) {
  const keys = {};
  for (const line of body.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    if (k) keys[k] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return keys;
}

function extractRefs(content, known, self) {
  const refs = new Set();
  for (const p of SKILL_REF_PATTERNS) {
    p.lastIndex = 0;
    let m;
    while ((m = p.exec(content)) !== null) {
      if (m[1] !== self && known.has(m[1])) refs.add(m[1]);
    }
  }
  return [...refs].sort();
}

function platformOf(name) {
  return PLATFORM[name] || 'generic';
}

function upsertField(body, key, value) {
  const lines = body.split(/\r?\n/);
  const idx = lines.findIndex(l => l.trim().startsWith(`${key}:`));
  if (idx !== -1) {
    lines[idx] = `${key}: ${value}`;
  } else {
    lines.push(`${key}: ${value}`);
  }
  return lines.join('\n');
}

function main() {
  const write = process.argv.includes('--write');

  const skillNames = fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory())
    .sort();
  const personaNames = fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => f.slice(0, -3))
    .sort();
  const known = new Set([...skillNames, ...personaNames]);

  const registry = { generatedFrom: 'scripts/build-registry.js', skills: [], personas: [] };
  let changed = 0;

  for (const name of skillNames) {
    const file = path.join(SKILLS_DIR, name, 'SKILL.md');
    const content = fs.readFileSync(file, 'utf8');
    const fm = splitFrontmatter(content);
    if (!fm) { console.error(`  ✗  ${name}: no frontmatter`); process.exitCode = 1; continue; }

    const keys = parseKeys(fm.body);
    const platform = platformOf(name);
    const version  = keys.version || DEFAULT_VERSION;
    const dependsOn = extractRefs(content, known, name);

    let body = upsertField(fm.body, 'version', version);
    body = upsertField(body, 'platform', platform);
    if (dependsOn.length) body = upsertField(body, 'depends-on', `[${dependsOn.join(', ')}]`);

    const next = fm.open + body + fm.close + fm.rest;
    if (next !== content) {
      changed++;
      if (write) fs.writeFileSync(file, next, 'utf8');
    }

    registry.skills.push({ name, version, platform, dependsOn, description: keys.description || '' });
  }

  for (const name of personaNames) {
    const file = path.join(AGENTS_DIR, `${name}.md`);
    const content = fs.readFileSync(file, 'utf8');
    const fm = splitFrontmatter(content);
    if (!fm) { console.error(`  ✗  ${name}: no frontmatter`); process.exitCode = 1; continue; }

    const keys = parseKeys(fm.body);
    const platform = platformOf(name);
    const version  = keys.version || DEFAULT_VERSION;

    let body = upsertField(fm.body, 'version', version);
    body = upsertField(body, 'platform', platform);

    const next = fm.open + body + fm.close + fm.rest;
    if (next !== content) {
      changed++;
      if (write) fs.writeFileSync(file, next, 'utf8');
    }

    registry.personas.push({ name, version, platform, description: keys.description || '' });
  }

  const registryJson = JSON.stringify(registry, null, 2) + '\n';
  const haveRegistry = fs.existsSync(REGISTRY) ? fs.readFileSync(REGISTRY, 'utf8') : null;
  const registryDrift = haveRegistry !== registryJson;
  if (write) fs.writeFileSync(REGISTRY, registryJson, 'utf8');

  if (write) {
    console.log(`  ↻  wrote frontmatter to ${changed} file(s) + registry.json`);
    console.log(`registry — ${registry.skills.length} skills, ${registry.personas.length} personas`);
  } else if (changed === 0 && !registryDrift) {
    console.log(`  ✓  registry in sync — ${registry.skills.length} skills, ${registry.personas.length} personas`);
    console.log(`\nregistry check — 0 drift — PASSED`);
  } else {
    console.log(`  ✗  registry drift — ${changed} frontmatter file(s) stale, registry.json ${registryDrift ? 'stale' : 'ok'}`);
    console.log(`\nregistry check — drift — FAILED (run: node scripts/build-registry.js --write)`);
    process.exit(1);
  }
}

main();
