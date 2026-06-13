# Teikk Agent Skills

**Production-grade engineering skills for AI coding agents.**

Maintained by **[22Teikk](https://github.com/22Teikk)** — [22Teikk-Agent-Skills-Hub](https://github.com/22Teikk/22Teikk-Agent-Skills-Hub).

Skills encode the workflows, quality gates, and best practices that senior engineers use when building software. These ones are packaged so AI agents follow them consistently across every phase of development.

```
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /teikk-spec    /teikk-planning  /teikk-build  /teikk-test  /teikk-review  /teikk-ship
```

---

## Commands

7 slash commands that map to the development lifecycle. Each one activates the right skills automatically.

| What you're doing | Command | Key principle |
|-------------------|---------|---------------|
| Define what to build | `/teikk-spec` | Spec before code |
| Plan how to build it | `/teikk-planning` | Small, atomic tasks |
| Build incrementally | `/teikk-build` | One slice at a time |
| Prove it works | `/teikk-test` | Tests are proof |
| Review before merge | `/teikk-review` | Improve code health |
| Simplify the code | `/teikk-code-simplify` | Clarity over cleverness |
| Ship to production | `/teikk-ship` | Faster is safer |

Want fewer manual steps once the spec exists? **`/teikk-build auto`** generates the plan and implements every task in a single approved pass — you approve the plan once, then it runs autonomously. It removes the human stepping *between* tasks, not the verification: every task is still test-driven and committed individually, and it pauses on failures or risky steps.

Skills also activate automatically based on what you're doing — designing an API triggers `api-and-interface-design`, building Android UI triggers `android-ui-kotlin` or `android-ui-java`, and so on.

---

## Quick Start

<details open>
<summary><b>npm (any IDE)</b></summary>

Works with Cursor, Claude Code, Antigravity, Gemini CLI, and OpenCode. Installs IDE-specific config and updates `.gitignore` automatically.

```bash
npm install teikk-agents-skills --save-dev
npx teikk-agents-skills init cursor    # or: claude | antigravity | gemini | opencode | all
```

Auto-install on `npm install` — add to your project's `package.json`:

```json
{
  "teikk-agents-skills": { "target": "cursor" }
}
```

From GitHub:

```bash
npm install github:22Teikk/22Teikk-Agent-Skills-Hub#v1.2.0 --save-dev
npx teikk-agents-skills init cursor
```

Full guide: [docs/npm-install.md](docs/npm-install.md).

</details>

<details>
<summary><b>Claude Code (marketplace)</b></summary>

**Marketplace install:**

```
/plugin marketplace add 22Teikk/22Teikk-Agent-Skills-Hub
/plugin install teikk-agents-skills@teikk-agents-skills-hub
```

> **SSH errors?** The marketplace clones repos via SSH. If you don't have SSH keys set up on GitHub, either [add your SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) or use the full HTTPS URL to force the HTTPS cloning:
> ```bash
> /plugin marketplace add https://github.com/22Teikk/22Teikk-Agent-Skills-Hub.git
> /plugin install teikk-agents-skills@teikk-agents-skills-hub
> ```

**Local / development:**

```bash
git clone git@github.com:22Teikk/22Teikk-Agent-Skills-Hub.git
claude --plugin-dir /path/to/22Teikk-Agent-Skills-Hub
```

</details>

<details>
<summary><b>Cursor</b></summary>

```bash
npm install teikk-agents-skills --save-dev && npx teikk-agents-skills init cursor
```

Manual copy: see [docs/cursor-setup.md](docs/cursor-setup.md).

</details>

<details>
<summary><b>Antigravity 2.0</b></summary>

This repo ships `.agents/rules/` and `.agents/workflows/` for native Antigravity 2.0 support — the equivalent of `.cursor/rules/` for Cursor. See [docs/antigravity-setup.md](docs/antigravity-setup.md).

**Workspace (IDE):** Open this repo in Antigravity — rules and `/` workflows load automatically.

**CLI plugin:**

```bash
agy plugin install git@github.com:22Teikk/22Teikk-Agent-Skills-Hub.git
```

</details>

<details>
<summary><b>Gemini CLI</b></summary>

Install as native skills for auto-discovery, or add to `GEMINI.md` for persistent context. See [docs/gemini-cli-setup.md](docs/gemini-cli-setup.md).

**Install from the repo:**

```bash
gemini skills install git@github.com:22Teikk/22Teikk-Agent-Skills-Hub.git --path skills
```

**Install from a local clone:**

```bash
gemini skills install ./22Teikk-Agent-Skills-Hub/skills/
```

</details>

<details>
<summary><b>OpenCode</b></summary>

Uses agent-driven skill execution via AGENTS.md and the `skill` tool.

See [docs/opencode-setup.md](docs/opencode-setup.md).

</details>

<details>
<summary><b>Codex / Other Agents</b></summary>

Skills are plain Markdown - they work with any agent that accepts system prompts or instruction files. See [docs/getting-started.md](docs/getting-started.md).

</details>



---

## All 28 Skills

The commands above are entry points. The pack includes 28 skills total — 27 lifecycle skills plus the `using-agent-skills` meta-skill. Each skill is a structured workflow with steps, verification gates, and anti-rationalization tables. You can also reference any skill directly.

### Meta - Discover which skill applies

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [using-agent-skills](skills/using-agent-skills/SKILL.md) | Maps incoming work to the right skill workflow and defines shared operating rules | Starting a session or deciding which skill applies |

### Define - Clarify what to build

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [interview-me](skills/interview-me/SKILL.md) | One-question-at-a-time interview that extracts what the user actually wants instead of what they think they should want, until ~95% confidence | The ask is underspecified, or the user invokes "interview me" / "grill me" |
| [idea-refine](skills/idea-refine/SKILL.md) | Structured divergent/convergent thinking to turn vague ideas into concrete proposals | You have a rough concept that needs exploration |
| [spec-driven-development](skills/spec-driven-development/SKILL.md) | Write a PRD covering objectives, commands, structure, code style, testing, and boundaries before any code | Starting a new project, feature, or significant change |

### Plan - Break it down

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [planning-and-task-breakdown](skills/planning-and-task-breakdown/SKILL.md) | Decompose specs into small, verifiable tasks with acceptance criteria and dependency ordering | You have a spec and need implementable units |

### Build - Write the code

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [incremental-implementation](skills/incremental-implementation/SKILL.md) | Thin vertical slices - implement, test, verify, commit. Feature flags, safe defaults, rollback-friendly changes | Any change touching more than one file |
| [test-driven-development](skills/test-driven-development/SKILL.md) | Red-Green-Refactor, test pyramid (80/15/5), test sizes, DAMP over DRY, Beyonce Rule, Android UI testing | Implementing logic, fixing bugs, or changing behavior |
| [context-engineering](skills/context-engineering/SKILL.md) | Feed agents the right information at the right time - rules files, context packing, MCP integrations | Starting a session, switching tasks, or when output quality drops |
| [source-driven-development](skills/source-driven-development/SKILL.md) | Ground every framework decision in official documentation - verify, cite sources, flag what's unverified | You want authoritative, source-cited code for any framework or library |
| [doubt-driven-development](skills/doubt-driven-development/SKILL.md) | Adversarial fresh-context review of every non-trivial decision in-flight - CLAIM → EXTRACT → DOUBT → RECONCILE → STOP, with optional user-authorized cross-model escalation | Stakes are high (production, security, irreversible), working in unfamiliar code, or a confident output is cheaper to verify now than to debug later |
| [android-ui-kotlin](skills/android-ui-kotlin/SKILL.md) | Kotlin and Jetpack Compose state, MVVM, view models, and image loading with Coil | Building UI in Kotlin Android projects |
| [android-ui-java](skills/android-ui-java/SKILL.md) | Java and XML Layouts, flat hierarchies with ConstraintLayout, optimized RecyclerView | Building UI in Java Android projects |
| [android-data-and-concurrency-kotlin](skills/android-data-and-concurrency-kotlin/SKILL.md) | Asynchronous data flow with Coroutines, Flow, Retrofit, serialization, and Room | Handling Kotlin concurrency and databases |
| [android-data-and-concurrency-java](skills/android-data-and-concurrency-java/SKILL.md) | Asynchronous tasks with CompletableFuture, RxJava, Retrofit, and Room | Handling Java concurrency and databases |
| [android-di-and-build](skills/android-di-and-build/SKILL.md) | Dependency injection with Hilt, Gradle KTS, Version Catalog, GitHub Actions, Firebase App Distribution | Injecting dependencies and setting up build scripts |
| [api-and-interface-design](skills/api-and-interface-design/SKILL.md) | Contract-first design, Hyrum's Law, One-Version Rule, error semantics, boundary validation | Designing APIs, module boundaries, or public interfaces |

### Verify - Prove it works

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [android-testing-and-benchmark-kotlin](skills/android-testing-and-benchmark-kotlin/SKILL.md) | Unit testing with JUnit and MockK, Compose UI testing, Macrobenchmarks | Testing Kotlin Android projects |
| [android-testing-and-benchmark-java](skills/android-testing-and-benchmark-java/SKILL.md) | Unit testing with JUnit, Espresso UI testing, Macrobenchmarks | Testing Java Android projects |
| [debugging-and-error-recovery](skills/debugging-and-error-recovery/SKILL.md) | Five-step triage: reproduce, localize, reduce, fix, guard. Stop-the-line rule, safe fallbacks | Tests fail, builds break, or behavior is unexpected |

### Review - Quality gates before merge

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [code-review-and-quality](skills/code-review-and-quality/SKILL.md) | Five-axis review, change sizing (~100 lines), severity labels (Nit/Optional/FYI), review speed norms, splitting strategies | Before merging any change |
| [code-simplification](skills/code-simplification/SKILL.md) | Chesterton's Fence, Rule of 500, reduce complexity while preserving exact behavior | Code works but is harder to read or maintain than it should be |
| [security-and-hardening](skills/security-and-hardening/SKILL.md) | OWASP Top 10 prevention, auth patterns, secrets management, dependency auditing, three-tier boundary system | Handling user input, auth, data storage, or external integrations |

### Ship - Deploy with confidence

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [git-workflow-and-versioning](skills/git-workflow-and-versioning/SKILL.md) | Trunk-based development, atomic commits, change sizing (~100 lines), the commit-as-save-point pattern | Making any code change (always) |
| [ci-cd-and-automation](skills/ci-cd-and-automation/SKILL.md) | Shift Left, Faster is Safer, feature flags, quality gate pipelines, failure feedback loops | Setting up or modifying build and deploy pipelines |
| [deprecation-and-migration](skills/deprecation-and-migration/SKILL.md) | Code-as-liability mindset, compulsory vs advisory deprecation, migration patterns, zombie code removal | Removing old systems, migrating users, or sunsetting features |
| [documentation-and-adrs](skills/documentation-and-adrs/SKILL.md) | Architecture Decision Records, API docs, inline documentation standards - document the *why* | Making architectural decisions, changing APIs, or shipping features |
| [observability-and-instrumentation](skills/observability-and-instrumentation/SKILL.md) | Structured logging, RED metrics, OpenTelemetry tracing, symptom-based alerting - instrument as you build | Adding telemetry, or shipping anything that runs in production |
| [shipping-and-launch](skills/shipping-and-launch/SKILL.md) | Pre-launch checklists, feature flag lifecycle, staged rollouts, rollback procedures, monitoring setup | Preparing to deploy to production |

---

## Agent Personas

Pre-configured specialist personas for targeted reviews:

| Agent | Role | Perspective |
|-------|------|-------------|
| [code-reviewer](agents/code-reviewer.md) | Senior Staff Engineer | Five-axis code review with "would a staff engineer approve this?" standard |
| [test-engineer](agents/test-engineer.md) | QA Specialist | Test strategy, coverage analysis, and the Prove-It pattern |
| [security-auditor](agents/security-auditor.md) | Security Engineer | Vulnerability detection, threat modeling, OWASP assessment |
| [android-performance-auditor](agents/android-performance-auditor.md) | Android Performance Engineer | App Startup and Frame Rendering audits; run it via `/teikk-androidperf` |

---

## Reference Checklists

Quick-reference material that skills pull in when needed:

| Reference | Covers |
|-----------|--------|
| [testing-patterns.md](references/testing-patterns.md) | Test structure, naming, mocking, Compose/Espresso/MockK examples, anti-patterns |
| [security-checklist.md](references/security-checklist.md) | Pre-commit checks, storage, network security config, intents/deep links, WebView security, OWASP Mobile Top 10 |
| [performance-checklist.md](references/performance-checklist.md) | Android app startup, rendering frame jank, profiling tools |
| [accessibility-checklist.md](references/accessibility-checklist.md) | Android TalkBack content descriptions, touch target size, semantics merging |

---

## How Skills Work

Every skill follows a consistent anatomy:

```
┌─────────────────────────────────────────────────┐
│  SKILL.md                                       │
│                                                 │
│  ┌─ Frontmatter ─────────────────────────────┐  │
│  │ name: lowercase-hyphen-name               │  │
│  │ description: Guides agents through [task].│  │
│  │              Use when…                    │  │
│  └───────────────────────────────────────────┘  │                                                                                                
│  Overview         → What this skill does        │
│  When to Use      → Triggering conditions       │
│  Process          → Step-by-step workflow       │
│  Rationalizations → Excuses + rebuttals         │
│  Red Flags        → Signs something's wrong     │
│  Verification     → Evidence requirements       │
└─────────────────────────────────────────────────┘
```

**Key design choices:**

- **Process, not prose.** Skills are workflows agents follow, not reference docs they read. Each has steps, checkpoints, and exit criteria.
- **Anti-rationalization.** Every skill includes a table of common excuses agents use to skip steps (e.g., "I'll add tests later") with documented counter-arguments.
- **Verification is non-negotiable.** Every skill ends with evidence requirements - tests passing, build output, runtime data. "Seems right" is never sufficient.
- **Progressive disclosure.** The `SKILL.md` is the entry point. Supporting references load only when needed, keeping token usage minimal.

---

## Project Structure

```
22Teikk-Agent-Skills-Hub/
├── skills/                            # 28 skills (27 lifecycle + 1 meta)
│   ├── interview-me/                  #   Define
│   ├── idea-refine/                   #   Define
│   ├── spec-driven-development/       #   Define
│   ├── planning-and-task-breakdown/   #   Plan
│   ├── incremental-implementation/    #   Build
│   ├── context-engineering/           #   Build
│   ├── source-driven-development/     #   Build
│   ├── doubt-driven-development/      #   Build
│   ├── android-ui-kotlin/             #   Build
│   ├── android-ui-java/               #   Build
│   ├── android-data-and-concurrency-kotlin/ # Build
│   ├── android-data-and-concurrency-java/ # Build
│   ├── android-di-and-build/          #   Build
│   ├── test-driven-development/       #   Build
│   ├── api-and-interface-design/      #   Build
│   ├── android-testing-and-benchmark-kotlin/ # Verify
│   ├── android-testing-and-benchmark-java/ # Verify
│   ├── debugging-and-error-recovery/  #   Verify
│   ├── code-review-and-quality/       #   Review
│   ├── code-simplification/          #   Review
│   ├── security-and-hardening/        #   Review
│   ├── git-workflow-and-versioning/   #   Ship
│   ├── ci-cd-and-automation/          #   Ship
│   ├── deprecation-and-migration/     #   Ship
│   ├── documentation-and-adrs/        #   Ship
│   ├── observability-and-instrumentation/ # Ship
│   ├── shipping-and-launch/           #   Ship
│   └── using-agent-skills/            #   Meta: how to use this pack
├── agents/                            # 4 specialist personas
├── references/                        # 4 supplementary checklists
├── hooks/                             # Session lifecycle hooks
├── .cursor/                           # Rules + commands (Cursor)
│   ├── rules/                         #   3 essential .mdc rules
│   └── commands/                      #   8 teikk-* lifecycle slash commands
├── .agents/                           # Rules + workflows (Antigravity 2.0)
│   ├── rules/                         #   Always-on engineering rules
│   └── workflows/                     #   8 teikk-* lifecycle slash commands
├── .claude/commands/                  # 8 teikk-* slash commands (Claude Code)
├── .gemini/commands/                  # 8 teikk-* slash commands (Gemini CLI)
├── commands/                          # 8 teikk-* slash commands (Antigravity CLI)
├── plugin.json                        # Antigravity plugin manifest
└── docs/                              # Setup guides per tool
```

---

## Why Agent Skills?

AI coding agents default to the shortest path - which often means skipping specs, tests, security reviews, and the practices that make software reliable. Agent Skills gives agents structured workflows that enforce the same discipline senior engineers bring to production code.

Each skill encodes hard-won engineering judgment: *when* to write a spec, *what* to test, *how* to review, and *when* to ship. These aren't generic prompts - they're the kind of opinionated, process-driven workflows that separate production-quality work from prototype-quality work.

Skills bake in best practices from Google's engineering culture — including concepts from [Software Engineering at Google](https://abseil.io/resources/swe-book) and Google's [engineering practices guide](https://google.github.io/eng-practices/). You'll find Hyrum's Law in API design, the Beyonce Rule and test pyramid in testing, change sizing and review speed norms in code review, Chesterton's Fence in simplification, trunk-based development in git workflow, Shift Left and feature flags in CI/CD, and a dedicated deprecation skill treating code as a liability. These aren't abstract principles — they're embedded directly into the step-by-step workflows agents follow.

---

## Contributing

Skills should be **specific** (actionable steps, not vague advice), **verifiable** (clear exit criteria with evidence requirements), **battle-tested** (based on real workflows), and **minimal** (only what's needed to guide the agent).

See [docs/skill-anatomy.md](docs/skill-anatomy.md) for the format specification and [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT - use these skills in your projects, teams, and tools.
