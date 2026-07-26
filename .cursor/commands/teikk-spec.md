# Start spec-driven development — write a structured specification before writing code

Read and follow `skills/spec-driven-development/SKILL.md`.

Surface assumptions explicitly (platform, tech stack defaults by platform per skill, observability, E2E opt-in) and ask the user to confirm or correct before writing the spec. For native vs cross-platform trade-offs, read `agents/mobile-app-developer.md` first.

## Open Questions gate (hard gate — before saving)

Before saving the spec, every `## Open Questions` line must be `- [x] [q] → [resolution]` or `- [~] [q] → deferred: [reason]`. Any `- [ ]` = ask directly, one at a time with your best guess attached (same pattern as `interview-me`), before proceeding. Script-enforced via `bash scripts/check-open-questions.sh` on subsequent phases.

## Output location

Save spec to `.teikk/spec/SPEC.md` (fall back to `.teikk/SPEC.md` only for older pre-3.1 projects). Path conventions centralized in `docs/commands/appendices/paths.md` — read once at start if unsure, don't reinvent the fallback chain inline.

After writing SPEC.md, also write `.teikk/spec/PROJECT.yaml`. Extract values from the spec per the format below; do not invent values (use `generic` for domain, `none` for ci/e2e when unstated):

```yaml
name: <from Objective>
platforms: [<from Tech Stack>]
domain: <from Objective Domain field>
ci: <from Commands section or none>
e2e: <from Testing Strategy E2E field or none>

budgets:                    # omit block for generic (non-mobile) projects
  startup_cold_ms: <platform default or spec value>
  memory_mb: <platform default or spec value>
  jank_frames: <platform default or spec value>

logging:                    # omit block for generic projects
  library: <platform default or spec value>

model_tiers:                # tier names; concrete model values are user's override
  low: haiku
  medium: sonnet
  high: opus
  ultra: fable
```

Platform defaults (apply unless spec overrode them):
- Android budgets: 2000/100/5; logging: `timber` | `logcat` (discouraged)
- iOS budgets: 1500/150/5; logging: `oslog` | `cocoalumberjack`
- Flutter budgets: 2000/120/5; logging: `logger` | `logging` | `print` (discouraged)
- Generic: omit budgets + logging blocks

`logging.library` is what `/teikk-build` reads for inline instrumentation — set it once here so build never has to ask again. `model_tiers` defaults give personas a concrete model per self-classified tier; override any value by editing `PROJECT.yaml` directly. On harnesses with different model catalogs, the lookup is best-effort and falls back to session default — `PROJECT.yaml` is the single source of truth for model names per tier (see `agents/README.md` tiering guidance; this prompt intentionally does not name models — that decision belongs to the user's project).

## Architecture decision → DECISIONS.md

If the architecture gate ran (new project, or feature with no inherited architecture), append one entry to `.teikk/DECISIONS.md` (create with header from `skills/documentation-and-adrs/SKILL.md` if absent). Skip if architecture was inherited.

## Generated appendices (idempotent)

For each of `.teikk/spec/QUICKSTART.md` and `.teikk/spec/WORKFLOW.md`: if absent, read the appendix template (`docs/commands/appendices/spec-quickstart-template.md` / `spec-workflow-template.md`) and write verbatim. If present, skip silently — never overwrite.
