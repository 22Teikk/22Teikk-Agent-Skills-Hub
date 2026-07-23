# Diagnostics — health checks & troubleshooting

Both commands are **standalone, opt-in, not part of the core DEFINE→SHIP workflow**. Run them when you need a health check or debugging. Together they form a troubleshooting toolkit for the two layers: your **project setup** (doctor) and your **Claude Code environment** (machine-audit).

## `/teikk-doctor` — Project setup audit

Audits the **agent-skills workflow health** in your project. Writes `.teikk/DOCTOR.md` with a pass/warn/fail checklist.

**Checks:**
1. Gitignore — `.teikk/` in managed block ✓/✗
2. Manifest — `.teikk-agents-skills.json` present and valid ✓/✗
3. Spec — `.teikk/SPEC.md` present and complete (all 8 sections) ✓/⚠/✗
4. PROJECT.yaml — `.teikk/PROJECT.yaml` present ✓/⚠
5. Mobile-mcp — configured if Android/E2E project ✓/⚠/skip
6. E2E tooling — maestro/xcodebuild/flutter on PATH ✓/⚠/skip
7. Tasks — plan.md and todo.md present ✓/⚠/skip
8. Git tree — clean or dirty (informational) ✓/⚠

**Run when:**
- Project feels broken or workflow output is missing
- You just installed agent-skills and want to verify setup
- MCP servers are failing or E2E tests won't run
- Before sharing the project with someone else

**Output:** `.teikk/DOCTOR.md` (pass/warn/fail table + next-action recommendations)

## `/teikk-machine-audit` — Claude Code environment audit

Diagnoses your **Claude Code configuration and performance**. Run this when a session feels slow or expensive and you want to rule out workflow overhead.

**Checks:**
- `.claude/settings.json` and `.claude/settings.local.json` (permissions, hooks, MCP servers)
- MCP server health and connectivity
- Global hooks (are they causing slowdowns?)
- Token/cost instrumentation (is telemetry running?)
- Cache state and memory usage
- Known performance bottlenecks in your config

**Run when:**
- Sessions feel unusually slow or expensive
- MCP servers are timing out or disconnecting
- You suspect a misconfigured hook or permission is causing issues
- Switching to a new machine or Claude Code version
- Before opening a support ticket (rules out workflow as root cause)

**Output:** Detailed environment report with recommendations for improvements

---

## Using both together

**Typical troubleshooting flow:**

1. Something feels wrong → Run `/teikk-doctor` first (quick project-level check)
2. Doctor is green but you're still stuck → Run `/teikk-machine-audit` (diagnose the IDE/agent layer)
3. Both green? → Issue is in your project code, not the workflow or environment
4. Both red? → You have infrastructure + setup issues to fix first before resuming work

**In a new project:**

```
npm install teikk-agents-skills
npx teikk-agents-skills init claude
/teikk-doctor        ← verify install succeeded
/teikk-machine-audit ← verify your Claude Code is healthy
/teikk-spec          ← now you're ready to start
```

---

← Back to [README](../README.md) · Related: [workflow.md](workflow.md) · [framework-internals.md](framework-internals.md)
