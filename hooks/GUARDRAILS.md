# Enforced Guardrails (portable)

Three guardrails that are **enforced by executable scripts**, not just described in prose — and portable across every agent (Claude, Cursor, Gemini, OpenCode, Antigravity) because they run as plain shell + a git hook, not through one harness's hook system.

| Guardrail | Enforced by | Vehicle |
|-----------|-------------|---------|
| Secrets never pushed | `hooks/pre-push.sh` → `guardrail-check.sh scan-secrets` | git `pre-push` hook |
| Destructive commands not auto-run | `guardrail-check.sh deny-command` | agent pre-run check |
| Sensitive file needs "Allowed" | `guardrail-check.sh scan-secrets` + this protocol | agent confirmation gate |

## 1. Secret push protection (`pre-push.sh`)

Blocks `git push` when the pushed range adds a sensitive file (`.env`, `*.pem`, `*.keystore`, `*.jks`, `id_rsa`, `secrets.*`, `google-services.json`, `GoogleService-Info.plist`, …). Template/example/doc variants (`.env.example`, `*.sample`, `*.md`) are exempt.

**Install (choose one):**

```bash
# A. point git at the repo's hooks dir (covers all hooks)
git config core.hooksPath hooks

# B. or symlink just this hook
ln -sf ../../hooks/pre-push.sh .git/hooks/pre-push
```

Fail-closed: a detected secret exits non-zero and git aborts the push. Missing git/grep exits 0 (fail-open only for absent tooling, never for a detected secret).

## 2. Destructive-command deny-list

An agent must **suggest**, never auto-run, destructive commands: `git push --force`, `git reset --hard`, `git clean -f`, `rm -rf`, `DROP TABLE`/`DROP DATABASE`/`TRUNCATE`, `terraform apply`/`destroy`, `kubectl delete`, `flyway clean`, `git branch -D`.

Before running any shell command it composed, an agent runs:

```bash
hooks/guardrail-check.sh deny-command "<the command line>"
```

Exit 1 → the command is destructive; surface it to the user and wait for explicit confirmation instead of executing it.

## 3. Sensitive-file "Allowed" gate

When a task would read, modify, or commit a file that `scan-secrets` flags as sensitive, the agent must **stop and ask** — the user has to reply `Allowed` before it proceeds:

```bash
hooks/guardrail-check.sh scan-secrets "<path>" || {
  echo "This touches a sensitive file. Reply 'Allowed' to proceed."
  # do not continue until the user replies Allowed
}
```

This is a protocol, not a kernel-level lock — its point is to convert "the agent silently edited `.env`" into "the agent asked first", which is the enforceable, portable behavior across all harnesses.

## Why scripts, not just markdown

The audit found guardrails were **described, not enforced** — an agent could ignore a markdown rule. Moving the check into `guardrail-check.sh` + a git `pre-push` hook makes the guardrail hold even when the agent doesn't read the doc: git itself blocks the push, and the deny-list check is a deterministic exit code, not a suggestion.
