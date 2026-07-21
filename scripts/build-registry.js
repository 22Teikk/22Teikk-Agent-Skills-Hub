#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const CORE_DIR   = path.join(ROOT, 'core');
const PACKS_DIR  = path.join(ROOT, 'packs');
const REGISTRY   = path.join(ROOT, 'registry.json');

const DEFAULT_VERSION = '1.0.0';

// Platform classification now comes from physical location — core/ is always
// 'generic', packs/<name>/ is always '<name>' — rather than a hardcoded name
// map, since the directory split IS the authoritative classification post-#split.
function packNames() {
  if (!fs.existsSync(PACKS_DIR)) return [];
  return fs.readdirSync(PACKS_DIR)
    .filter(d => fs.statSync(path.join(PACKS_DIR, d)).isDirectory())
    .sort();
}

// { name -> { dir, platform } } built once from directory location.
function collectSources(kind) {
  const sources = [];
  const coreKindDir = path.join(CORE_DIR, kind);
  if (fs.existsSync(coreKindDir)) {
    sources.push({ dir: coreKindDir, platform: 'generic' });
  }
  for (const pack of packNames()) {
    const packKindDir = path.join(PACKS_DIR, pack, kind);
    if (fs.existsSync(packKindDir)) {
      sources.push({ dir: packKindDir, platform: pack });
    }
  }
  return sources;
}

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

  const skillSources = collectSources('skills').flatMap(({ dir, platform }) =>
    fs.readdirSync(dir)
      .filter(d => fs.statSync(path.join(dir, d)).isDirectory())
      .map(name => ({ dir, name, platform }))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const personaSources = collectSources('agents').flatMap(({ dir, platform }) =>
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .map(f => ({ dir, name: f.slice(0, -3), platform }))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const known = new Set([...skillSources.map(s => s.name), ...personaSources.map(s => s.name)]);

  const registry = { generatedFrom: 'scripts/build-registry.js', skills: [], personas: [] };
  let changed = 0;

  for (const { dir, name, platform } of skillSources) {
    const file = path.join(dir, name, 'SKILL.md');
    const content = fs.readFileSync(file, 'utf8');
    const fm = splitFrontmatter(content);
    if (!fm) { console.error(`  ✗  ${name}: no frontmatter`); process.exitCode = 1; continue; }

    const keys = parseKeys(fm.body);
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

  for (const { dir, name, platform } of personaSources) {
    const file = path.join(dir, `${name}.md`);
    const content = fs.readFileSync(file, 'utf8');
    const fm = splitFrontmatter(content);
    if (!fm) { console.error(`  ✗  ${name}: no frontmatter`); process.exitCode = 1; continue; }

    const keys = parseKeys(fm.body);
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
