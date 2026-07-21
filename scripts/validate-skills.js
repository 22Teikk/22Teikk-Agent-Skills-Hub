#!/usr/bin/env node
/**
 * validate-skills.js
 *
 * Validates every skill in skills/ against the rules in docs/skill-anatomy.md.
 *
 * Checks (errors block CI):
 *   - SKILL.md exists in every skill directory
 *   - YAML frontmatter present with 'name' and 'description' fields
 *   - frontmatter 'name' matches the directory name
 *   - description does not exceed 1024 characters
 *   - required sections are present
 *
 * Checks (errors block CI):
 *   - cross-skill references point to known skills (a dead reference means a
 *     renamed or deleted skill left a dangling pointer — fail loud)
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const PACKS_DIR = path.join(ROOT, 'packs');

// Every skill/persona is validated exactly once — each dir entry maps a
// physical source location to the logical dir used for lookups/messages.
const SKILL_SOURCE_DIRS = [
  path.join(ROOT, 'core', 'skills'),
  ...packDirs('skills'),
];
const AGENT_SOURCE_DIRS = [
  path.join(ROOT, 'core', 'agents'),
  ...packDirs('agents'),
];

function packDirs(kind) {
  if (!fs.existsSync(PACKS_DIR)) return [];
  return fs.readdirSync(PACKS_DIR)
    .filter(d => fs.statSync(path.join(PACKS_DIR, d)).isDirectory())
    .map(d => path.join(PACKS_DIR, d, kind))
    .filter(p => fs.existsSync(p));
}

const MAX_DESCRIPTION_LENGTH = 1024;

// Sections every standard SKILL.md must contain.
// Each entry is an array of acceptable heading strings — the first
// match wins, so you can list canonical + legacy aliases.
const REQUIRED_SECTIONS = [
  ['## Overview'],
  ['## When to Use'],
  ['## Common Rationalizations'],
  ['## Red Flags'],
  ['## Verification'],
];

// Skills that are intentionally exempt from section checks.
// Exemptions live HERE, not in skill frontmatter, so contributors
// cannot bypass the validator by editing their own skill file.
// Every entry must have a documented reason.
const SECTION_EXEMPT_SKILLS = {
  'using-agent-skills': 'Meta-skill — orchestrates other skills; When-to-Use and Verification are not applicable to a routing document.',
  'idea-refine':        'Legacy structure predating skill-anatomy.md — uses How-It-Works/Usage/Anti-patterns instead of standard headings. Tracked for conformance in https://github.com/22Teikk/22Teikk-Agent-Skills-Hub/issues',
};

// Regex patterns that indicate an explicit cross-skill reference.
// Only these patterns trigger the dead-reference warning — generic
// backtick strings in code blocks are intentionally excluded.
const SKILL_REF_PATTERNS = [
  /\buse the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bfollow the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\binvoke the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bcontinue with `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /\buse `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` skill\b/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` persona\b/g,
  /\bsee `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /──→ ([a-z][a-z0-9-]+[a-z0-9])\b/g,          // ASCII diagram arrows
  /→ `([a-z][a-z0-9-]+[a-z0-9])`/g,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse YAML-style frontmatter from the top of a markdown file.
 * Returns a key→value object, or null if no frontmatter block found.
 * Values are stripped of surrounding quotes.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return null;

  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key   = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Collect all explicit skill cross-references from content.
 * Only matches against the SKILL_REF_PATTERNS list to avoid
 * false-positives from inline code snippets.
 */
function extractSkillReferences(content) {
  const refs = new Set();
  for (const pattern of SKILL_REF_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(content)) !== null) {
      refs.add(m[1]);
    }
  }
  return refs;
}

// ─── Validator ───────────────────────────────────────────────────────────────

function validateSkill(sourceDir, dirName, knownSkills) {
  const errors   = [];
  const warnings = [];
  let   exempt   = false;
  const skillPath = path.join(sourceDir, dirName, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    errors.push('Missing SKILL.md');
    return { errors, warnings, exempt };
  }

  const content = fs.readFileSync(skillPath, 'utf8');

  // ── Frontmatter ──────────────────────────────────────────────────────────
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push('Missing or malformed YAML frontmatter (expected --- block at top of file)');
    return { errors, warnings, exempt };
  }

  if (!fm.name) {
    errors.push("Frontmatter missing required field: 'name'");
  } else if (fm.name !== dirName) {
    errors.push(`Frontmatter name '${fm.name}' does not match directory name '${dirName}'`);
  }

  if (!fm.description) {
    errors.push("Frontmatter missing required field: 'description'");
  } else if (fm.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `Description is ${fm.description.length} chars — exceeds the ${MAX_DESCRIPTION_LENGTH}-char limit` +
      ` (agents inject this into the system prompt)`
    );
  }

  // ── Exemption guard ──────────────────────────────────────────────────────
  // Exemptions are validator-owned (SECTION_EXEMPT_SKILLS above).
  // If a skill's frontmatter tries to declare its own exemption, fail loud —
  // that's a sign someone is trying to bypass the validator.
  if (fm.type === 'meta' || fm.exempt === 'sections') {
    if (!SECTION_EXEMPT_SKILLS[dirName]) {
      errors.push(
        `Frontmatter declares 'type: meta' or 'exempt: sections' but '${dirName}' is not in ` +
        `the validator's SECTION_EXEMPT_SKILLS allowlist. ` +
        `Add an entry to scripts/validate-skills.js with a documented reason.`
      );
    }
  }

  // ── Required sections ────────────────────────────────────────────────────
  exempt = dirName in SECTION_EXEMPT_SKILLS;

  if (!exempt) {
    for (const aliases of REQUIRED_SECTIONS) {
      const found = aliases.some(heading => content.includes(heading));
      if (!found) {
        errors.push(`Missing required section: ${aliases[0]}`);
      }
    }
  }

  // ── Cross-skill references ───────────────────────────────────────────────
  const refs = extractSkillReferences(content);
  for (const ref of refs) {
    if (!knownSkills.has(ref)) {
      errors.push(`Dead cross-reference: \`${ref}\` is not a known skill or persona`);
    }
  }

  return { errors, warnings, exempt };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (SKILL_SOURCE_DIRS.length === 0) {
    console.error(`ERROR: no skill source directories found (expected core/skills and/or packs/*/skills)`);
    process.exit(1);
  }

  // Each skill lives in exactly one source dir (core or a single pack), so
  // walking every source dir in turn visits every skill exactly once.
  const skillEntries = SKILL_SOURCE_DIRS.flatMap(sourceDir =>
    fs.readdirSync(sourceDir)
      .filter(d => fs.statSync(path.join(sourceDir, d)).isDirectory())
      .map(dirName => ({ sourceDir, dirName }))
  ).sort((a, b) => a.dirName.localeCompare(b.dirName));

  const personaNames = AGENT_SOURCE_DIRS.flatMap(sourceDir =>
    fs.readdirSync(sourceDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .map(f => f.slice(0, -3))
  );

  const knownSkills = new Set([...skillEntries.map(e => e.dirName), ...personaNames]);

  let totalErrors   = 0;
  let totalWarnings = 0;

  for (const { sourceDir, dirName } of skillEntries) {
    const { errors, warnings, exempt } = validateSkill(sourceDir, dirName, knownSkills);
    totalErrors   += errors.length;
    totalWarnings += warnings.length;

    if (errors.length === 0 && warnings.length === 0) {
      const tag = exempt ? ' (section checks exempt)' : '';
      console.log(`  ✓  ${dirName}${tag}`);
    } else {
      const icon = errors.length > 0 ? '  ✗ ' : '  ⚠ ';
      console.log(`${icon} ${dirName}`);
      for (const msg of errors)   console.log(`       ERROR: ${msg}`);
      for (const msg of warnings) console.log(`       WARN:  ${msg}`);
    }
  }

  const status = totalErrors > 0 ? 'FAILED' : totalWarnings > 0 ? 'PASSED WITH WARNINGS' : 'PASSED';
  console.log(`\n${skillEntries.length} skills checked — ${totalErrors} error(s), ${totalWarnings} warning(s) — ${status}`);

  if (totalErrors > 0) process.exit(1);
}

main();
