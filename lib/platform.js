'use strict';

const fs = require('fs');
const path = require('path');
const { SUPPORTED_PACKS } = require('./constants');

const PROJECT_YAML_PATHS = ['.teikk/spec/PROJECT.yaml', '.teikk/PROJECT.yaml'];

/**
 * Reads the `platform:` field out of a project's PROJECT.yaml without a full
 * YAML parser — the file is a flat key: value document and this repo only
 * ever needs one scalar field out of it.
 */
function readPlatformField(content) {
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^platform:\s*(.+?)\s*$/);
    if (m) {
      return m[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return null;
}

/**
 * Resolves the install pack for a project: reads `.teikk/spec/PROJECT.yaml`
 * (falling back to the pre-3.1 `.teikk/PROJECT.yaml` location), and returns
 * the `platform:` value if it names a supported pack (android/ios/flutter).
 * Returns null when no PROJECT.yaml exists, the field is absent, or the
 * value is `generic`/unrecognized — all of which mean "install core only".
 */
function resolveProjectPack(projectRoot) {
  for (const relPath of PROJECT_YAML_PATHS) {
    const abs = path.join(projectRoot, relPath);
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    const platform = readPlatformField(content);
    if (platform && SUPPORTED_PACKS.includes(platform)) {
      return platform;
    }
    return null;
  }
  return null;
}

module.exports = {
  PROJECT_YAML_PATHS,
  readPlatformField,
  resolveProjectPack,
};
