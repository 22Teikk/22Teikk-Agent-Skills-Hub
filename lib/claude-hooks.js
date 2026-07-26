'use strict';

const fs = require('fs');
const path = require('path');

/**
 * hooks/hooks.json (Claude Code Plugin format) uses ${CLAUDE_PLUGIN_ROOT},
 * which only resolves when installed via the Claude Code plugin marketplace.
 * The npm/CLI install path copies hooks/ as physical project files instead,
 * where only ${CLAUDE_PROJECT_DIR} resolves — so this module rewrites the
 * variable and merges the result into the project's own .claude/settings.json,
 * additively, so a plain `npm install` + `init claude` gets working lifecycle
 * hooks (telemetry, pre-compact checkpoint, session start) without the user
 * having to hand-copy hooks/hooks.json's contents themselves.
 */

const SETTINGS_REL_PATH = path.join('.claude', 'settings.json');

/**
 * Wraps a rewritten `bash ${CLAUDE_PROJECT_DIR}/hooks/<script> ...` command
 * with an existence guard on the script file, so a `.claude/settings.json`
 * committed to git (this file is NOT gitignored — see module doc) doesn't
 * blow up for a teammate who pulled it but hasn't run
 * `npx teikk-agents-skills init claude` yet, and so doesn't have
 * gitignored `hooks/`/`lib/telemetry.sh` on disk. Always exits 0 either way,
 * matching every hook here being observational/non-blocking by contract.
 */
function guardCommand(command) {
  const match = command.match(/\$\{CLAUDE_PROJECT_DIR\}(\/\S+)/);
  if (!match) return command;
  const scriptPath = `\${CLAUDE_PROJECT_DIR}${match[1]}`;
  return `[ -f "${scriptPath}" ] && ${command} || true`;
}

function loadHookDefinitions(packageRoot) {
  const hooksJsonPath = path.join(packageRoot, 'hooks', 'hooks.json');
  if (!fs.existsSync(hooksJsonPath)) return null;
  const raw = fs.readFileSync(hooksJsonPath, 'utf8');
  const rewritten = raw.split('${CLAUDE_PLUGIN_ROOT}').join('${CLAUDE_PROJECT_DIR}');
  const hooks = JSON.parse(rewritten).hooks;
  for (const groups of Object.values(hooks)) {
    for (const group of groups) {
      for (const h of group.hooks || []) {
        h.command = guardCommand(h.command);
      }
    }
  }
  return hooks;
}

function writeSettings(projectRoot, settings) {
  const abs = path.join(projectRoot, SETTINGS_REL_PATH);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

/**
 * Additively merges the package's lifecycle hooks into the project's
 * `.claude/settings.json`. Existing content (any key, any other hook the
 * user configured, even other entries on the SAME event) is preserved —
 * only hook entries whose `command` exactly matches one we ship are
 * considered ours. Safe to call on every install/update: already-present
 * commands are left as-is (idempotent), so a user's own edits (e.g. a
 * different timeout) aren't clobbered on refresh.
 *
 * Returns `{ owned }` — the full "event::command" list this run's hook set
 * represents, for the manifest to persist so `unwireClaudeHooks` later knows
 * exactly what to remove. Returns `null` if hooks/hooks.json is missing, or
 * if settings.json exists but isn't valid JSON (we refuse to touch a file we
 * can't safely parse and rewrite).
 */
function wireClaudeHooks(projectRoot, packageRoot) {
  const hookDefs = loadHookDefinitions(packageRoot);
  if (!hookDefs) return null;

  const settingsPath = path.join(projectRoot, SETTINGS_REL_PATH);
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      return null;
    }
  }

  settings.hooks = settings.hooks || {};

  const owned = [];
  let changed = false;

  for (const [event, groups] of Object.entries(hookDefs)) {
    settings.hooks[event] = settings.hooks[event] || [];
    for (const group of groups) {
      for (const h of group.hooks || []) {
        owned.push(`${event}::${h.command}`);
        const alreadyPresent = settings.hooks[event].some((g) =>
          (g.hooks || []).some((existing) => existing.command === h.command),
        );
        if (!alreadyPresent) {
          settings.hooks[event].push({ hooks: [{ ...h }] });
          changed = true;
        }
      }
    }
  }

  if (changed) {
    writeSettings(projectRoot, settings);
  }

  return { owned };
}

/**
 * Removes exactly the hook entries `ownedCommands` (an "event::command" list
 * from a prior `wireClaudeHooks` call, as persisted in the manifest) points
 * to, leaving anything else in `.claude/settings.json` — the user's own
 * settings, or hooks they added themselves — untouched. Deletes the file
 * only if removing our entries leaves it completely empty.
 */
function unwireClaudeHooks(projectRoot, ownedCommands) {
  if (!ownedCommands || !ownedCommands.length) return [];

  const settingsPath = path.join(projectRoot, SETTINGS_REL_PATH);
  if (!fs.existsSync(settingsPath)) return [];

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return [];
  }
  if (!settings.hooks) return [];

  const ownedSet = new Set(ownedCommands);
  const removed = [];

  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event]
      .map((group) => {
        const keptHooks = (group.hooks || []).filter((h) => {
          const key = `${event}::${h.command}`;
          if (!ownedSet.has(key)) return true;
          removed.push(key);
          return false;
        });
        return { ...group, hooks: keptHooks };
      })
      .filter((group) => group.hooks.length > 0);

    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  if (Object.keys(settings).length === 0) {
    fs.rmSync(settingsPath, { force: true });
  } else if (removed.length) {
    writeSettings(projectRoot, settings);
  }

  return removed;
}

module.exports = { wireClaudeHooks, unwireClaudeHooks, SETTINGS_REL_PATH };
