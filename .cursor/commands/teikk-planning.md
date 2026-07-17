# Break work into small verifiable tasks with acceptance criteria and dependency ordering

Read and follow `skills/planning-and-task-breakdown/SKILL.md`.

Read the existing spec — check `.teikk/spec/SPEC.md` first, fall back to `.teikk/SPEC.md` (older, pre-folder-layout projects) if that path doesn't exist — and relevant codebase sections. Then:

1. **Open Questions gate (hard gate).** Read the spec's `## Open Questions` section. If any line is unresolved (`- [ ]`), stop and ask it directly in this session, one question at a time with your best guess attached — do not proceed to task generation on a silently-skipped question. Once answered, update the spec line to `- [x] ... → [resolution]` (or `- [~] ... → deferred: [reason]`).
2. Enter plan mode — read only, no code changes
3. Extract **Platform**, **Architecture Decisions**, and **Observability** from the spec — if missing, stop and ask the user to update the spec first
4. Identify the dependency graph between components
5. Add **Phase 0 Foundation** based on the platform:
   - **Android** → Hilt + Timber/Crashlytics before feature slices
   - **iOS** → SPM setup + SwiftLint + os_log/Crashlytics before feature slices
   - **Flutter** → Flavor config + state management (Riverpod/BLoC) + logging before feature slices
6. Slice work vertically (one complete path per task, not horizontal layers)
7. Write tasks with acceptance criteria, verification steps, and **linked behavioral tests**:
   - Each AC must map to a **behavioral test** (class/method or flow name, not a mock or label)
   - Format: `- [ ] [AC description] → \`TestClass.testMethod\` (unit | integration | e2e)`
   - Examples:
     - ✓ `Users can save → \`SaveViewModelTest.save_updatesDatabase\` (unit)`
     - ✓ `Total is calculated → \`TransactionDaoTest.insertAndSum\` (integration, Room in-memory)`
     - ✗ `UI shows data → \`ExampleInstrumentedTest\`` (boilerplate, not behavioral)
     - ✗ `User sees button → mock repository returns true` (mock-only, not behavioral)
   - Link skills/personas:
     - Android → `android-ui-kotlin`, `android-data-and-concurrency-kotlin`, `android-di-and-build`, `kotlin-specialist`
     - iOS → `swift-expert`
     - Flutter → `flutter-expert`
     - Cross-platform → `mobile-app-developer`
8. Add checkpoints between phases
9. **TRACEABILITY CHECKLIST** — Verify every AC has a real test before writing code:
   - [ ] Every AC maps to a test class/method (not a mock)
   - [ ] No "label-only" tests (must assert a value, not visibility)
   - [ ] Data layer has at least one Room in-memory DAO test (integration, not mocked)
10. Present the plan for human review

Save the plan to `.teikk/tasks/plan.md` and task list to `.teikk/tasks/todo.md`. The test mappings in each task will be read by `/teikk-ship` Phase B to validate traceability.
