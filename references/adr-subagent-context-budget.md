# ADR: Subagent Context & Token Budget

**Status:** Accepted
**Context layer:** framework governance (applies to how commands fan out to subagents)

## Context

The framework fans out to subagents (`/teikk-ship`, `/teikk-build ultra`) and relies on model tiering (`PROJECT.yaml` → `model_tiers`). The audit found there is **no explicit context/token budget** for a subagent: nothing states how much context a spawned agent should receive, when a task is too large to fan out, or what to do when a subagent approaches its context limit. "Min 200k token" was raised as a requirement but was **Unable to verify** — no mechanism enforced it.

This is a governance gap, not a runtime one: the framework has no daemon that can meter tokens. The decision is therefore a **policy** agents follow, plus the observability hooks (see `references/` observability design) that make budget adherence *measurable* offline.

## Decision

1. **Budget is per-task, not per-agent.** A subagent is spawned for one task with one deliverable. If a task cannot be described in a self-contained prompt (goal + files + conventions + verification) under a reasonable context slice, it is **too large to fan out** — split it first.

2. **Context injection is explicit and minimal.** A spawn prompt carries only: the task, the file paths it touches, the conventions to follow, and the verification steps. It does **not** carry the whole conversation, unrelated modules, or the parent's full context. Each subagent starts fresh.

3. **Tiering, not budgeting, controls model choice.** `model_tiers` in `PROJECT.yaml` maps a self-classified complexity (low/medium/high/ultra) to a concrete model. This is best-effort: if the harness cannot set per-call models, the session default is used. There is deliberately **no hard token cap** encoded in the framework, because the five target harnesses meter tokens differently and a hard number would be wrong on at least four.

4. **Overflow is a split signal, not a retry signal.** When a subagent approaches its context limit mid-task, the correct response is to narrow scope or split the task (see `references/failure-recovery.md` retry policy), never to blindly re-issue the same oversized task.

5. **Adherence is measured offline.** Whether fan-out stayed within a healthy budget is a *benchmark* metric (average/peak context size per task), derived offline from telemetry — never a runtime AI self-evaluation.

## Consequences

- **Positive:** portable across all five harnesses (no hardcoded token number); prevents the "spawn one giant subagent" anti-pattern; makes budget a measurable, offline metric instead of an unenforced claim.
- **Negative:** budget adherence is a discipline, not a hard gate — a misbehaving agent can still over-inject context. The observability spine surfaces this after the fact rather than blocking it in the moment.
- **Revisit if:** a target harness exposes a real token-budget API that all five can share, at which point a hard cap becomes portable and this ADR should be upgraded from policy to enforcement.
