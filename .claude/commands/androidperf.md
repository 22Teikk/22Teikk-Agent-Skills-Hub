---
description: Run an Android performance audit via the android-performance-auditor persona
---

# /androidperf

Run an Android performance audit on your codebase or profiles using the `android-performance-auditor` subagent.

## Usage

Pass this command:
- The path of the source code, components, or diff under review.
- The output files or reports from Android Profiler (CPU/Memory/Network traces) or Macrobenchmark results.
- Specify the project's stack (Kotlin or Java) to trigger language-specific recommendations.

The subagent will return a detailed performance report outlining critical issues, high/medium/low severity findings, and specific code recommendations.
