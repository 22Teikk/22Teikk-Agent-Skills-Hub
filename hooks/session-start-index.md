teikk-agents-skills loaded — 30 workflow skills across Define→Plan→Build→Verify→Review→Ship.

## Skill Discovery

```
Task arrives
    │
    ├── Don't know what you want yet? ──────→ interview-me
    ├── Have a rough concept, need variants? → idea-refine
    ├── New project/feature/change? ──→ spec-driven-development
    ├── Have a spec, need tasks? ──────→ planning-and-task-breakdown
    ├── Implementing code? ────────────→ incremental-implementation
    │   └── platform-specific? ───────→ android-ui-*, android-data-and-concurrency-*,
    │                                    android-di-and-build, api-and-interface-design,
    │                                    context-engineering, source-driven-development,
    │                                    doubt-driven-development
    ├── Writing/running tests? ────────→ test-driven-development (+ android-testing-and-benchmark-*, android-e2e-maestro)
    ├── Something broke? ──────────────→ debugging-and-error-recovery
    ├── Reviewing code? ───────────────→ code-review-and-quality (+ code-simplification, security-and-hardening)
    ├── Committing/branching? ─────────→ git-workflow-and-versioning
    ├── CI/CD pipeline work? ──────────→ ci-cd-and-automation
    ├── Deprecating/migrating? ────────→ deprecation-and-migration
    ├── Writing docs/ADRs? ───────────→ documentation-and-adrs
    ├── Adding logs/metrics/alerts? ───→ observability-and-instrumentation
    ├── Session feels slow/expensive? ─→ machine-audit (standalone, user-initiated only)
    └── Deploying/launching? ─────────→ shipping-and-launch
```

**Check for an applicable skill before starting work — skills encode processes that prevent common mistakes.** Full Core Operating Behaviors, Failure Modes, and the Quick Reference table live in `skills/using-agent-skills/SKILL.md` — read it in full once you've identified which skill(s) apply, or at the start of a multi-skill task, not on every message.
