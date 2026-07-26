# teikk-agents-skills — Quick Start

> Loaded on-demand by `/teikk-spec` only at the final step (after the spec body
> is written and `.teikk/spec/QUICKSTART.md` does not yet exist). The command
> prompt's inline copy of this template was the largest single token sink in
> the prompt; moving it here keeps the always-loaded prompt lean.

## Workflow

```
DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP
/teikk-spec  /teikk-planning  /teikk-build  /teikk-test  /teikk-review  /teikk-ship
```

You just ran `/teikk-spec`. Your next command is `/teikk-planning`.

## What is `.teikk/`?

All workflow outputs live here — spec (`spec/`), tasks, ideas, ADRs, decisions log, E2E flows, hook caches. It is gitignored automatically on install. Do not commit it; do not edit files in it by hand unless instructed.

- `.teikk/spec/` — everything from `/teikk-spec` (SPEC.md, PROJECT.yaml, QUICKSTART.md, WORKFLOW.md), grouped in one folder
- `.teikk/DECISIONS.md` — append-only log of significant implemented decisions (architecture choices, hard-to-reverse trade-offs). Written via `/teikk-docs`; see `skills/documentation-and-adrs/SKILL.md`.

## What to commit

- Commit `.teikk-agents-skills.json` — this is your install manifest (version, targets, owned files list).
- Do NOT commit `.teikk/` — it is gitignored by the installer.

## MCP servers

`/teikk-qa` requires the `mobile-mcp` MCP server for UI/UX testing on iOS simulators and Android emulators. Install it separately; without it, Stage 2 of `/teikk-qa` cannot take screenshots or drive the device. All other commands work without any MCP server.

## Command reference

| Command | When to use |
|---------|-------------|
| `/teikk-spec` | Start here — write the spec before any code |
| `/teikk-planning` | Break the spec into tasks with acceptance criteria |
| `/teikk-build` | Implement one task (TDD: red → green → commit) |
| `/teikk-test` | Run the full test suite and fix failures |
| `/teikk-review` | Five-axis code review + adversarial pass |
| `/teikk-ship` | Pre-launch checklist — produces a go/no-go verdict |
| `/teikk-qa` | Deep QA with E2E + UI/UX testing (opt-in, slow) |
| `/teikk-docs` | Write or update ADRs and README |
| `/teikk-idea` | Refine a rough concept before speccing it |
