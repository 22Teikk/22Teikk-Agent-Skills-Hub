---
description: Run an Android performance audit via the android-performance-auditor persona
---

Read and follow `agents/android-performance-auditor.md`.

Run an Android performance audit on the codebase or profiles provided by the user.

The user may pass:
- The path of source code, components, or diff under review
- Output from Android Profiler (CPU/Memory/Network traces) or Macrobenchmark results
- The project stack (Kotlin or Java) for language-specific recommendations

Return a detailed performance report with critical issues, severity-classified findings, and specific code recommendations.
