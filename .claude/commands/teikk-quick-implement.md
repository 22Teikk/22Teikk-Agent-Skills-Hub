---
description: Implement one task end-to-end with automatic context compaction — build, test, review, ship
---

Execute a single task from `.teikk/tasks/plan.md` through build → test → review → ship in one session.

**Monitor token budget.** If <20% remaining, apply compaction: summarize BUILD (AC + build success), collapse TEST (count + failures only), collapse REVIEW (table + critical issues), collapse SHIP (verdict + blockers table).

## Phases

1. **Build** — TDD (RED → GREEN → regression → commit)
2. **Test** — Full suite + verify pass
3. **Review** — Five-axis + adversarial pass
4. **Ship** — Two-tier verdict (GO production / GO demo / NO-GO)

Stop on failure. Do NOT skip phases.

## Context cost

- Build: 8–15k
- Test: 3–6k
- Review: 10–15k
- Ship: 12–20k
- **Total: 33–56k tokens**

## When to use

✅ Single, well-scoped task  
✅ 100k+ context available  
✅ Want one verdict, not four commands  

❌ Multiple tasks (use `/teikk-build auto`)  
❌ Exploratory/uncertain changes  
❌ Low token budget
