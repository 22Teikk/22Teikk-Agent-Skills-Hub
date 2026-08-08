# lib/ — Install Engine

The only real runtime code in the repo. Copies `core/` + one platform pack + per-target files into a consumer project. **Additive and idempotent by contract**: never deletes user files, safe to re-run. Parent: [../AGENTS.md](../AGENTS.md).

## Module Roles

| File | Role |
|------|------|
| `install.js` | Orchestrator. `install()` / `uninstall()` / `findPackageRoot()` / `describeTargets()`. Drives copy → symlink → gitignore → hooks → manifest. |
| `targets.js` | `TARGETS` per-IDE profiles (`copyPaths`, `skillsAgents`, `symlinks`) + `resolveTargets/mergeCopyPaths/mergeSymlinks/needsSkillsAgents`. `SHARED_SCRIPTS` = the 3 scripts shipped to consumers. |
| `copy.js` | File engine. `copyRelative/copyMapped` (merge core+pack into flat `skills/`+`agents/`), `ensureSymlink`, `removeOwnedFiles`, legacy-link migration. |
| `platform.js` | `resolveProjectPack()` reads `.teikk/spec/PROJECT.yaml` (fallback `.teikk/PROJECT.yaml`) `platform:` → android/ios/flutter or null. |
| `gitignore.js` | Idempotent managed block between `GITIGNORE_BEGIN/END` markers; `stripManagedBlock` before rewrite. |
| `claude-hooks.js` | Claude-only. Merges `hooks/hooks.json` into `.claude/settings.json`, rewrites `${CLAUDE_PLUGIN_ROOT}`→`${CLAUDE_PROJECT_DIR}`, guards commands with existence checks. |
| `constants.js` | Names, env vars, `SUPPORTED_PACKS`, gitignore patterns, `MANIFEST_FILE`, `LEGACY_GLOBAL_DIR`. |
| `telemetry.sh` | Shipped to claude target. `teikk_emit()` appends scalar-only JSONL; no-op unless `TEIKK_TELEMETRY=on`. |

## Invariants (do NOT break)

- **Additive**: conflict resolution skips user-owned files, refreshes only package-owned ones. Never destroy user config.
- **Manifest-driven cleanup**: `uninstall()` removes only files listed in `.teikk-agents-skills.json`; unknown files are left.
- **One pack per project**: core is always copied; at most one of android/ios/flutter, chosen by `platform:`. Absent/generic → core only.
- **skills/ and agents/ are real, per-tool copies**; each target is self-contained and no installed target relies on a shared skills symlink.
- **AGENTS.md is never in any target's `copyPaths`** (targets.js L68-72) — deliberate, do not add it.

## Gotchas

- New IDE target = add a `TARGETS` entry AND a `TARGET_GITIGNORE` entry in constants.js.
- Adding a shipped script = extend `SHARED_SCRIPTS`; maintainer/CI scripts must stay out (they're meaningless in an installed project).
- Behavior is verified by `scripts/test-install.js` (7 sub-tests: init/additive/legacy/v2/stale/hooks/shared). Run `node scripts/test-install.js` after any change here.
