# Write or update documentation and Architecture Decision Records

Read and follow `skills/documentation-and-adrs/SKILL.md`.

Use when documenting architectural decisions, API changes, or shipping a feature that needs README/ADR updates.

Deliverables depend on scope:
- ADR for non-obvious decisions (format in skill)
- README sections: quick start, commands, architecture overview
- Inline KDoc for public APIs
- `.teikk/DECISIONS.md` entry for any significant, already-implemented decision (architecture choice, hard-to-reverse trade-off, deliberate deviation from an established pattern) — append-only, one dated entry per decision, format and inclusion criteria in the skill's "Decisions Log" section. Create the file with its header if this is the first entry. Do not log routine implementation choices — only decisions that would need re-explaining later.

Do not document the obvious — document the *why*.
