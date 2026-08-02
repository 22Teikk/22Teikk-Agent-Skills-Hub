# Cross-Model CLI — Reference Appendix

> **When to use this file.** Read on-demand by the `doubt-driven-development` skill Step 3 "Cross-model escalation" when you actually need to invoke a cross-model CLI. The skill itself stays lean (decision rules — when to offer, what to do on failure); this file owns the platform-version-specific invocation syntax.
>
> The skill is loaded on every non-trivial decision; this file is loaded only when a cross-model CLI is actually being invoked. Estimated savings: ~1.5-2 KB tokens per skill load.

---

## Why a read-only sandbox matters

A doubt artifact may itself contain instructions (intentional or accidental prompt injection) that the cross-model CLI would otherwise execute against your workspace. The read-only sandbox is the **load-bearing detail** — without it, you have no defense against the artifact turning the reviewer into a writer.

## Shell-escaping rule (always applies)

**Never interpolate the artifact into a shell-quoted argument.** Code, markdown, and review prompts routinely contain backticks, `$(...)`, and quote characters that will either truncate the prompt or execute embedded shell. Write the full prompt to a temp file and pipe it through stdin.

```bash
# Write the adversarial prompt + ARTIFACT + CONTRACT to a temp file first.
# Then pipe via stdin so shell metacharacters in the artifact stay inert.
```

## Codex (read-only sandbox)

```bash
codex exec --sandbox read-only -C <repo-path> - < /tmp/doubt-prompt.md
```

- `codex exec` — non-interactive subcommand
- `--sandbox read-only` — load-bearing: prevents the CLI from writing to your workspace
- `-C <repo-path>` — sets working directory (use absolute path)
- `-` — read command from stdin
- `< /tmp/doubt-prompt.md` — the file containing the adversarial prompt + ARTIFACT + CONTRACT

## Gemini (read-only via approval mode)

```bash
gemini --approval-mode plan -p "" < /tmp/doubt-prompt.md
```

- `--approval-mode plan` — read-only; equivalent to Codex's `--sandbox read-only`
- `-p ""` — triggers non-interactive mode; the actual prompt comes from stdin
- `< /tmp/doubt-prompt.md` — the file containing the adversarial prompt + ARTIFACT + CONTRACT

**Verify flags against your installed tool — syntax differs across implementations and versions.** Run `gemini --help` / `codex --help` before relying on a snippet from this file.

## Pre-flight checks (mandatory)

Before invoking any cross-model CLI:

1. **PATH check** — `which gemini` / `which codex` to confirm the binary exists.
2. **Working-binary test** — `gemini --version` or equivalent. A stale or broken binary may pass `which` but fail on real input.
3. **Syntax confirmation with the user** — implementations vary; never assume the flags above still apply to the user's installed version. Confirm required flags, auth, and env vars (e.g., API keys) before running.
4. **Authorization** — every invocation is its own authorization. The artifact, the prompt, and the flags change between calls — re-confirm the exact command with the user before every run.

## What to pass

Pass only:

- **ARTIFACT** — the diff or function under review, stripped of your reasoning
- **CONTRACT** — the constraints it has to satisfy (3-5 sentences)
- **Adversarial prompt** — verbatim from the skill's Step 3 ("Find what is wrong. Assume the author is overconfident. Do NOT validate.")

Do NOT pass: session context, the CLAIM (biases toward agreement), or any of your own prior reasoning.

## Failure handling

If the CLI is unavailable, fails, or returns an error:

- **Surface the failure explicitly** — don't silently fall back to single-model. The user should know cross-model didn't happen.
- **Offer alternatives** — run it manually, try a different tool, or skip.
- **Announce the skip in the output** — `"Cross-model skipped: <reason>"`. Skipping is fine; silent skipping is not.

## Non-interactive contexts (CI, `/loop`, autonomous-loop, scheduled runs)

- Cross-model is **skipped**, and the skip must be **announced** in the output: *"Cross-model skipped: non-interactive context."*
- **Never invoke an external CLI without explicit user authorization** — this is a load-bearing safety property.
