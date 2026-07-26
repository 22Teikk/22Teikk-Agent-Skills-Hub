---
name: flutter-ui
description: Builds Flutter user interfaces using Dart 3+, Flutter 3+, and Riverpod (with BLoC variant). Use when creating or modifying widget trees, StatelessWidget/StatefulWidget, GoRouter routes, screen-level Riverpod Notifiers, or loading images via cached_network_image.
version: 1.0.0
platform: flutter
depends-on:
  - observability-and-instrumentation
---

# Flutter UI Engineering (Dart 3+, Flutter 3+, Riverpod)

## Overview

Build high-quality, responsive, accessible, and 60fps Flutter user interfaces using Dart 3+ and Flutter 3+. Adhere to a clean `data → domain → presentation` layer split, stateless widgets with hoisted state, type-safe `GoRouter` routes, and efficient image loading via `cached_network_image`. Riverpod is the **default** state-management reference for this pack; a BLoC variant is documented inline where the pattern diverges significantly (see "Riverpod vs BLoC" at the end).

## When to Use

- Use when developing user interfaces in Flutter projects using Dart 3+ (records, patterns, sealed classes).
- Use when creating new screens, pages, or reusable widgets.
- Use when setting up `Riverpod` `Notifier` / `AsyncNotifier` that expose screen UI state.
- Use when implementing application navigation using `GoRouter` (or Navigator 2.0).
- Use when wiring images, theming, or accessibility semantics.
- Do NOT use for non-UI Flutter work (data layer, build config) — use the sibling skills instead.
- Do NOT use for Flutter Web or Flutter Desktop unless the project has explicitly opted in.

## Core Process

### 1. Widget composition over monolith `build()` methods

- Break screens into focused widgets. A `build()` method over ~80 lines is a red flag.
- Prefer `StatelessWidget`. Justify every `StatefulWidget` with a one-line comment that names the local ephemeral state it owns (animation controller, scroll position, focus node, text editing controller).
- Use `const` constructors everywhere a widget has no runtime-variable parameters — Flutter reuses the element on rebuild.

```dart
// Good: small, focused, const-friendly widgets
class TaskListScreen extends ConsumerWidget {
  const TaskListScreen({super.key, required this.onNavigateToDetail});
  final void Function(String taskId) onNavigateToDetail;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(taskListNotifierProvider);
    return TaskListContent(
      state: state,
      onTaskTap: onNavigateToDetail,
      onRefresh: () => ref.read(taskListNotifierProvider.notifier).refresh(),
    );
  }
}

class TaskListContent extends StatelessWidget {
  const TaskListContent({
    super.key,
    required this.state,
    required this.onTaskTap,
    required this.onRefresh,
  });
  final TaskListUiState state;
  final ValueChanged<String> onTaskTap;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      Loading() => const LoadingSpinner(),
      Error(:final message) => ErrorScreen(message: message, onRetry: onRefresh),
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

### 2. Hoisted state and `BuildContext` lifetime

- Lift state to the **smallest** widget that needs it. Leaf widgets receive values + callbacks; they do not read providers.
- Treat `BuildContext` as a handle that may invalidate when the widget is unmounted. After any `await` (navigation, provider read inside an async callback, platform channel), guard with `if (!context.mounted) return;` before showing a `SnackBar`, calling `Navigator.of(context)`, or reading `Theme.of(context)`.
- Never store a `BuildContext` in a field, a closure captured by a long-lived listener, or a `static` reference.

```dart
Future<void> saveTask(BuildContext context, WidgetRef ref, TaskDraft draft) async {
  final notifier = ref.read(taskEditorNotifierProvider.notifier);
  await notifier.save(draft);                 // provider does NOT depend on BuildContext
  if (!context.mounted) return;               // guard before touching context
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Saved')),
  );
}
```

### 3. UI state modeled as a sealed family

- Model screen state as a **sealed class** (Dart 3) with `Loading` / `Error` / `Data` (or feature-named) variants. `switch` over them in the widget is exhaustive — the compiler enforces every branch.
- Keep `AsyncValue`-shaped states inside `AsyncNotifier`/`FutureProvider`; do not hand-roll your own `bool isLoading` fields.

```dart
sealed class TaskListUiState {
  const TaskListUiState();
}
class Loading extends TaskListUiState { const Loading(); }
class Error extends TaskListUiState {
  const Error(this.message); final String message;
}
class Data extends TaskListUiState {
  const Data(this.tasks); final List<Task> tasks;
}

class TaskListNotifier extends AsyncNotifier<TaskListUiState> {
  @override
  Future<TaskListUiState> build() async {
    final tasks = await ref.watch(taskRepositoryProvider).fetchAll();
    return Data(tasks);
  }
  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final tasks = await ref.read(taskRepositoryProvider).fetchAll();
      return Data(tasks);
    });
  }
}
```

### 4. Type-safe routing with GoRouter

- Define routes as `class`/`data class` declarations, register a `GoRouter` in a dedicated `lib/router.dart`, and use `context.go('/tasks/${task.id}')` from screens. For compile-time-checked parameter parsing, use `path_parameters` helpers or a typed route registry — never raw string concatenation deep inside feature code.

```dart
// lib/router.dart
final goRouter = GoRouter(
  initialLocation: '/tasks',
  routes: [
    GoRoute(path: '/tasks', builder: (_, __) => const TaskListScreen()),
    GoRoute(
      path: '/tasks/:id',
      builder: (context, state) =>
          TaskDetailScreen(taskId: state.pathParameters['id']!),
    ),
  ],
);

// MaterialApp.router wires it once.
MaterialApp.router(routerConfig: goRouter, theme: AppTheme.light);
```

### 5. Theming, layout, and accessibility

- Define `ThemeData` once in `lib/theme/app_theme.dart`; use `Theme.of(context).colorScheme` everywhere. Do **not** hardcode `Color(0xFF...)` in feature widgets.
- Use `MediaQuery.of(context).size` or `LayoutBuilder` to switch between phone and tablet layouts — never assume a fixed screen size.
- Wrap non-decorative icons and images with `Semantics(label: '...')` or use `Icon`'s `semanticLabel`. Provide labels for every interactive control that does not already have visible text.

### 6. Performance: rebuilds, lists, images

- **Lists**: always use `ListView.builder` / `ListView.separated` / `SliverList` for unbounded data. `ListView(children: [...])` builds every child up front.
- **Repaint boundaries**: wrap independently-animating sub-trees in `RepaintBoundary` (carousel slides, animated charts) so the rest of the screen does not repaint with them.
- **`const` everywhere**: a `const Text('Total')` is reused across rebuilds; a `Text('Total')` is rebuilt and re-laid-out.
- **Images**: use `cached_network_image` (`CachedNetworkImage`) — never `Image.network` inside a list. Configure `memCacheWidth`/`memCacheHeight` for large images.

```dart
CachedNetworkImage(
  imageUrl: task.imageUrl,
  memCacheWidth: 600,
  placeholder: (_, __) => const Skeleton(width: double.infinity, height: 200),
  errorWidget: (_, __, ___) => const Icon(Icons.broken_image),
)
```

### 7. Keeping state across tabs (KeepAlive)

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

## Riverpod vs BLoC (state-management reference)

This skill defaults to **Riverpod** (`flutter_riverpod` + `riverpod_annotation`) because it is the project default set by `/teikk-flutter-setup`. Where a project has chosen `flutter_bloc`, the divergences are:

| Concern | Riverpod (default) | BLoC variant |
|---|---|---|
| State holder | `Notifier` / `AsyncNotifier` | `Bloc<Event, State>` or `Cubit<State>` |
| Read in widget | `ref.watch(provider)` | `context.watch<MyBloc>().state` |
| Trigger event | `ref.read(provider.notifier).method()` | `context.read<MyBloc>().add(Event())` |
| UI state shape | sealed family + `AsyncValue` | sealed family + `BlocBuilder` |

Pick **one** per project and never mix `ConsumerWidget` with `BlocProvider` in the same subtree. The agent rules in `flutter-expert.md` forbid introducing a new state-management library on an existing project.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This screen is simple, it doesn't need a Notifier" | Simple screens grow. A `Notifier` from day one keeps state through navigation pops and survives `build()` rebuilds. |
| "`setState` is fine for everything" | `setState` triggers a rebuild of the calling widget's subtree. Hoisting state to a `Notifier` localizes rebuilds and survives async gaps. |
| "I'll add Semantics labels later" | Accessibility debt compounds. Every `IconButton` without a `tooltip`/`semanticLabel` fails TalkBack/VoiceOver audits; add labels as you write the widget. |
| "`ListView(children: [...])` is fine, the list is short" | Length grows. The day the list goes from 5 to 5,000 items is the day the user feels jank. Use `ListView.builder`. |
| "I'll skip `const` — the compiler will optimize it" | The compiler can only honor `const` where you write it. Skipping it costs element-reuse and an extra allocation per rebuild. |

## Red Flags

- A `build()` method longer than ~80 lines (break the widget apart).
- `StatefulWidget` without a justifying comment about which local state it owns.
- Widgets calling `ref.read` inside `build()` instead of `ref.watch` (subscribes to nothing, reads a stale value).
- Direct `Navigator.of(context).push` from deep widgets (use `GoRouter` and a route constant).
- `Image.network` inside any scrollable list (use `cached_network_image`).
- Hardcoded colors, font sizes, or text strings outside `lib/theme/` and `lib/l10n/`.
- `BuildContext` captured in a closure outliving the widget (lookups will throw on unmounted widgets).
- `setState` called after `await` without a `mounted` check.
- Mixing Riverpod's `ProviderScope` with BLoC's `MultiBlocProvider` for the same feature.

## Verification

- [ ] All widgets use `const` constructors where possible.
- [ ] UI state is exposed from a `Notifier` / `AsyncNotifier`, not local `setState` for cross-rebuild state.
- [ ] No business logic or repository calls inside `build()`.
- [ ] `ListView.builder` / `SliverList` used for every unbounded list; `ValueKey` provided per item.
- [ ] `GoRouter` is the single source of navigation; deep widgets never call `Navigator.push`.
- [ ] Every `BuildContext` use after an `await` is guarded with `if (!context.mounted)`.
- [ ] Accessible semantics / labels are present on icons and image-only buttons.
- [ ] `flutter analyze` is clean and `flutter test` passes.
