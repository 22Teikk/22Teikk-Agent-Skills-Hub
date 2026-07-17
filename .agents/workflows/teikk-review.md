---
description: Conduct a five-axis code review — correctness, readability, architecture, security, performance
---

Invoke the teikk-agents-skills:code-review-and-quality skill. Read `agents/code-reviewer.md`.

Before reviewing, read `.teikk/spec/PROJECT.yaml` if it exists (fall back to `.teikk/PROJECT.yaml` for older projects) and use its `domain` field as the authoritative domain source. Load `references/domain-guardrails.md` for this domain — a violated domain invariant (e.g. money as `Double` in a finance app) is Critical. If neither PROJECT.yaml path exists, fall back to reading the spec's `Domain:` field (`.teikk/spec/SPEC.md`, falling back to `.teikk/SPEC.md`).

Review the current changes (staged or recent commits) across all five axes:

1. **Correctness** — Does it match the spec? Edge cases handled? Tests adequate (behavioral, not mock-returning-the-answer)? Domain guardrails honored? Every SPEC promise (e.g. a promised DAO test) actually exists?
2. **Readability** — Clear names? Straightforward logic? Well-organized?
3. **Architecture** — Follows existing patterns? Clean boundaries? Right abstraction level?
4. **Security** — Input validated? Secrets safe? Auth checked? (Use `skills/security-and-hardening/SKILL.md`)
5. **Performance** — Platform-specific checks:
   - Android: no blocking main thread I/O, no Compose recomposition issues → `agents/android-performance-auditor.md`
   - iOS: no `DispatchQueue.main.sync`, no retain cycles, no `Task` leaks → `agents/swift-expert.md`
   - Flutter: no `setState` after `dispose`, no unbounded `ListView(children: [...])` → `agents/flutter-expert.md`

Categorize findings as Critical, Important, or Suggestion.

**Then run the mandatory adversarial pass.** Adopt `agents/adversarial-reviewer.md`: for each acceptance criterion, try to prove it is NOT met (no behavioral test → unproven → Critical; attack domain failure modes, boundaries, persistence, concurrency). The adversarial pass returns REFUTED or UNREFUTED (with a non-empty attack log).

**Final verdict = AND of the five-axis review and the adversarial pass.** If the adversarial pass is REFUTED (an AC proven false or a Critical found), the verdict is REQUEST CHANGES regardless of the five-axis result. Output a structured review with specific file:line references and fix recommendations.
