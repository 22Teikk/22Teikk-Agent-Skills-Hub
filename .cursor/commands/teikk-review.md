# Conduct a five-axis code review — correctness, readability, architecture, security, performance

Read and follow `code-review-and-quality`. Read `code-reviewer`.

Before reviewing, read `.teikk/spec/PROJECT.yaml` if it exists (fall back to `.teikk/PROJECT.yaml` for older projects) and use its `domain` field as the authoritative domain source. Load the `code-review-and-quality` skill's `references/domain-guardrails.md` for this domain — a violated domain invariant (e.g. money as `Double` in a finance app) is Critical. If neither PROJECT.yaml path exists, fall back to reading the spec's `Domain:` field (`.teikk/spec/SPEC.md`, falling back to `.teikk/SPEC.md`).

If `.teikk/tasks/todo.md` exists, also read its `**Current task:**` line to scope the review to that task's `## Task N:` section in `.teikk/tasks/plan.md` — avoids re-scanning the whole plan to find what's under review. Read-only lookup; `/teikk-review` does not update `todo.md`.

Read `.teikk/spec/REQUEST.md` when it exists and use it as the authoritative user-request artifact; do not judge scope only against a paraphrased SPEC objective.

Determine review scope before reviewing: if `.teikk/tasks/phase-state.json` contains the current phase's `startSha`, review `git diff <startSha>..HEAD` plus staged and unstaged changes. Otherwise use the current task's phase start commit when recorded by the build log. If the working tree is clean because `/teikk-build` already committed the work, inspect the phase commits and their diff — never return a verdict on an empty diff. If no changed code can be found, say so and stop.

Review the selected phase diff across all five axes:

1. **Correctness** — Does it match the spec? Edge cases handled? Tests adequate (behavioral, not mock-returning-the-answer)? Domain guardrails honored? Every SPEC promise (e.g. a promised DAO test) actually exists?
2. **Readability** — Clear names? Straightforward logic? Well-organized?
3. **Architecture** — Follows existing patterns? Clean boundaries? Right abstraction level?
4. **Security** — Input validated? Secrets safe? Auth checked? (Use `security-and-hardening`)
5. **Performance** — Platform-specific checks:
   - Android: no blocking main thread I/O, no Compose recomposition issues → `android-performance-auditor`
   - iOS: no `DispatchQueue.main.sync`, no retain cycles, no `Task` leaks → `swift-expert`
   - Flutter: no `setState` after `dispose`, no unbounded `ListView(children: [...])` → `flutter-expert`

Categorize findings as Critical, Important, or Suggestion.

## Adversarial pass threshold

Run the adversarial pass unless the change meets all four of these: <=2 files changed, <50 lines changed, no auth/payments/data/config touch, **and the diff carries no logic** — docs, comments, string literals, or config *values* only. A diff that adds or edits a branch, loop, condition, arithmetic, error path, or any executable statement is logic-bearing and gets the adversarial pass no matter how small it is. Below all four, skip the adversarial pass and note in the review output: "Adversarial pass skipped — non-logic change, <=2 files/<50 lines, no auth/payments/data/config." This is a review-time convenience only — it does not change /teikk-ship's gate, which always runs its own mandatory adversarial pass before a GO regardless of what happened here.

Above the threshold, or when in doubt, run it: adopt `adversarial-reviewer` and for each acceptance criterion, try to prove it is NOT met (no behavioral test → unproven → Critical; attack domain failure modes, boundaries, persistence, concurrency). The adversarial pass returns REFUTED or UNREFUTED (with a non-empty attack log).

**Final verdict = AND of the five-axis review and the adversarial pass, when the adversarial pass ran.** If the adversarial pass is REFUTED (an AC proven false or a Critical found), the verdict is REQUEST CHANGES regardless of the five-axis result. If the adversarial pass was skipped under the threshold above, the verdict is the five-axis result alone — note this explicitly in the output so the reader knows the adversarial check still stands between here and /teikk-ship. Output a structured review with specific file:line references and fix recommendations.

**Precondition the skip relies on — state it, don't assume it.** Skipping the adversarial pass here is only safe because /teikk-ship re-runs it unconditionally before any GO. Nothing in this repo forces /teikk-ship to run before a merge, so if this change is a logic-bearing code change that a reviewer might merge on the five-axis PASS alone (without ever running /teikk-ship), do **not** skip — the threshold is meant for documentation/config-comment-only diffs and other non-logic changes, not for any diff that happens to be under 50 lines. When in doubt whether /teikk-ship will run, run the adversarial pass here.
