---
name: flutter-localization
description: Localizes Flutter apps with the official gen-l10n + ARB pipeline. Use when adding or modifying localization setup, ARB message files, plurals/placeholders, locale delegates, MaterialApp locale wiring, or adding support for a new language. Third-party packages like easy_localization are for prototypes only.
version: 1.0.0
platform: flutter
depends-on: [flutter-project-structure, flutter-ui]
---

# Flutter Localization (gen-l10n + ARB)

## Overview

Localize Flutter apps with the **official gen-l10n pipeline**: `flutter_localizations` + `intl` with ARB template files, code generation via `flutter gen-l10n`, and typed `AppLocalizations` accessors. This is the production standard — compile-time-safe lookups, IDE autocomplete, RTL support, and ICU plural/date rules for free, maintained by the Flutter team with **zero extra dependencies** (`flutter_localizations` and `intl` both ship with the SDK). ARB files live in `lib/l10n/` per the feature-first layout from `flutter-project-structure`; the generated `AppLocalizations` class is consumed by the widgets built in `flutter-ui`.

## When to Use

- Use when adding localization to a Flutter app or package.
- Use when creating ARB messages, placeholders, plurals, or per-locale files.
- Use when wiring `localizationsDelegates` / `supportedLocales` / `locale` on `MaterialApp`.
- Use when the app must support multiple languages, RTL (Arabic, Hebrew), or ICU plural rules (Russian/Polish have complex plural forms).
- Use when adding a brand-new language to an already-localized app.
- Do NOT use easy_localization (JSON runtime loading, string-key `tr()` lookups, no compile-time safety) for production — it is for prototypes/MVP only. `intl_utils` adds a second, unmaintained codegen path on top of the same ARB format; prefer gen-l10n.
- Do NOT use for Android XML string resources (use the Android localization flow in the `android-ui-kotlin`/`android-ui-java` skills).

## Core Process

### 1. Setup (pubspec + l10n.yaml)
- Add `flutter_localizations` (sdk dependency) and `intl: any` — **never** `intl: ^x.y.z`; the Flutter SDK exact-pins its intl version, so your own caret pin causes "version solving failed" on `flutter pub get`.
- Enable `generate: true` so `flutter pub get` regenerates localizations automatically.
- Commit `l10n.yaml`; set `synthetic-package: false` + `output-dir` — the synthetic `package:flutter_gen` output is deprecated and will be removed.

```yaml
# pubspec.yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: any        # MUST be 'any' — the SDK pins the exact version

flutter:
  generate: true
```
```yaml
# l10n.yaml
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
synthetic-package: false
output-dir: lib/l10n/gen
nullable-getter: false   # AppLocalizations.of(context) returns non-nullable
```

### 2. ARB messages, placeholders, plurals, formatted values
- The **template ARB** (`app_en.arb`) is the source of truth; every other locale file must be a complete or partial translation of its keys.
- Each key starts with `@@locale` (or `@` for descriptions); placeholder metadata lives in a `@key` sibling object with `type:` (and optional `format:` for `num`/`DateTime`).
- Plurals and gender use ICU MessageFormat; `format` uses `NumberFormat`/`DateFormat` from `intl`.

```json
// lib/l10n/app_en.arb
{
  "@@locale": "en",
  "hello": "Hello",
  "helloName": "Hello {name}",
  "@helloName": {
    "placeholders": {
      "name": { "type": "String" }
    }
  },
  "itemCount": "{count, plural, =0{No items} =1{One item} other{{count} items}}",
  "@itemCount": {
    "placeholders": {
      "count": { "type": "int" }
    }
  },
  "publishedOn": "Published on {date}",
  "@publishedOn": {
    "placeholders": {
      "date": { "type": "DateTime", "format": "yMMMd" }
    }
  }
}
```
```json
// lib/l10n/app_vi.arb  (additional locale)
{
  "@@locale": "vi",
  "hello": "Xin chào",
  "helloName": "Xin chào {name}",
  "itemCount": "{count, plural, =0{Không có mục} other{{count} mục}}",
  "publishedOn": "Đăng ngày {date}"
}
```

### 3. Generate the typed localizations class
- Run `flutter gen-l10n` (or `flutter pub get` with `generate: true`). The generator emits `app_localizations.dart` (+ per-locale files) into `lib/l10n/gen/` — commit them so CI without codegen still builds.
- Placeholder messages become typed getters/methods; plural messages compile to methods calling `Intl.plural`; `DateTime` placeholders with `format:` compile to `DateFormat` calls from `intl`.

```dart
// Generated API — compile-time checked, autocompleted, never string keys.
final l10n = AppLocalizations.of(context)!;   // non-null with nullable-getter: false

Text(l10n.hello);                          // simple key
Text(l10n.helloName('Alice'));             // String interpolation
Text(l10n.itemCount(3));                   // Intl.plural behind the scenes
Text(l10n.publishedOn(DateTime.now()));    // DateFormat('yMMMd', localeName)
```

### 4. Wire delegates, supportedLocales, and locale
- `AppLocalizations.localizationsDelegates` already includes the global material/widgets/cupertino delegates — assign it as-is.
- `supportedLocales` is generated from the ARB files present; it drives fallback resolution for device locales with no exact match.

```dart
MaterialApp(
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  locale: const Locale('vi'),            // optional: force a locale; default = system
  onGenerateTitle: (context) => AppLocalizations.of(context)!.appTitle,
)
```

- RTL (Arabic, Hebrew) is handled automatically once the global delegates are present — `Directionality` flips without manual flags. If your theme makes layout assumptions, pair with the directionality guidance in `flutter-theming`.

### 5. Adding a new language end-to-end
1. Copy `app_en.arb` to `app_<lang>.arb` (e.g. `app_fr.arb`) and set `"@@locale": "fr"`.
2. Translate every key. Untranslated keys silently fall back to the template locale — add `untranslated-messages-file: l10n_untranslated.txt` to `l10n.yaml` to surface them during development.
3. Run `flutter gen-l10n`. `supportedLocales` grows automatically; no `MaterialApp` code change needed for the new locale to be offered.
4. Test the new locale by passing it explicitly (see next step) — never rely on a device locale you cannot control in CI.
5. Localize your app's displayed name, launch screens, and platform folders (`Info.plist` `CFBundleLocalizations`, Android `values-*/`) — Flutter strings alone don't localize the OS-visible metadata. See `flutter-di-and-build` for the platform build config.

### 6. Testing localized widgets
- Widget tests must supply the delegates explicitly or lookups throw `AppLocalizations not initialized`. Wrap the widget in a `MaterialApp` with the same wiring as production.

```dart
testWidgets('renders localized greeting', (tester) async {
  await tester.pumpWidget(MaterialApp(
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    locale: const Locale('vi'),
    home: const GreetingScreen(),
  ));
  expect(find.text('Xin chào'), findsOneWidget);
});
```

- Assert against the **translated string**, not the English default — that is the only way the test proves the `vi` ARB actually resolves. Full test strategy lives in `flutter-testing-and-benchmark`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "easy_localization is simpler, I'll use it" | It loads JSON at runtime with `tr()` string keys — no compile-time safety, no autocomplete, breaks silently on typo. gen-l10n is the same setup cost with typed accessors. |
| "I'll pin `intl: ^0.20.2` to match the docs" | `flutter_localizations` exact-pins intl inside the SDK; your own caret pin causes "version solving failed" on every `pub get`. Use `intl: any`. |
| "Synthetic package works fine, leave it" | `package:flutter_gen` is deprecated and will be removed; new projects must set `synthetic-package: false`. |
| "I'll handle plurals manually with if/else" | ICU `{count, plural, ...}` in ARB generates correct per-locale plural rules (Russian/Polish have 3+ forms). Hand-rolled if/else duplicates that logic wrong in every locale after the first. |
| "I'll skip the per-locale widget test, the generator guarantees correctness" | The generator guarantees the *key* exists — not that the *translation* you wrote resolves in context, nor that the widget test harness wired delegates. A failing lookup surfaces only at test/runtime time. |

## Red Flags

- `intl:` pinned with a caret range in pubspec instead of `any`.
- `easy_localization` or `intl_utils` in a production app.
- `synthetic-package: true` (the default) without `output-dir` in a new project.
- ARB placeholders missing `type:` metadata, or `DateTime`/`num` placeholders missing `format:`.
- `MaterialApp` without `localizationsDelegates` / `supportedLocales` in an app that has ARB files.
- `supportedLocales` out of sync with the ARB files on disk (should be impossible — it is generated, so a hand-edited list is the smell).
- Hardcoded user-visible strings in widgets instead of `AppLocalizations.of(context)!...`.
- Widget tests that render localized text without providing the delegates.
- Untranslated keys shipping silently because no `untranslated-messages-file` is configured.

## Verification

- [ ] pubspec has `flutter_localizations` (sdk) + `intl: any` + `flutter: generate: true`.
- [ ] `l10n.yaml` is committed with `synthetic-package: false` and `output-dir`.
- [ ] `flutter gen-l10n` runs clean; generated files land in the configured output dir and are committed.
- [ ] `MaterialApp` wires `localizationsDelegates: AppLocalizations.localizationsDelegates` and `supportedLocales`; `locale` is overridden only where intentional.
- [ ] Every user-visible string comes from `AppLocalizations.of(context)!...` — no hardcoded text in widgets.
- [ ] Plurals use ICU `{count, plural, ...}`; every placeholder declares `type` and `format` where applicable.
- [ ] A second locale (e.g. `vi`) has a complete ARB and resolves in a widget test asserting the translated string.
- [ ] `flutter analyze` and `flutter test` pass.
