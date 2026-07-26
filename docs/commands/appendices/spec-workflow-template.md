# teikk-agents-skills — Workflow Decision Tree

> Loaded on-demand by `/teikk-spec` only when writing `.teikk/spec/WORKFLOW.md`
> for a new project. Same rationale as `spec-quickstart-template.md`.

You just completed `/teikk-spec`. This decision tree helps you pick the next command.

## Where are you now?

### ✓ You have a SPEC.md

**→ Next step: Break the spec into tasks**
```
/teikk-planning    # Creates .teikk/tasks/plan.md + todo.md
```

Then:
- For Android projects: Phase 0 sets up Hilt + Timber (do this before features)
- For iOS projects: Phase 0 sets up SPM + SwiftLint + logging
- For Flutter projects: Phase 0 sets up flavors + Riverpod/BLoC + logging

---

### ✓ You have a plan.md and tasks

**Pick your mode:**

#### One task at a time (most common)
```
/teikk-build       # Implement one task (TDD: RED → GREEN → regression → commit)
/teikk-test        # Run full test suite
/teikk-review      # Five-axis code review + adversarial pass
/teikk-ship        # Final go/no-go verdict
```

#### All tasks together (faster, needs approval once)
```
/teikk-build auto  # Agent runs all remaining tasks in dependency order
/teikk-test        # Verify everything passes
/teikk-review      # Review all changes
/teikk-ship        # Final verdict
```

#### One task end-to-end (faster, single session)
```
/teikk-quick-implement  # build → test → review → ship in one go
                        # (use when context allows; 33–56k tokens)
```

---

### ✓ Task is done, code is written

**→ Run the review/ship phases:**
```
/teikk-test        # VERIFY: run the full test suite
/teikk-review      # Five-axis review + adversarial pass
/teikk-ship        # Two-tier verdict (GO production / GO demo / NO-GO)
```

---

### ✓ Everything is implemented and reviewed

**→ Ship it:**
```
/teikk-ship        # Final checklist: personas + skill checks + verdict
```

If **GO**: merge and deploy.
If **GO (demo/portfolio)**: merge but note the production blockers for later.
If **NO-GO**: fix the blockers and re-run `/teikk-review` + `/teikk-ship`.

---

### ❌ Something feels wrong

**Run diagnostics:**
```
/teikk-doctor           # Audit your agent-skills setup
/teikk-machine-audit    # Diagnose your Claude Code environment
```

---

### 🎯 Other commands

| When | Command |
|------|---------|
| Code works but is complex | `/teikk-code-simplify` |
| Android performance issue | `/teikk-androidperf` |
| Need ADRs or README updates | `/teikk-docs` |
| Need to debug a failure | `/teikk-machine-audit` |
| Want to refine a vague idea before speccing | `/teikk-idea` |
| Completely unclear what to build | `/teikk-interview` |

---

### 💡 Pro tips

- **Don't skip `/teikk-test` or `/teikk-review`** — they catch issues early
- **Commit after each task** — one commit per task makes history clean and rollback easy
- **Use Phase 0 first** — platform foundation (Hilt, SPM, BLoC) before features
- **If stuck:** run `/teikk-doctor` to rule out setup issues, then `/teikk-machine-audit` to rule out environment issues
