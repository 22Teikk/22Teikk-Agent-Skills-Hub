# Run a Flutter performance audit via the flutter-performance-auditor persona

If `.teikk/spec/PROJECT.yaml` exists (fall back to `.teikk/PROJECT.yaml` for older projects), read its `budgets` block and use those values as the pass/fail thresholds for: startup_cold_ms (cold start), memory_mb (peak RSS), and jank_frames (jank frame count). If neither path exists, use defaults: startup_cold_ms: 2000, memory_mb: 100, jank_frames: 5.

Read and follow `flutter-performance-auditor`.

Run a Flutter performance audit on the codebase or profiles provided by the user.

The user may pass:
- The path of source code, components, or diff under review
- Output from DevTools (CPU/Memory/Network timelines) or integration_test PerformanceMetrics/Timeline results — collected via `flutter run --profile`, never from a debug-mode run
- The project stack (Flutter version, state management — Riverpod/BLoC/Provider) for framework-specific recommendations

Return a detailed performance report with critical issues, severity-classified findings, and specific code recommendations.
