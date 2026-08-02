'use strict';

const fs = require('fs');
const path = require('path');

// A skill declares the references it needs by mentioning `references/<name>.md`
// in its own SKILL.md body (relative form, resolved from the skill dir at
// runtime). The skill body is the single source of truth — no hand-maintained
// map — so a reference bundles into exactly the skills that actually use it.
const REF_TOKEN = /references\/([a-z0-9][a-z0-9-]*)\.md/g;

/**
 * After a tool's `skills/` copy, bundle each skill's referenced files:
 * for every `references/<name>.md` token in a copied `<skillsDest>/<skill>/SKILL.md`,
 * copy `<packageRoot>/references/<name>.md` into `<skillsDest>/<skill>/references/`.
 * Records written paths (project-relative, POSIX) in `written` so the manifest
 * owns them and uninstall/prune can remove them. Missing reference files are
 * skipped silently (an orphan token is a validate-refs concern, not install's).
 */
function bundleSkillReferences(packageRoot, projectRoot, skillsDestRel, opts = {}) {
  const written = opts.written || [];
  const skillsDestAbs = path.join(projectRoot, skillsDestRel);
  if (!fs.existsSync(skillsDestAbs)) return;

  for (const skill of fs.readdirSync(skillsDestAbs, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const skillMd = path.join(skillsDestAbs, skill.name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;

    const body = fs.readFileSync(skillMd, 'utf8');
    const names = new Set();
    for (const m of body.matchAll(REF_TOKEN)) names.add(m[1]);
    if (names.size === 0) continue;

    for (const name of names) {
      const srcRef = path.join(packageRoot, 'references', `${name}.md`);
      if (!fs.existsSync(srcRef)) continue;
      const destDirAbs = path.join(skillsDestAbs, skill.name, 'references');
      fs.mkdirSync(destDirAbs, { recursive: true });
      fs.copyFileSync(srcRef, path.join(destDirAbs, `${name}.md`));
      written.push(`${skillsDestRel}/${skill.name}/references/${name}.md`);
    }
  }
}

module.exports = { bundleSkillReferences, REF_TOKEN };
