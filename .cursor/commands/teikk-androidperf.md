# Run an Android performance audit via the android-performance-auditor persona

If `.teikk/PROJECT.yaml` exists, read its `budgets` block and use those values as the pass/fail thresholds for: startup_cold_ms (cold start), memory_mb (peak RSS), and jank_frames (jank frame count). If the file is absent, use defaults: startup_cold_ms: 2000, memory_mb: 100, jank_frames: 5.

Read and follow `agents/android-performance-auditor.md`.

Run an Android performance audit on the codebase or profiles provided by the user.

The user may pass:
- The path of source code, components, or diff under review
- Output from Android Profiler (CPU/Memory/Network traces) or Macrobenchmark results
- The project stack (Kotlin or Java) for language-specific recommendations

Return a detailed performance report with critical issues, severity-classified findings, and specific code recommendations.
