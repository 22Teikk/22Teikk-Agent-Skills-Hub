# Break work into small verifiable tasks with acceptance criteria and dependency ordering

Read and follow `skills/planning-and-task-breakdown/SKILL.md`.

Read the existing spec (`SPEC.md` or equivalent) and relevant codebase sections. Then:

1. Enter plan mode — read only, no code changes
2. Extract **Architecture Decisions** and **Observability** from the spec — if missing, stop and ask the user to update SPEC.md first
3. Identify the dependency graph between components
4. For Android/new projects: add **Phase 0 Foundation** (Hilt + Timber/Crashlytics) before feature slices
5. Slice work vertically (one complete path per task, not horizontal layers)
6. Write tasks with acceptance criteria, verification steps, and linked skills (e.g. `android-di-and-build`, `android-ui-kotlin`)
7. Add checkpoints between phases
8. Present the plan for human review

Save the plan to `tasks/plan.md` and task list to `tasks/todo.md`.
