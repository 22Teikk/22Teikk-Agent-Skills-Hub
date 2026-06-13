# Start spec-driven development — write a structured specification before writing code

Read and follow `skills/spec-driven-development/SKILL.md`.

Begin by understanding what the user wants to build. Ask clarifying questions about:
1. The objective and target users
2. Core features and acceptance criteria
3. Tech stack (language, framework, min/target SDK for Android)
4. Architecture (layers, modules, DI — Hilt default for Kotlin Android)
5. Observability (Timber, Crashlytics, analytics — define before coding)
6. Boundaries (always do / ask first / never do)

Generate a spec covering all nine core areas from the skill: objective, tech stack, architecture, observability, commands, project structure, code style, testing strategy, and boundaries.

For vague Android requests, surface assumptions explicitly (Kotlin + Compose, Hilt, Room, etc.) and ask the user to confirm or correct before writing the spec.

Save the spec as `SPEC.md` in the project root and confirm with the user before proceeding.
