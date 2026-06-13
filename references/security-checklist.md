# Android Security Checklist

Quick reference for Android application security. Use alongside the `security-and-hardening` skill.

## Table of Contents

- [Threat Modeling (Start Here)](#threat-modeling-start-here)
- [Pre-Commit Checks](#pre-commit-checks)
- [Local Data Storage Security](#local-data-storage-security)
- [Network Security](#network-security)
- [Inter-Component Communication (ICC) Security](#inter-component-communication-icc-security)
- [WebView Security](#webview-security)
- [Input & Deep Link Validation](#input--deep-link-validation)
- [Build & Reverse Engineering Protection](#build--reverse-engineering-protection)
- [AI / LLM Security](#ai--llm-security)
- [OWASP Mobile Top 10 Quick Reference](#owasp-mobile-top-10-quick-reference)

## Threat Modeling (Start Here)

Before reaching for controls, spend five minutes thinking like an attacker:

- [ ] Trust boundaries mapped (network payloads, external storage, intents, content providers, deep links, LLM output)
- [ ] Assets named (API keys, user tokens, PII, offline database, Keystore keys)
- [ ] STRIDE run per boundary (Spoofing, Tampering, Repudiation, Info disclosure, DoS, Elevation of privilege)
- [ ] Abuse cases written next to use cases ("how would a malicious app exploit this broadcast receiver?")

## Pre-Commit Checks

- [ ] No API keys or credentials in code (e.g. do not hardcode in `AndroidManifest.xml` or Kotlin/Java files).
- [ ] Secrets stored in `local.properties` or fetched via BuildConfig using Gradle plugins (e.g., Secrets Gradle Plugin).
- [ ] `.gitignore` covers: `local.properties`, `*.keystore`, `*.jks`, `.gradle/`, `build/`, and any private JSON/plist configuration files that contain production API keys.

## Local Data Storage Security

- [ ] Sensitive user preferences stored using `EncryptedSharedPreferences` (part of Jetpack Security) rather than standard `SharedPreferences`.
- [ ] SQLite/Room databases containing sensitive data encrypted at rest using SQLCipher.
- [ ] Internal storage used for private files (default context files directory is inaccessible to other apps).
- [ ] External storage (`getExternalFilesDir`) avoided for sensitive data, or properly sanitized and checked before reading (other apps can read/write external storage).
- [ ] `android:allowBackup` set to `false` in `AndroidManifest.xml` if the app handles sensitive data (prevents ADB backup of local app data).

## Network Security

- [ ] HTTPS enforced for all network connections via `NetworkSecurityConfig`.
- [ ] Cleartext traffic disabled: `cleartextTrafficPermitted="false"` in `network_security_config.xml`.
- [ ] Certificate pinning implemented for high-security endpoints (e.g., banking/payment APIs) using Network Security Config or OkHttp `CertificatePinner`.
- [ ] Sensitive tokens (Bearer tokens, Session IDs) passed in HTTP headers, not as URL query parameters.
- [ ] Retrofit/OkHttp configured with secure TLS versions and cipher suites.

## Inter-Component Communication (ICC) Security

- [ ] Activities, Services, Broadcast Receivers, and Content Providers set to `android:exported="false"` unless they must be accessed by other apps.
- [ ] Explicit intents used to launch internal app components (prevents intent hijacking).
- [ ] `PendingIntent` creation specifies flags explicitly (`PendingIntent.FLAG_IMMUTABLE` or `PendingIntent.FLAG_MUTABLE` on API 31+).
- [ ] Exported content providers protected with custom permissions (`android:readPermission` / `android:writePermission`).
- [ ] Dynamic broadcast receivers registered with `Context.RECEIVER_NOT_EXPORTED` on Android 14+ unless explicitly intended for system/external broadcasts.

## WebView Security

- [ ] JavaScript disabled (`settings.javaScriptEnabled = false`) unless absolutely required.
- [ ] File access disabled (`settings.allowFileAccess = false`, `settings.allowContentAccess = false`).
- [ ] AddJavascriptInterface only used with `@JavascriptInterface` annotations (API 17+) and target URLs strictly validated.
- [ ] WebViews do not load arbitrary user-supplied URLs (restrict to HTTPS and verified domain allowlist).
- [ ] Mixed content mode disabled (`WebSettings.MIXED_CONTENT_NEVER_ALLOW`).

## Input & Deep Link Validation

- [ ] All inputs received via Intents, Broadcasts, or Content Providers validated and sanitized.
- [ ] Deep links verified using Android App Links (Digital Asset Links) to prevent deep link hijacking.
- [ ] Deep link parameters validated and parsed safely (e.g., query params must not be directly evaluated as actions, SQL queries, or file paths).
- [ ] HTML content or Markdown rendered in Compose/XML sanitized to prevent XSS-like attacks on rendering.

## Build & Reverse Engineering Protection

- [ ] R8/ProGuard enabled (`minifyEnabled true`, `shrinkResources true`) for release builds to obfuscate code and shrink resources.
- [ ] Sensitive strings, API keys, or algorithms obfuscated or moved to Native (C/C++ using NDK) if client-side storage is unavoidable.
- [ ] Release builds signed using a secure, offline keystore (do not commit signing configs with passwords to git).
- [ ] Integrity checks / Root detection implemented for high-security apps (e.g., Google Play Integrity API).

## AI / LLM Security

For any feature that calls an LLM (chatbots, summarizers, agents, RAG) on Android:

- [ ] Model output treated as untrusted — never evaluate it dynamically as code (e.g. JavaScript, shell) or write directly to paths.
- [ ] Prompt injection assumed; permissions enforced in local code/backend services, not in system prompts.
- [ ] Secrets, API keys, and full system prompts kept out of the client-side context window.
- [ ] Destructive or irreversible actions (e.g., deleting a local task, making an API transaction) require explicit user confirmation.
- [ ] Token, rate, and recursion limits enforced on the backend, not trust-based on the client app.

## OWASP Mobile Top 10 Quick Reference

| ID | Risk | Description & Prevention |
|---|---|---|
| M1 | Improper Platform Usage | Misuse of Android features (Intents, permissions). Use explicit Intents, export components only when needed. |
| M2 | Insecure Data Storage | Plaintext storage in SharedPreferences/SD card. Use `EncryptedSharedPreferences` and SQLCipher. |
| M3 | Insecure Communication | Lack of SSL, bad handshake, cleartext headers. Enforce HTTPS in NetworkSecurityConfig, use certificate pinning. |
| M4 | Insecure Authentication | Client-side auth checks, weak token management. Perform authorization on the server, secure tokens in Keystore. |
| M5 | Insufficient Cryptography | Weak algorithms, hardcoded keys. Use modern Android Keystore with AES-GCM or RSA-OAEP. |
| M6 | Insecure Authorization | Lack of server-side validation. Never trust client-side roles; authenticate and authorize every API call. |
| M7 | Client Code Quality | Injection flaws, memory leaks, security bugs. Keep libraries updated, run static analysis (Lint/SonarQube). |
| M8 | Code Tampering | Submitting modified APKs to Play Store. Use Google Play Integrity API, verify app signatures. |
| M9 | Reverse Engineering | decompiling DEX to readable Java. Enable R8/ProGuard obfuscation, keep critical logic on the backend. |
| M10| Extraneous Functionality | Leaving debug logs, test endpoints, or hidden admin menus in release build. Use ProGuard to strip `Log.d`, disable backup. |
