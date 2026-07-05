---
description: Break work into small verifiable tasks with acceptance criteria and dependency ordering
---

Invoke the teikk-agents-skills:planning-and-task-breakdown skill.

Read the existing spec (`SPEC.md` or equivalent) and relevant codebase sections. Then:

1. Enter plan mode — read only, no code changes
2. Extract **Platform**, **Architecture Decisions**, and **Observability** from the spec — if missing, stop and ask the user to update SPEC.md first
3. Identify the dependency graph between components
4. Add **Phase 0 Foundation** based on the platform:
   - **Android** → Hilt + Timber/Crashlytics before feature slices
   - **iOS** → SPM setup + SwiftLint + os_log/Crashlytics before feature slices
   - **Flutter** → Flavor config + state management (Riverpod/BLoC) + logging before feature slices
5. Slice work vertically (one complete path per task, not horizontal layers)
6. Write tasks with acceptance criteria, verification steps, and linked skills or personas:
   - Android tasks → link `android-ui-kotlin`, `android-data-and-concurrency-kotlin`, `android-di-and-build`, `kotlin-specialist`
   - iOS tasks → link `swift-expert`
   - Flutter tasks → link `flutter-expert`
   - Cross-platform tasks → link `mobile-app-developer`
7. Add checkpoints between phases
8. Present the plan for human review

Save the plan to `tasks/plan.md` and task list to `tasks/todo.md`.
