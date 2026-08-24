# Oh My Pi (omp) Setup

This guide explains how to use Agent Skills with the **Oh My Pi (`omp`)** coding harness. Oh My Pi reaches full parity with Claude Code and OpenCode: the same 24 `/teikk-*` slash commands, 54 skills, and 12 agent personas — all discovered natively.

## Overview

Oh My Pi discovers project **commands**, **skills**, and **agents** from `.omp/`. The installer writes all three:

| What | Where (installed project) | Discovery |
|------|---------------------------|-----------|
| Slash commands | `.omp/commands/*.md` (24, markdown + YAML frontmatter) | `/teikk-spec`, `/teikk-build`, … register as real commands |
| Skills | `.omp/skills/<skill>/SKILL.md` (physically copied; each skill bundles its `references/`) | resolved by name via harness / tools |
| Agents | `.omp/agents/*.md` (physically copied) | persona definitions for specialized agents |
| Shared scripts | `scripts/` (e.g. `benchmark.js`, `rollback.sh`, `decisions.js`) | CLI helpers executable directly in-project |

The command bodies invoke skills **by name** (`Invoke the teikk-agents-skills:<skill> skill`), so `/teikk-*` commands are true entry points.

---

## Installation

Run these commands from the root of the consuming project:

```bash
cd /absolute/path/to/your-project
```

### 1. Declare Platform (Optional)

Declare the platform before initialization if targeting a mobile platform:

```bash
mkdir -p .teikk/spec
printf 'platform: android\n' > .teikk/spec/PROJECT.yaml
```

Use `platform: ios` or `platform: flutter` for those stacks. For non-mobile (backend, web, CLI, generic), omit `platform:` or omit the file entirely (core-only skills will be installed).

### 2. Install Package & Initialize Target

Install the latest GitHub source over HTTPS:

```bash
npm install \
  'git+https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git#main' \
  --save-dev
npx teikk-agents-skills init omp
```

When published to npm:

```bash
npm install teikk-agents-skills@latest --save-dev
npx teikk-agents-skills init omp
```

### 3. Auto-install on `npm install` (Recommended)

Add this configuration to your project's `package.json` so future `npm install` runs initialize the target automatically:

```json
{
  "devDependencies": {
    "teikk-agents-skills": "latest"
  },
  "teikk-agents-skills": {
    "target": "omp"
  }
}
```

---

## Workspace Structure

After running `init omp`, your project will have:

```text
your-project/
├── .omp/
│   ├── commands/
│   │   ├── teikk-spec.md
│   │   ├── teikk-planning.md
│   │   ├── teikk-build.md
│   │   ├── teikk-test.md
│   │   ├── teikk-review.md
│   │   ├── teikk-ship.md
│   │   └── ... (24 commands total)
│   ├── skills/
│   │   ├── spec-driven-development/
│   │   │   ├── SKILL.md
│   │   │   └── references/
│   │   └── ... (all core + platform skills)
│   └── agents/
│       ├── code-reviewer.md
│       ├── adversarial-reviewer.md
│       ├── security-auditor.md
│       └── ... (personas)
├── scripts/
│   ├── benchmark.js
│   ├── rollback.sh
│   ├── decisions.js
│   └── ...
└── .gitignore  (includes managed .omp/ and .teikk/ ignore block)
```

---

## How It Works

### 1. Slash Commands

All 24 slash commands live in `.omp/commands/*.md`. Each file contains YAML frontmatter (`description`) and the execution prompt:

```markdown
---
description: Spec-driven development — define what to build before building it
---

Follow the spec-driven development process...
```

### 2. Full Engineering Lifecycle

| Phase | Commands | Primary Skills |
|-------|----------|----------------|
| **Define** | `/teikk-interview`, `/teikk-idea`, `/teikk-spec`, `/teikk-map-code-base` | `spec-driven-development`, `idea-refine`, `interview-me` |
| **Plan** | `/teikk-planning` | `planning-and-task-breakdown` |
| **Build** | `/teikk-build`, `/teikk-quick-implement`, `/teikk-android-setup`, `/teikk-ios-setup`, `/teikk-flutter-setup` | `incremental-implementation`, `test-driven-development` |
| **Verify** | `/teikk-test` | `test-driven-development`, `debugging-and-error-recovery` |
| **Review** | `/teikk-review`, `/teikk-code-simplify` | `code-review-and-quality`, `code-simplification` |
| **Ship** | `/teikk-ship`, `/teikk-ci`, `/teikk-docs` | `shipping-and-launch`, `ci-cd-and-automation` |
| **QA** | `/teikk-qa`, `/teikk-e2e`, `/teikk-ux-test` | `android-e2e-maestro`, `ui-ux-tester` |
| **Diagnostics** | `/teikk-doctor`, `/teikk-machine-audit` | Project health & environment audits |

---

## Verification

After installation, verify the setup:

```bash
find .omp/commands -maxdepth 1 -name '*.md' | wc -l   # Expect: 24
find .omp/skills -name SKILL.md | wc -l              # Expect: 54+ (core + platform)
find .omp/agents -maxdepth 1 -name '*.md' | wc -l    # Expect: 7+ (core + platform)
```

To update after framework releases:

```bash
npx teikk-agents-skills update omp
```

To cleanly uninstall:

```bash
npx teikk-agents-skills uninstall
npm uninstall teikk-agents-skills
```
