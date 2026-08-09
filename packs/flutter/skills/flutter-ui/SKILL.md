---
name: flutter-ui
description: Builds Flutter user interfaces using Dart 3+ and Flutter 3+. Use when creating or modifying widget trees, StatelessWidget/StatefulWidget composition, layouts (Row/Column/Stack/ListView), Material widgets, BuildContext lifetime rules, list and image performance, or KeepAlive tab state. State management, navigation, theming, animation, and localization are handled by dedicated sibling skills — this skill routes to them.
version: 1.0.0
platform: flutter
depends-on: [flutter-animations, flutter-localization, flutter-navigation, flutter-state-bloc, flutter-state-provider, flutter-state-riverpod, flutter-theming]
  - observability-and-instrumentation
---

# Flutter UI Engineering (Dart 3+, Flutter 3+)

## Overview

Build high-quality, responsive, accessible, and 60fps Flutter user interfaces using Dart 3+ and Flutter 3+. This skill is the **widget layer**: composing widget trees, choosing `StatelessWidget` vs `StatefulWidget`, structuring layouts, using Material widgets correctly, managing `BuildContext` lifetime, and optimizing list/image performance. Cross-cutting concerns — state management, routing, theming, animation, and localization — are owned by dedicated sibling skills (see "Related skills" below).

## When to Use

- Use when developing user interfaces in Flutter projects using Dart 3+ (records, patterns, sealed classes).
- Use when creating new screens, pages, or reusable widgets.
- Use when composing layouts or choosing between layout widgets.
- Use when deciding between `StatelessWidget` and `StatefulWidget`, or managing local ephemeral state.
- Use when wiring images, semantics, or accessibility labels.
- Do NOT use for state management — see `flutter-state-riverpod` (or `flutter-state-bloc`, `flutter-state-provider`).
- Do NOT use for navigation/routing — see `flutter-navigation`.
- Do NOT use for theming — see `flutter-theming`.
- Do NOT use for animations — see `flutter-animations`.
- Do NOT use for localization — see `flutter-localization`.
- Do NOT use for non-UI Flutter work (data layer, build config) — use the sibling skills instead.
- Do NOT use for Flutter Web or Flutter Desktop unless the project has explicitly opted in.

## Core Process

### 1. Widget composition over monolith `build()` methods

- Break screens into focused widgets. A `build()` method over ~80 lines is a red flag.
- Prefer `StatelessWidget`. Justify every `StatefulWidget` with a one-line comment that names the local ephemeral state it owns (animation controller, scroll position, focus node, text editing controller).
- Use `const` constructors everywhere a widget has no runtime-variable parameters — Flutter reuses the element on rebuild.
- Leaf widgets receive values + callbacks; they never reach for app state themselves. Shared state lives in the state-management layer (see `flutter-state-riverpod`), and screens wire the two together at the top.

```dart
// Good: small, focused, const-friendly widgets
class TaskListScreen extends StatelessWidget {
  const TaskListScreen({
    super.key,
    required this.onNavigateToDetail,
    required this.onRetry,
  });
  final ValueChanged<String> onNavigateToDetail;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    // State arrives as a sealed family from the state-management layer.
    return TaskListContent(
      state: taskListState,       // wired by the caller's state setup
      onTaskTap: onNavigateToDetail,
      onRetry: onRetry,
    );
  }
}
```

### 2. UI state as a sealed family (rendering pattern)

- Model screen state as a **sealed class** (Dart 3) with `Loading` / `Error` / `Data` (or feature-named) variants, and `switch` over it in the widget — the compiler enforces every branch.
- The state *family* itself is produced and exposed by the state-management layer; this skill owns the exhaustive rendering. Producing it is the job of `flutter-state-riverpod` / `flutter-state-bloc`.

```dart
sealed class TaskListUiState { const TaskListUiState(); }
class Loading extends TaskListUiState { const Loading(); }
class Error extends TaskListUiState {
  const Error(this.message); final String message;
}
class Data extends TaskListUiState {
  const Data(this.tasks); final List<Task> tasks;
}

// Presentation-only: receives state, renders exhaustively.
class TaskListContent extends StatelessWidget {
  const TaskListContent({
    super.key,
    required this.state,
    required this.onTaskTap,
    required this.onRetry,
  });
  final TaskListUiState state;
  final ValueChanged<String> onTaskTap;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      Loading() => const LoadingSpinner(),
      Error(:final message) => ErrorScreen(message: message, onRetry: onRetry),
      Data(:final tasks) => ListView.builder(
          itemCount: tasks.length,
          // ValueKey on list items prevents spurious element reuse on reorder.
          itemBuilder: (_, i) => TaskTile(
            key: ValueKey(tasks[i].id),
            task: tasks[i],
            onTap: () => onTaskTap(tasks[i].id),
          ),
        ),
    };
  }
}
```

### 3. `StatefulWidget`: local ephemeral state only

- `StatelessWidget` renders purely from its constructor parameters. Use it unless a widget owns genuinely local, ephemeral state.
- Local ephemeral state = `AnimationController`, `ScrollController`, `FocusNode`, `TextEditingController`, a `PageController`, a checkbox toggle. Cross-screen or shared state does **not** belong in a widget — it belongs in `flutter-state-riverpod` / `flutter-state-bloc`.
- Initialize controllers where the field is declared or in `initState`, and always `dispose()` them.

```dart
class TaskEditor extends StatefulWidget {
  const TaskEditor({super.key});
  @override
  State<TaskEditor> createState() => _TaskEditorState();
}
class _TaskEditorState extends State<TaskEditor> {
  final _title = TextEditingController();

  @override
  void dispose() {
    _title.dispose();   // controllers must be disposed
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title'));
}
```

### 4. `BuildContext` lifetime

- Treat `BuildContext` as a handle that may invalidate when the widget is unmounted. After any `await` (navigation, platform channel, async callback), guard with `if (!context.mounted) return;` before showing a `SnackBar`, calling `Navigator.of(context)`, or reading `Theme.of(context)`.
- Never store a `BuildContext` in a field, a closure captured by a long-lived listener, or a `static` reference.

```dart
Future<void> saveTask(BuildContext context, Future<void> Function() save) async {
  await save();                        // async work — the widget may unmount
  if (!context.mounted) return;        // guard before touching context
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Saved')),
  );
}
```

### 5. Layouts: `Row` / `Column` / `Stack`

- Compose linear layouts with `Row` / `Column`; distribute space with `Expanded` / `Flexible` (flex factors), align with `MainAxisAlignment` / `CrossAxisAlignment`. Overlay widgets with `Stack` + `Positioned`.
- Constrain with `SizedBox`, `ConstrainedBox`, `AspectRatio`, or `Spacer`; space siblings with `SizedBox(height: 8)` / `Padding` — not magic constants scattered around.
- Use `MediaQuery.of(context).size` or `LayoutBuilder` to switch between phone and tablet layouts — never assume a fixed screen size.

### 6. Material widgets

- Use Material 3 widgets from the framework: `Scaffold`, `AppBar`, `FilledButton` / `OutlinedButton` / `TextButton`, `Card`, `TextField`, `Switch`, `Checkbox`, `Radio`, `Chip`, `NavigationBar`, `TabBar` / `TabBarView`, `Drawer`, `Dialog`, `BottomSheet`, and `SnackBar` (via `ScaffoldMessenger`).
- Read colors and typography from the theme — `Theme.of(context).colorScheme` and `Theme.of(context).textTheme` — never hardcode `Color(0xFF...)` in feature widgets. Theming structure lives in `flutter-theming`.
- Wrap non-decorative icons and images with `Semantics(label: '...')` or use `Icon`'s `semanticLabel`. Provide labels for every interactive control that does not already have visible text.

### 7. Performance: rebuilds, lists, images

- **Lists**: always use `ListView.builder` / `ListView.separated` / `SliverList` for unbounded data. `ListView(children: [...])` builds every child up front.
- **Repaint boundaries**: wrap independently-animating sub-trees in `RepaintBoundary` (carousel slides, animated charts) so the rest of the screen does not repaint with them. Animation *APIs* live in `flutter-animations`.
- **`const` everywhere**: a `const Text('Total')` is reused across rebuilds; a `Text('Total')` is rebuilt and re-laid-out.
- **Images**: use `cached_network_image` (`CachedNetworkImage`) — never `Image.network` inside a list. Configure `memCacheWidth` / `memCacheHeight` for large images.

```dart
CachedNetworkImage(
  imageUrl: task.imageUrl,
  memCacheWidth: 600,
  placeholder: (_, __) => const Skeleton(width: double.infinity, height: 200),
  errorWidget: (_, __, ___) => const Icon(Icons.broken_image),
)
```

### 8. Keeping state across tabs (KeepAlive)

- In `TabBarView` or `PageView`, wrap content in `AutomaticKeepAliveClientMixin` (and `wantKeepAlive` returning `true`) so the user does not re-trigger a network fetch when swiping back to a tab.

```dart
class TasksTab extends StatefulWidget {
  const TasksTab({super.key});
  @override
  State<TasksTab> createState() => _TasksTabState();
}
class _TasksTabState extends State<TasksTab>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;
  @override
  Widget build(BuildContext context) {
    super.build(context); // required by the mixin
    return const TaskListScreen();
  }
}
```

## Related skills

| Concern | Skill |
|---|---|
| State management (default) | `flutter-state-riverpod` |
| State management (event-driven) | `flutter-state-bloc` |
| State management (legacy Provider maintenance) | `flutter-state-provider` |
| Navigation / routing (go_router) | `flutter-navigation` |
| Animations | `flutter-animations` |
| Theming / Material 3 | `flutter-theming` |
| Localization (gen-l10n / ARB) | `flutter-localization` |

For state management with Riverpod see `flutter-state-riverpod`; with BLoC see `flutter-state-bloc`; for legacy `provider` codebases see `flutter-state-provider`. Pick **one** approach per project — never mix `ConsumerWidget` with `BlocProvider` in the same subtree. For navigation see `flutter-navigation`; for animation see `flutter-animations`; for theming see `flutter-theming`; for localization see `flutter-localization`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This screen is simple, it doesn't need a state-management skill" | Simple screens grow. State that must survive navigation pops and `build()` rebuilds belongs in `flutter-state-riverpod`, not in a widget. |
| "`setState` is fine for everything" | `setState` triggers a rebuild of the calling widget's subtree. It is correct for local ephemeral state; shared state belongs in a state-management skill. |
| "I'll add Semantics labels later" | Accessibility debt compounds. Every `IconButton` without a `tooltip`/`semanticLabel` fails TalkBack/VoiceOver audits; add labels as you write the widget. |
| "`ListView(children: [...])` is fine, the list is short" | Length grows. The day the list goes from 5 to 5,000 items is the day the user feels jank. Use `ListView.builder`. |
| "I'll skip `const` — the compiler will optimize it" | The compiler can only honor `const` where you write it. Skipping it costs element-reuse and an extra allocation per rebuild. |
| "I'll inline routing/theming/animation here instead of the sibling skill" | Cross-cutting concerns belong in one place so they stay consistent across the pack. The dedicated skills keep them DRY. |

## Red Flags

- A `build()` method longer than ~80 lines (break the widget apart).
- `StatefulWidget` without a justifying comment about which local state it owns.
- Shared/cross-screen state held in a widget instead of the state-management layer.
- Direct `Navigator.of(context).push` from deep widgets (use `flutter-navigation`'s router and a route constant).
- `Image.network` inside any scrollable list (use `cached_network_image`).
- Hardcoded colors, font sizes, or text strings outside the theme and l10n layers (see `flutter-theming` and `flutter-localization`).
- `BuildContext` captured in a closure outliving the widget (lookups will throw on unmounted widgets).
- `setState` called after `await` without a `mounted` check.

## Verification

- [ ] All widgets use `const` constructors where possible.
- [ ] `StatelessWidget` is the default; every `StatefulWidget` owns only local ephemeral state and disposes its controllers.
- [ ] Layouts use `Row` / `Column` / `Stack` with `Expanded` / `Flexible`; no fixed-size assumptions without `LayoutBuilder`.
- [ ] Material widgets read colors/typography from `Theme.of(context)`; no hardcoded brand values.
- [ ] `ListView.builder` / `SliverList` used for every unbounded list; `ValueKey` provided per item.
- [ ] Every `BuildContext` use after an `await` is guarded with `if (!context.mounted)`.
- [ ] Accessible semantics / labels are present on icons and image-only buttons.
- [ ] Cross-cutting concerns (state, routing, theming, animation, localization) are routed to their dedicated skills.
- [ ] `flutter analyze` is clean and `flutter test` passes.
