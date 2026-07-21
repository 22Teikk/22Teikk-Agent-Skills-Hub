---
name: security-and-hardening
description: Guidelines and patterns for security and hardening in Android applications. Use when implementing secure local storage, network security, inter-component communication, input validation, or reverse engineering protections.
version: 1.0.0
platform: generic
---

# Security and Hardening (Android)

## Overview

Guidelines for building secure Android applications. Mobile apps operate in a hostile client environment where attackers can decompile the app, inspect local storage, intercept network traffic, and inject malicious inputs through local intents or deep links.

## When to Use

- Use when implementing secure local data storage (e.g. EncryptedSharedPreferences, SQLCipher).
- Use when designing Network Security configurations (cleartext restrictions, TLS settings, certificate pinning).
- Use when securing Inter-Component Communication (exported attributes, explicit intents, PendingIntent flags).
- Use when hardening WebViews or validating intent inputs.
- Use when configuring ProGuard/R8 obfuscation or checking for vulnerable dependencies.

## How It Works

0. **Load domain guardrails first**: Read the SPEC `Domain:` field and apply `references/domain-guardrails.md`. A regulated domain (finance, health, auth) carries non-negotiable invariants — encryption-at-rest, PII handling, audit logging, session expiry, consent — that a generic mobile-security pass will miss. When unsure of a domain's real rules, fetch the authoritative source via `skills/source-driven-development/SKILL.md` rather than guessing.
1. **Threat Model Early**: Map trust boundaries (network inputs, external storage, intents, content providers, webviews) and potential threats.
2. **Apply Defense in Depth**: Use multiple layers of security (obfuscation, storage encryption, secure communication, input validation, secure IPC).
3. **Use Platform Security Features**: Rely on Android's sandbox, Android Keystore, Jetpack Security, and Network Security Config.
4. **Never Trust Client Inputs**: Sanitize and validate all inputs from intents, broadcast receivers, external storage, and network responses.

## Secure Coding Patterns (Android)

### 1. SQL Injection Prevention

Always use parameterized queries. Room handles parameterization automatically in `@Query` annotations.

```kotlin
// BAD: Raw SQLite query with string concatenation
val query = "SELECT * FROM users WHERE id = '" + userId + "'"
db.rawQuery(query, null)

// GOOD: Parameterized query in Room (Automatic)
@Query("SELECT * FROM users WHERE id = :userId")
suspend fun getUserById(userId: String): User?

// GOOD: Manual parameterized query
val query = "SELECT * FROM users WHERE id = ?"
db.rawQuery(query, arrayOf(userId))
```

### 2. Insecure Local Storage

Never store sensitive data (tokens, PII, passwords) in plaintext `SharedPreferences` or external files.

```kotlin
// BAD: Storing API tokens in standard SharedPreferences
val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
prefs.edit().putString("auth_token", rawToken).apply()

// GOOD: Using EncryptedSharedPreferences (Jetpack Security)
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val encryptedPrefs = EncryptedSharedPreferences.create(
    context,
    "secure_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
encryptedPrefs.edit().putString("auth_token", secureToken).apply()
```

For databases, use SQLCipher with Room to encrypt the database file.

### 3. Insecure Inter-Component Communication (ICC)

Activities, Services, Broadcast Receivers, and Content Providers must be secured to prevent hijacking or data leakage.

```xml
<!-- AndroidManifest.xml -->
<!-- GOOD: Exported set to false for internal components -->
<activity
    android:name=".InternalDashboardActivity"
    android:exported="false" />

<!-- GOOD: Exported set to true only when required by system or other apps,
     protected with a permission -->
<receiver
    android:name=".MyBroadcastReceiver"
    android:exported="true"
    android:permission="com.example.app.permission.RECEIVE_ALERTS">
    <intent-filter>
        <action android:name="com.example.app.ACTION_ALERT" />
    </intent-filter>
</receiver>
```

When creating `PendingIntent` (especially for notifications or alarms), always specify execution mutability (required on API 31+):

```kotlin
// GOOD: Immutable PendingIntent (prevents intent redirection attacks)
val intent = Intent(context, TargetActivity::class.java)
val pendingIntent = PendingIntent.getActivity(
    context,
    0,
    intent,
    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
)
```

### 4. Network Security & Certificate Pinning

Enforce HTTPS and cleartext restrictions via `network_security_config.xml`.

```xml
<!-- res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.example.com</domain>
        <!-- Certificate Pinning -->
        <pin-set expiration="2027-01-01">
            <pin digest="SHA-256">7HIpactjIAx2N4WcTHxyyLOTtV2eh573hXMMvQPc=</pin>
            <pin digest="SHA-256">fwza0UX3EdU1qgSB2wcIv9yjMTu15a1A63Vd9d30=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

Reference this configuration in your manifest:
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ... >
```

### 5. WebView Hardening

Disable JavaScript and local file access in WebViews unless explicitly required.

```kotlin
// GOOD: WebSettings hardening
val webView = WebView(context)
webView.settings.apply {
    javaScriptEnabled = false          // Disable JS if not needed
    allowFileAccess = false             // Disable file system access
    allowContentAccess = false          // Disable content provider access
    mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW // Deny HTTP resources
}
```

Never load user-influenced URLs dynamically without strict URL scheme and hostname validation.

## Dependency Security & Supply-Chain Hygiene

- **Use Version Catalog** (`libs.versions.toml`) to centralize dependency declarations and versions, preventing version drift.
- **Review new dependencies before adding them** — maintenance, download counts, and whether they truly earn their place. Every dependency is attack surface.
- Run static analyzers (Android Lint) and vulnerability checkers as part of CI to find security issues.

## Securing AI / LLM Features

If your Android app calls an LLM — chatbots, summarizers, agents, RAG — it inherits a new attack surface. Map it to the [OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/llm-top-10/):

- **Treat all model output as untrusted input (LLM05: Improper Output Handling).** Never pass LLM output straight into raw HTML layouts/WebViews without sanitization. Treat it like raw user input.
- **Assume prompts can be hijacked (LLM01: Prompt Injection).** The system prompt is not a security boundary; enforce permissions in code, not in the prompt.
- **Keep secrets and other users' data out of prompts (LLM02 / LLM07).** Do not put API keys or PII in prompts where the model could expose them.
- **Constrain tool and agent permissions (LLM06: Excessive Agency).** Require explicit user confirmation for destructive or irreversible actions (e.g., deleting local files, performing database mutations).

```kotlin
// BAD: trusting model output to dynamically direct execution
val action = llm.reply(userMessage)
if (action == "DELETE") deleteUserData()

// GOOD: model output is data — parse defensively and require user confirmation
val result = try {
    Json.decodeFromString<LlmAction>(llm.replyJson(userMessage))
} catch (e: Exception) {
    null
}
if (result?.action == ActionType.DELETE) {
    showConfirmationDialog { deleteUserData() }
}
```

## Security Review Checklist

### Authentication & Authorization
- [ ] Passwords/Tokens are never stored in plaintext locally.
- [ ] Sensitive tokens (e.g., Bearer tokens) are passed in HTTP headers, not URL query params.
- [ ] Authentication state managed securely (e.g. Firebase Auth or standard Keystore-backed storage).

### Local Data
- [ ] `EncryptedSharedPreferences` is used for sensitive preferences.
- [ ] Databases containing sensitive data are encrypted with SQLCipher.
- [ ] Internal storage is used for private files (external storage avoided/sanitized).
- [ ] `android:allowBackup="false"` in manifest if backups expose sensitive user data.

### Inter-Component Communication (ICC)
- [ ] All components in `AndroidManifest.xml` have `android:exported="false"` unless explicitly intended for other apps.
- [ ] Explicit intents are used for launching internal components.
- [ ] `PendingIntent` creation specifies `FLAG_IMMUTABLE` or `FLAG_MUTABLE` explicitly.

### Network
- [ ] Cleartext traffic is disabled in `network_security_config.xml` (`cleartextTrafficPermitted="false"`).
- [ ] Certificate pinning is enabled for high-security endpoints.
- [ ] HTTPS is enforced for all network connections.

### WebView
- [ ] `javaScriptEnabled` set to `false` (or strictly validated domain if true).
- [ ] `allowFileAccess` and `allowContentAccess` set to `false`.
- [ ] WebViews do not load arbitrary user-supplied URLs.

### Build & Obfuscation
- [ ] R8/ProGuard is enabled for release builds (`minifyEnabled true`).
- [ ] Production API keys and Keystore secrets are kept out of source code (using `local.properties`).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Obfuscation is enough to protect API keys" | Obfuscated keys can still be extracted using string extraction tools on the APK. Keep keys in secure build parameters or fetch dynamically. |
| "It's stored in internal storage, so it's secure" | On rooted devices, internal storage is fully readable. Use `EncryptedSharedPreferences`/SQLCipher for sensitive data. |
| "WebView JavaScript access is fine because we control the server" | Compromised backend servers or man-in-the-middle attacks can inject malicious JS that executes within the app's WebView context. |
| "We'll secure the intents later" | Forgetting to mark components exported="false" allows malicious apps to launch internal activities or send fake broadcasts. |

## Red Flags

- `android:exported="true"` in `AndroidManifest.xml` without a permission guard.
- Hardcoded API keys or credentials in Kotlin, Java, XML, or Gradle files.
- `android:allowBackup="true"` for an app handling banking, health, or highly personal user data.
- WebView with JavaScript enabled and no hostname validation loading dynamic URLs.
- Using `PendingIntent` without `FLAG_IMMUTABLE` or `FLAG_MUTABLE`.
- Hardcoded keystore passwords in `build.gradle.kts`.

## Verification

After implementing security-relevant code:

- [ ] Run `./gradlew lint` to check for security vulnerabilities.
- [ ] Verify `android:exported` attributes are explicitly defined for all manifest components.
- [ ] Check that no sensitive strings (passwords, private keys) are committed to git.
- [ ] Confirm release build configurations use R8 (`minifyEnabled = true`).
