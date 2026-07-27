teikk-agents-skills loaded — 31 workflow skills + 11 personas across Define→Plan→Build→Verify→Review→Ship. Active pack: Android (Kotlin/Compose) by default; iOS/Flutter skills activate when PROJECT.yaml `platforms` lists them.

## Skill Discovery

```
Task arrives
    │
    ├── Don't know what you want yet? ──────→ interview-me
    ├── Have a rough concept, need variants? → idea-refine
    ├── New project/feature/change? ──→ spec-driven-development
    ├── Have a spec, need tasks? ──────→ planning-and-task-breakdown
    ├── Implementing code? ────────────→ incremental-implementation
    │   ├── Android (Kotlin)? ─────────→ android-ui-kotlin, compose-animations when motion is in scope,
    │   │                                android-data-and-concurrency-kotlin, android-di-and-build, kotlin-specialist
    │   ├── Android (Java)? ───────────→ android-ui-java, android-data-and-concurrency-java
    │   ├── iOS? ──────────────────────→ agents/swift-expert (skill-stubs: ios-ui, ios-data, ios-di)
    │   ├── Flutter? ──────────────────→ agents/flutter-expert (skill-stubs: flutter-ui, flutter-data, flutter-di)
    │   └── Cross-cutting? ────────────→ api-and-interface-design, context-engineering,
    │                                    source-driven-development, doubt-driven-development
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

**Check for an applicable skill before starting work — skills encode processes that prevent common mistakes.** Full Core Operating Behaviors, Failure Modes, and the Quick Reference table live in `skills/using-agent-skills/SKILL.md` — read it in full once you've identified which skill(s) apply, or at the start of a multi-skill task, not on every message. Heavy command prompts (`/teikk-spec`, `/teikk-build ultra`, `/teikk-ship`) reference `docs/commands/appendices/*.md` for sections only some invocations need — those files are read on-demand, not pre-loaded.
