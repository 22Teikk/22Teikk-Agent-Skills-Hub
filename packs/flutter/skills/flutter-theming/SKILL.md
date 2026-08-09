---
name: flutter-theming
description: Builds Flutter theming with Material 3 for any app with a custom visual identity. Use when creating or modifying ThemeData, ColorScheme.fromSeed seed strategy, dark mode (darkTheme/themeMode/MediaQuery.platformBrightnessOf), ThemeExtension brand tokens (colors, text styles, spacing), textTheme typography, component themes, WidgetStateProperty state styling, or Material You dynamic color.
version: 1.0.0
platform: flutter
depends-on: [flutter-localization, flutter-project-structure]
---

# Flutter Theming & Material 3

## Overview

Build consistent, accessible Flutter theming with **Material 3 as the only supported system** (the default since Flutter 3.16 — `useMaterial3: true` is no longer needed and the flag is deprecated noise). The canonical approach: derive the **entire** color palette from one seed color with `ColorScheme.fromSeed`, support dark mode via `darkTheme`/`themeMode`, extend beyond the core palette with `ThemeExtension` for brand tokens, shape the components with component themes, and style hovered/pressed/disabled states with `WidgetStateProperty`.

## When to Use

- Use when the app has **any custom visual identity** — brand colors, custom fonts, custom spacing, or a bespoke dark mode.
- Use when creating or editing `ThemeData` / `ColorScheme`.
- Use when adding dark mode or following the system theme (`ThemeMode.system`).
- Use when introducing custom brand tokens (spacing, radii, gradients, brand colors) via `ThemeExtension`.
- Use when styling hovered/pressed/disabled widget states via `WidgetStateProperty`.
- Use when migrating legacy Material 2 code (`useMaterial3: false`, `background`, `surfaceVariant`).
- Use when tuning component-level look (cards, app bar, buttons, inputs) via component themes.
- Do NOT use for localization/`Text` internationalization — see `flutter-localization`.
- Do NOT use for Android Compose theming (use `android-ui-kotlin`) or iOS SwiftUI styling.

## Core Process

### 1. Theme file location and single-source-of-truth

- Put all theming in `lib/core/theme/` (`app_theme.dart` for `ThemeData`, `app_spacing.dart` / `app_colors.dart` for `ThemeExtension` tokens) — see `flutter-project-structure`.
- Build the themes **once** as top-level `final` values, never inside a widget's `build()`. `ColorScheme.fromSeed` is expensive and `ThemeData` is a large object; constructing either per frame throws away the rebuild efficiency Flutter gives you for free with `const` widgets.
- Widgets read `Theme.of(context).colorScheme` / `Theme.of(context).extension<X>()`; they never construct colors or `TextStyle`s themselves.

```dart
// lib/core/theme/app_theme.dart
final AppTheme = _AppTheme();   // top-level final → built once at app start

class _AppTheme {
  // Not const (ThemeData cannot be const), but stable: computed once, never per-build.
  ThemeData get light => ThemeData(
        colorScheme: _lightScheme,
        ...
      );
}
```

### 2. Seed color strategy: `ColorScheme.fromSeed`

- Derive both brightnesses from **one** brand seed so the brand identity survives the light→dark transition.
- `fromSeed` generates an accessible, harmonized tonal palette (M3 roles: `primary`, `onPrimary`, `primaryContainer`, `surfaceContainer*`, ...) — you get contrast-correct pairs for free. Do not hand-tune individual roles unless a specific role is wrong.
- Bright seeds desaturate/darken by default; force `DynamicSchemeVariant.fidelity` when the seed must stay close to the source hue/brightness.

```dart
const _brandSeed = Color(0xFF6750A4);   // one seed for the whole app

final _lightScheme = ColorScheme.fromSeed(seedColor: _brandSeed);
final _darkScheme = ColorScheme.fromSeed(
  seedColor: _brandSeed,
  brightness: Brightness.dark,
);

// Bright-brand variant (keep a vivid seed vivid):
final _vividLight = ColorScheme.fromSeed(
  seedColor: _brandSeed,
  dynamicSchemeVariant: DynamicSchemeVariant.fidelity,
);
```

### 3. Wire `MaterialApp`: `theme` + `darkTheme` + `themeMode`

- Pass `theme` (light) and `darkTheme`; `themeMode: ThemeMode.system` makes dark mode follow the OS automatically.
- Use the **same seed** for both — a different seed per mode breaks brand recognition.
- Let `themeMode` be user-overridable only when the app has an explicit appearance setting (persist it, don't hardcode `light`).

```dart
MaterialApp(
  theme: AppTheme.light,
  darkTheme: AppTheme.dark,
  themeMode: ThemeMode.system, // system | light | dark
)
```

### 4. Dark mode: `ThemeMode.system` and `MediaQuery.platformBrightnessOf`

- Default is `ThemeMode.system`. Reacting to OS dark mode requires **both** a `darkTheme` and `themeMode != ThemeMode.light` — a `darkTheme` alone is dead weight.
- To read the current platform brightness (for a logo asset, a custom canvas, or a widget that must flip), use `MediaQuery.platformBrightnessOf(context)` — do **not** cache `MediaQuery.of(context).platformBrightness` above the point where it can change.
- Use `Theme.of(context).brightness` for brightness *decisions* (not the platform value) so the result matches what the widgets actually render.

```dart
// Which asset variant to show — follows the OS without rebuilding the app.
final isDark = MediaQuery.platformBrightnessOf(context) == Brightness.dark;
logo: isDark ? const LogoDark() : const LogoLight(),

// Brightness decision inside custom painting / logic.
final brightness = Theme.of(context).brightness;
```

### 5. Brand tokens with `ThemeExtension<T>` (colors, spacing, text styles)

- Anything beyond the core color scheme (brand spacing, radii, gradients, custom brand colors, non-M3 styles) belongs in a `ThemeExtension<T>` subclass.
- **Required members**: `const` constructor, `copyWith`, and `lerp` (used for animated theme transitions and for the system dark-mode switch). Missing `lerp` makes the theme crash when `ThemeMode` changes mid-animation.
- Register instances in `ThemeData(extensions: [...])`; read with `Theme.of(context).extension<AppSpacing>()!`.

```dart
@immutable
class AppSpacing extends ThemeExtension<AppSpacing> {
  const AppSpacing({required this.xs, required this.sm, required this.md, required this.lg});

  final double xs, sm, md, lg;

  @override
  AppSpacing copyWith({double? xs, double? sm, double? md, double? lg}) => AppSpacing(
        xs: xs ?? this.xs, sm: sm ?? this.sm, md: md ?? this.md, lg: lg ?? this.lg,
      );

  @override
  AppSpacing lerp(AppSpacing? other, double t) {
    if (other == null) return this;
    return AppSpacing(
      xs: lerpDouble(xs, other.xs, t)!,
      sm: lerpDouble(sm, other.sm, t)!,
      md: lerpDouble(md, other.md, t)!,
      lg: lerpDouble(lg, other.lg, t)!,
    );
  }
}

// Register (const constructor → the list itself can be const):
ThemeData(
  extensions: const [AppSpacing(xs: 4, sm: 8, md: 16, lg: 24)],
)

// Read it anywhere:
final spacing = Theme.of(context).extension<AppSpacing>()!;
Padding(padding: EdgeInsets.all(spacing.md));
```

### 6. Typography via `TextTheme`

- Set the type ramp once on `ThemeData(textTheme: ...)`; widgets pick named styles (`Theme.of(context).textTheme.headlineMedium`) — never inline `TextStyle` with raw sizes for user-visible text.
- Apply the brand family globally with `ThemeData(fontFamily: ...)` or the `google_fonts` package (`GoogleFonts.poppinsTextTheme(...)` for a family-per-style ramp).
- Preserve the M3 roles (`displayLarge` … `labelSmall`) — downstream widgets like `AppBar`, `InputDecorator`, and `FilledButton` read specific roles and fall back to defaults if you delete them.

```dart
final _textTheme = Typography.material2021(platform: defaultTargetPlatform).black
    .apply(fontFamily: 'Poppins');

ThemeData(
  colorScheme: _lightScheme,
  textTheme: _textTheme.copyWith(
    headlineMedium: _textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w600),
  ),
)
```

### 7. Component themes (`CardThemeData`, `AppBarThemeData`, ...)

- Component themes tune a single Material component app-wide. **Current Flutter renamed these to `*ThemeData`** (`CardThemeData`, `AppBarThemeData`, `InputDecorationThemeData`, `DialogThemeData`, `TabBarThemeData`, `FilledButtonThemeData`) — use the `*ThemeData` names in `ThemeData`; the old names are deprecated.
- The theming cascade is `ThemeData` → component theme → `Theme` widget override → widget constructor arg. Use constructor args for one-off exceptions, never for default styling.
- Do not inline the same `BoxDecoration`/`BorderRadius` into every card — one `cardTheme` covers all.

```dart
ThemeData(
  colorScheme: _lightScheme,
  cardTheme: CardThemeData(
    elevation: 0,
    color: _lightScheme.surfaceContainerLow,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
  ),
  appBarTheme: AppBarThemeData(
    backgroundColor: _lightScheme.surface,
    scrolledUnderElevation: 0,
    centerTitle: false,
  ),
)
```

### 8. Fixed brand seed vs Material You dynamic color

- **Fixed `ColorScheme.fromSeed`** is the default: identical brand palette on every device, easy to golden-test, and it works on iOS/Web/Desktop too.
- **Material You dynamic color** (Android wallpaper-derived) is opt-in and Android-only. Extract the wallpaper seed with the `dynamic_color` package, then feed it to `fromSeed` with an explicit variant. Choose **one** per app — do not switch on a flag; users see palette jumps.

```dart
// Material You: pull the wallpaper color, then generate the scheme from it.
final scheme = ColorScheme.fromSeed(
  seedColor: dynamicScheme.seedColor,           // from the dynamic_color package
  brightness: Brightness.dark,
  dynamicSchemeVariant: DynamicSchemeVariant.tonalSpot,
);
```

### 9. Widget states with `WidgetStateProperty`

- Use `WidgetStateProperty` (renamed from `MaterialStateProperty`) for any color/size that depends on hover/press/focus/disabled — inside `ButtonStyle`, `InputDecorationThemeData`, etc.
- `resolveWith` receives the active `WidgetState` set; cover `disabled` and `pressed` at minimum.

```dart
ButtonStyle(
  backgroundColor: WidgetStateProperty.resolveWith((states) {
    if (states.contains(WidgetState.disabled)) return scheme.surfaceContainerHighest;
    if (states.contains(WidgetState.pressed)) return scheme.primaryContainer;
    return scheme.primary;
  }),
)
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll write `useMaterial3: true` to be explicit" | It is the default since Flutter 3.16 and the flag is deprecated; writing it adds noise and teaches nothing. |
| "Hardcoding a hex color is faster than theme plumbing" | Hardcoded colors break dark mode, accessibility contrast, and rebranding. Every user-visible color belongs in `ColorScheme` or a `ThemeExtension`. |
| "I'll build `ThemeData` inline in `build()` — it's only the root" | `ColorScheme.fromSeed` runs the full M3 palette generation; constructing it per rebuild (hot reload, theme animation, tab switches) is wasted CPU. Build once at top level. |
| "`background` is still in the API, it's fine" | It is deprecated; use the `surface` / `surfaceContainer*` roles so `flutter analyze` stays clean. |
| "ThemeExtension is overkill, a constants class is simpler" | A constants class cannot animate across the light/dark transition — `ThemeExtension.lerp` is what the framework uses to morph the theme. |
| "Material You dynamic color everywhere" | Dynamic color is Android-only and unpredictable across devices; a fixed seed keeps brand identity and testability. Pick one strategy per app. |
| "I'll theme each card with constructor arguments" | Per-widget styling scatters the look; one `CardThemeData` keeps the design consistent and trivially rebrandable. |

## Red Flags

- `useMaterial3: true/false` in new code (deprecated flag).
- `ColorScheme.background` or `surfaceVariant` references (deprecated roles).
- Hardcoded `Color(0xFF...)` / raw `TextStyle` scattered in widgets for brand UI.
- `ThemeData(...)` or `ColorScheme.fromSeed(...)` constructed inside `build()`.
- `ThemeExtension` subclasses missing `copyWith` or `lerp`, or with a non-const constructor.
- Widgets reading `Colors.xxx` instead of `Theme.of(context).colorScheme.xxx`.
- `darkTheme` defined but no `themeMode` (or `themeMode: ThemeMode.light`) while dark mode is a requirement.
- Legacy component theme names (`CardTheme`, `AppBarTheme`, `InputDecorationTheme`) in `ThemeData` — use `CardThemeData`, `AppBarThemeData`, `InputDecorationThemeData`.
- Mixed dynamic-color and fixed-seed schemes behind a runtime flag.

## Verification

- [ ] `MaterialApp` wires `theme`, `darkTheme`, and `themeMode` (system default) when dark mode is required.
- [ ] Both brightnesses derive from the **same** seed via `ColorScheme.fromSeed`; no `useMaterial3` flags.
- [ ] No deprecated roles (`background`, `surfaceVariant`) or component theme classes in new code.
- [ ] All custom brand tokens live in `ThemeExtension` subclasses with `const` constructors, `copyWith`, and `lerp`.
- [ ] `ThemeData` values are top-level `final` (built once), not constructed in `build()`.
- [ ] User-visible text uses `textTheme` named styles; no inline `TextStyle` with raw sizes/colors.
- [ ] Every interactive state covers at least `disabled` and `pressed` via `WidgetStateProperty`.
- [ ] One appearance strategy chosen (fixed seed or Material You) — not mixed behind a flag.
- [ ] `flutter analyze` reports zero theme-related deprecation warnings and `flutter test` passes.

## Related

- `flutter-ui` — every widget in the tree reads this theme via `Theme.of(context)`.
- `flutter-project-structure` — theming lives in `lib/core/theme/`, outside features.
- `flutter-state-riverpod` — a persisted `ThemeMode` toggle belongs in a Riverpod `Notifier`, not in a widget.
