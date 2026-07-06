# Domain Guardrails

A **generic method** for loading domain-specific correctness rules into review, security, and ship gates — plus a fully worked finance example.

A fintech review must not look like a blog review. The single most damaging failure mode in the workflow is a *generic* review that never loads the invariants of the domain it is reviewing, so a finance app ships money stored as `Double`. This file makes the review **domain-aware** without hardcoding every domain: the agent detects the domain, then **derives** that domain's guardrails itself, fetching authoritative sources when unsure.

## How to use this file

1. **Detect the domain.** Read the SPEC `Domain:` field (`.teikk/SPEC.md`). If absent, infer it from the objective and data model (transactions/money → finance; patient/dose → health; login/token/session → auth) and state your inference so a human can veto.
2. **Derive the guardrails** for that domain by answering the three questions below.
3. **Load them into the gate.** In `/teikk-review` and `/teikk-ship`, any violation of a *banned pattern* is **Critical**; any missing *required test* is a traceability blocker.

## The method — deriving guardrails for ANY domain

Ask these three questions of the domain. The answers *are* the guardrails.

1. **Which value must never be silently wrong?** — the quantity whose corruption is invisible until it's expensive: money, a medication dose, a GPS coordinate, an auth token's expiry, an inventory count. Find how it is represented in code and confirm the representation cannot lose precision, overflow, or round the wrong way.
2. **Which boundary must have a test?** — the edge where naive code breaks: rounding direction, timezone / day boundary, off-by-one, empty/first-run state, unit conversion, concurrency. Each boundary → a required behavioral test.
3. **Which regulatory / safety constraint applies?** — data-retention, PII handling, audit logging, consent, encryption-at-rest, session expiry. Violations are Critical regardless of "it works".

**When you are not certain of a domain's real rules, do not guess.** Invoke `skills/source-driven-development/SKILL.md` to fetch the authoritative reference (standard, regulation, platform doc, or a well-known library's guidance) and derive the guardrail from it. Record the source in your finding. Guessing a domain invariant is worse than admitting you need to look it up.

## Worked example — finance / payments

This is the template. Reproduce this *shape* for whatever domain you detect.

### Banned patterns (violation = Critical)
- **Money as `Double`/`Float` anywhere** — entity fields, DAO return types, DTOs, UI state, aggregation. `0.1 + 0.2 != 0.3`; errors compound over sums. Require **`Long` in minor units** (cents) or **`BigDecimal`** with an explicit `RoundingMode`.
- **`SUM(amount)` typed as a float** — e.g. `fun total(): Flow<Double>`. A Room aggregate over a money column must return `Long`/`BigDecimal`, not `Double`.
- **Implicit rounding / no `RoundingMode`** — any division (splitting, tax, interest) without a declared rounding policy.
- **Naive local dates for grouping** — bucketing transactions "by month/day" using device-local time without a fixed, tested timezone → transactions land in the wrong period at boundaries.

### Required tests (missing = traceability blocker)
- **Rounding test** — a case that would fail under float math (e.g. sum of many `0.1`), asserting the exact minor-unit total.
- **Timezone / day-boundary test** — a transaction at 23:59 and 00:01 around a month boundary lands in the correct bucket under the app's declared timezone.
- **DAO behavioral test** — Room **in-memory** insert → `SUM`/query → assert the exact aggregate value and type (not a mock returning the expected number).

### What a good fix looks like
```kotlin
// BAD — precision loss, silent, ships green
@Entity data class TransactionEntity(val amountDollars: Double)
@Query("SELECT SUM(amountDollars) FROM txn") fun total(): Flow<Double>

// GOOD — integer minor units; exact
@Entity data class TransactionEntity(val amountMinor: Long)     // cents
@Query("SELECT COALESCE(SUM(amountMinor),0) FROM txn") fun totalMinor(): Flow<Long>
// format at the edge only: BigDecimal(totalMinor).movePointLeft(2) for display
```

## Starter prompts for other domains

These are **not** exhaustive checklists — they are seeds. Apply the three-question method and fetch authoritative sources to complete them for the specific app.

- **health / PII:** dose/measurement must never round wrong or lose units; PII encrypted at rest and never logged; audit trail for reads/writes; consent state. (Fetch the relevant regulation, e.g. HIPAA/GDPR, via source-driven-development.)
- **auth / session:** token expiry and rotation enforced and tested; session invalidation on logout/password-change; no secret in logs or URL params; boundary tests around expiry instant.
- **location / mapping:** coordinate precision and datum; boundary/antimeridian handling; permission + background-use compliance.

## Wiring

- `skills/code-review-and-quality/SKILL.md` (correctness & security axes) and `skills/security-and-hardening/SKILL.md` load this file after detecting the domain.
- `agents/code-reviewer.md`, `agents/security-auditor.md`, and `agents/adversarial-reviewer.md` reference it to ground findings in domain invariants rather than generic advice.
- Adding a new domain = append a section using the three-question method; no gate code changes.
