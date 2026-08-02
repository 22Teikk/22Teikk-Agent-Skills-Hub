---
description: Extract what the user actually wants — one question at a time until ~95% confidence
---

Invoke the teikk-agents-skills:interview-me skill.

Use when the ask is underspecified ("build me X"), before any spec, plan, or code.

Do not write code or specs during the interview. Output is a one-sentence hypothesis + confidence %, then one question at a time with a guess attached.

When confidence ≥95%, summarize what the user wants and suggest `/teikk-spec` or `/teikk-idea` as the next step.
