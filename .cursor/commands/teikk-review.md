# Conduct a five-axis code review — correctness, readability, architecture, security, performance

Read and follow `skills/code-review-and-quality/SKILL.md`. Read `agents/code-reviewer.md`.

Review the current changes (staged or recent commits) across all five axes:

1. **Correctness** — Does it match the spec? Edge cases handled? Tests adequate?
2. **Readability** — Clear names? Straightforward logic? Well-organized?
3. **Architecture** — Follows existing patterns? Clean boundaries? Right abstraction level?
4. **Security** — Input validated? Secrets safe? Auth checked? (Use `skills/security-and-hardening/SKILL.md`)
5. **Performance** — Platform-specific checks:
   - Android: no blocking main thread I/O, no Compose recomposition issues → `agents/android-performance-auditor.md`
   - iOS: no `DispatchQueue.main.sync`, no retain cycles, no `Task` leaks → `agents/swift-expert.md`
   - Flutter: no `setState` after `dispose`, no unbounded `ListView(children: [...])` → `agents/flutter-expert.md`

Categorize findings as Critical, Important, or Suggestion.
Output a structured review with specific file:line references and fix recommendations.
