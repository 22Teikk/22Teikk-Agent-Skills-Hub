---
name: flutter-navigation
description: "Implements type-safe navigation in Flutter apps with go_router 17.x. Use when defining GoRoute/StatefulShellRoute structures, context.go/context.push navigation, redirect/auth gating, deep links, state restoration, go_router_builder typed routes, or path/query parameter handling. Do NOT use for widget-level composition (flutter-ui) or Navigator.push-only micro apps."
version: 1.0.0
platform: flutter
depends-on: [flutter-state-riverpod, flutter-testing-and-benchmark]
  - flutter-ui
---

# Flutter Navigation (go_router 17.x)

## Overview

`go_router` is the 2026 standard for Flutter navigation: it lives in `flutter/packages`, is maintained by the Flutter team, and wraps the Router API (Navigator 2.0) behind a declarative, URL-first configuration. Every destination is a location string — which is what makes deep links, browser URLs on Flutter Web, back-button semantics, and state restoration work without hand-rolling a `RouterDelegate`.

The mental model: **the route table is data, navigation is a URL change.** Screens never construct each other — they emit a location, and the router decides what widget tree that location produces. Widget composition inside a screen belongs to `flutter-ui`.

Version note: this skill targets **go_router 17.x**. The 17.0 breaking change: `ShellRoute` navigation now notifies the root `GoRouter` observers by default — opt out per-shell with `notifyRootObserver: false` if an analytics observer starts double-counting shell transitions.

## When to Use

- Use when defining or restructuring the `GoRouter` route table (`GoRoute`, nested `routes:`, `ShellRoute`, `StatefulShellRoute`).
- Use when choosing between `context.go`, `context.push`, `context.pop`, and `context.replace`.
- Use when building persistent bottom-navigation tabs whose per-tab stacks must survive tab switches.
- Use when adding auth gating, onboarding gates, or any conditional routing via `redirect`.
- Use when wiring deep links (Android App Links / iOS Universal Links) or state restoration.
- Use when adopting `go_router_builder` typed routes, or when handling path/query parameters.
- Do NOT use for widget-level composition, theming, or list performance — use `flutter-ui`.
- Do NOT use for a throwaway single-screen prototype where the whole app is one `MaterialApp` `home:`.

## Core Process

### 1. Route structure

Declare one `GoRouter` in `lib/router.dart` and hand it to `MaterialApp.router` exactly once. Nest child routes under their parent so the URL hierarchy mirrors the navigation hierarchy — a nested route's `path` is **relative** (no leading `/`), and popping a nested route lands on its parent.

```dart
// lib/router.dart
final goRouter = GoRouter(
  initialLocation: '/tasks',
  debugLogDiagnostics: kDebugMode,
  routes: [
    GoRoute(
      path: '/tasks',
      name: 'tasks',
      builder: (context, state) => const TaskListScreen(),
      routes: [
        // Relative path → resolves to /tasks/:taskId
        GoRoute(
          path: ':taskId',
          name: 'taskDetail',
          builder: (context, state) =>
              TaskDetailScreen(taskId: state.pathParameters['taskId']!),
        ),
      ],
    ),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
  ],
  errorBuilder: (context, state) => NotFoundScreen(uri: state.uri),
);
```

`errorBuilder` renders on any unmatched location — it is the 404 screen. Never let an unknown URL crash into an assertion. Name every route you navigate to by name (`name:` + `context.goNamed`) once paths get more than one segment — renaming a path then costs one edit instead of a codebase-wide string hunt.

### 2. Navigate: `go` vs `push` vs `pop` vs `replace`

| Verb | Effect on the stack | Use for |
|---|---|---|
| `context.go('/tasks/42')` | **Replaces** the stack with the one implied by that URL | Top-level destinations, post-login landing, tab-equivalent jumps |
| `context.push('/tasks/42')` | **Pushes** on top of the current stack; returns a `Future` for the pop result | Drill-down within a flow, modal-ish pages that must return a value |
| `context.pop([result])` | Pops the top route, completing the `push` future | Backing out of a pushed page |
| `context.replace('/x')` | Swaps the top entry without growing the stack | Wizard steps that must not be re-enterable via back |

Rule of thumb: if the URL bar should become the new "you are here", use `go`; if the user must back out to exactly where they were, use `push`. Never call either from `build()` — navigation is an **effect**, triggered from a callback or listener, never from a render pass.

```dart
// Good: navigation from a callback, with a typed result from push.
final saved = await context.push<bool>('/tasks/$id/edit');
if (!context.mounted) return;          // guard: the widget may be gone
if (saved == true) ref.invalidate(taskListNotifierProvider);
```

### 3. Persistent tabs with `StatefulShellRoute.indexedStack`

A bottom navigation bar needs **one Navigator per tab** so each tab keeps its own stack and scroll position. `StatefulShellRoute.indexedStack` gives you exactly that: each `StatefulShellBranch` owns a branch Navigator, and the shell keeps all branches alive in an `IndexedStack`.

```dart
StatefulShellRoute.indexedStack(
  builder: (context, state, navigationShell) =>
      AppScaffold(navigationShell: navigationShell), // renders the NavigationBar
  branches: [
    StatefulShellBranch(routes: [
      GoRoute(path: '/tasks', builder: (_, __) => const TaskListScreen(), routes: [
        GoRoute(path: ':taskId', builder: (c, s) =>
            TaskDetailScreen(taskId: s.pathParameters['taskId']!)),
      ]),
    ]),
    StatefulShellBranch(routes: [
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ]),
  ],
);

// Inside AppScaffold — switch branches, do NOT context.go the tab route.
void onDestinationSelected(int index) => navigationShell.goBranch(
      index,
      // Tapping the active tab again pops that branch back to its root.
      initialLocation: index == navigationShell.currentIndex,
    );
```

Switching tabs with `context.go('/profile')` instead of `goBranch` discards the other branch's stack — that is the single most common shell-route bug.

### 4. Auth gating with `redirect` + `refreshListenable`

Gating belongs in the router, not in widgets. `redirect` runs before any route builds, so an unauthenticated user never mounts a protected screen (no flash of private data, no wasted fetch). Return `null` to allow, or a location string to divert. `redirect` is pure and synchronous — it reads already-known state; to re-run it when auth changes, pass a `Listenable` whose every notification re-evaluates the current location.

```dart
class AuthNotifier extends ChangeNotifier {
  bool _signedIn = false;
  bool get signedIn => _signedIn;
  set signedIn(bool value) { _signedIn = value; notifyListeners(); }
}

final authNotifier = AuthNotifier();

final goRouter = GoRouter(
  refreshListenable: authNotifier,          // reactive: re-runs redirect on change
  redirect: (context, state) {
    final loggingIn = state.matchedLocation == '/login';
    if (!authNotifier.signedIn) {
      // Preserve the destination so login can send the user back.
      return loggingIn ? null : '/login?from=${Uri.encodeComponent(state.uri.toString())}';
    }
    if (loggingIn) return state.uri.queryParameters['from'] ?? '/tasks';
    return null;                            // null = no redirect, proceed
  },
  routes: [/* ... */],
);
```

Always include the "already at the target" escape (`loggingIn ? null : ...`). A `redirect` that unconditionally returns `/login` loops until `go_router` throws a redirect-limit error. Drive `authNotifier` from your auth state provider so login/logout automatically re-evaluates routing — see `flutter-state-riverpod`.

### 5. Typed routes with `go_router_builder` (recommended)

String locations are unchecked. `go_router_builder` generates the route table from annotated classes so the compiler enforces both the path shape and the parameter types.

```dart
// lib/router.dart
part 'router.g.dart';

@TypedGoRoute<TasksRoute>(
  path: '/tasks',
  routes: [TypedGoRoute<TaskDetailRoute>(path: ':taskId')],
)
class TasksRoute extends GoRouteData with _$TasksRoute {
  const TasksRoute();
  @override
  Widget build(BuildContext context, GoRouterState state) => const TaskListScreen();
}

class TaskDetailRoute extends GoRouteData with _$TaskDetailRoute {
  const TaskDetailRoute({required this.taskId, this.showArchived = false});
  final String taskId;       // path parameter (declared in the path)
  final bool showArchived;   // non-path field → query parameter, typed
  @override
  Widget build(BuildContext context, GoRouterState state) =>
      TaskDetailScreen(taskId: taskId, showArchived: showArchived);
}

// Call site — a typo or a missing argument is now a compile error.
const TaskDetailRoute(taskId: '42').go(context);
await const TaskDetailRoute(taskId: '42').push<bool>(context);
```

Run `dart run build_runner build --delete-conflicting-outputs` after editing route classes, and register the generated `$appRoutes` in the `GoRouter`. Adopt typed routes for any app past ~8 routes; below that the codegen cost may not pay for itself.

### 6. Deep links and state restoration

`go_router` resolves an incoming platform URI through the same route table, so a correct route table means deep links work for free — but the platform side must be configured:

- **Android**: an `<intent-filter>` with `android:autoVerify="true"` in `AndroidManifest.xml` plus a hosted `assetlinks.json`.
- **iOS**: an associated-domains entitlement plus `FlutterDeepLinkingEnabled = true` in `Info.plist`.
- Verify locally: `adb shell am start -a android.intent.action.VIEW -d "https://example.com/tasks/42"`, or `xcrun simctl openurl booted "https://example.com/tasks/42"`.

State restoration (process death on Android, or an iOS app evicted from memory) needs an explicit ID on every layer that stores state — `go_router` restores the navigation stack only when the whole chain is opted in:

```dart
MaterialApp.router(
  restorationScopeId: 'app',
  routerConfig: GoRouter(
    restorationScopeId: 'router',
    routes: [
      GoRoute(
        path: '/tasks',
        pageBuilder: (context, state) => MaterialPage(
          restorationId: 'tasks',       // per-page restoration id
          child: const TaskListScreen(),
        ),
      ),
    ],
  ),
);
```

For a `StatefulShellRoute`, also set `restorationScopeId` on each `StatefulShellBranch`, otherwise the active tab index resets after restoration.

### 7. Parameters: path vs query

- **Path parameters** identify a resource and are part of the route's identity: `/tasks/:taskId` → `state.pathParameters['taskId']`. They are required. Encode anything user-supplied with `Uri.encodeComponent` before interpolating — a slash or space in a raw ID silently breaks matching.
- **Query parameters** are optional modifiers and never affect which route matches: `/tasks?filter=open` → `state.uri.queryParameters['filter']` (always `String?`; parse and default explicitly).
- **`extra`** carries a non-serializable object for one navigation. It is *not* encoded into the URL, so it is `null` after a deep link or a restoration — never make a screen depend on `extra` alone.

```dart
context.goNamed('taskDetail',
    pathParameters: {'taskId': task.id},          // encoded by go_router
    queryParameters: {'filter': 'open'});

// Reading, with explicit fallbacks:
final filter = state.uri.queryParameters['filter'] ?? 'all';
final page = int.tryParse(state.uri.queryParameters['page'] ?? '') ?? 1;
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "`Navigator.push` is fine, we only have 3 screens" | `Navigator.push` has no URL, so you lose deep links, Web addressability, and state restoration — and retrofitting the router later means touching every call site. The route table costs ~20 lines up front. |
| "The redirect logic belongs in the widget's `build`" | A widget-level auth check mounts the protected screen first: it fires its fetches, may flash private data, then navigates away. `redirect` runs before any build and short-circuits cleanly. |
| "Shell routes are too complex, I'll just use an `IndexedStack` manually" | A manual `IndexedStack` gives you one Navigator for all tabs: pushing a detail from tab A then switching to tab B and back loses A's stack, and none of the tabs are URL-addressable. `StatefulShellRoute.indexedStack` gives per-branch Navigators. |
| "Strings everywhere are fine, no need for typed routes" | A mistyped `'/task/42'` (vs `/tasks/`) compiles and only fails at runtime, often only on the deep-link path nobody manually tests. `go_router_builder` turns it into a compile error. |
| "I'll pass the whole object through `extra` — it's simpler than a repository lookup" | `extra` is dropped on deep link, refresh, and restoration. The screen must be able to rebuild itself from the URL alone; fetch by ID. |
| "`context.go` works for tab switching, `goBranch` is extra ceremony" | `context.go` re-resolves the location against the root, discarding the branch stacks. That is state loss users perceive as the app "forgetting" where they were. |

## Red Flags

- `context.go` / `context.push` called inside `build()` (or inside a `Provider` builder) — navigation during a render pass.
- A `redirect` that returns `'/login'` without checking whether the current location already **is** `/login` — infinite redirect loop.
- Auth state changing but the router not reacting: no `refreshListenable` (or a `Listenable` that never calls `notifyListeners`), so the user stays on a stale screen.
- Tab switching via `context.go('/tab')` instead of `navigationShell.goBranch(index)` — per-branch stacks and scroll positions reset.
- Raw string interpolation of user-supplied values into a path (`'/search/$query'`) with no `Uri.encodeComponent` — spaces and slashes break route matching.
- `restorationScopeId` missing on `MaterialApp.router`, the `GoRouter`, or the shell branches, while the app claims to support state restoration.
- A screen that reads `state.extra!` and crashes when opened from a deep link.
- Multiple `GoRouter` instances, or a `GoRouter` rebuilt inside a widget `build()` — the router must be a stable, app-lifetime object.
- Any `Navigator.of(context).push` left in feature code after the router exists — it creates an unaddressable route the router cannot see.
- Long `redirect` bodies doing async work; `redirect` must be a fast, synchronous read of already-resolved state.

## Verification

- [ ] Every screen is reachable by typing its URL string — no destination exists only as a `Navigator.push` target.
- [ ] Unauthenticated access to a protected location redirects to `/login`, and post-login returns to the originally requested location (test both directions).
- [ ] Changing auth state at runtime re-runs `redirect` (`refreshListenable` verified by a widget test, not by inspection).
- [ ] Tab state survives switching: push a detail in tab A, switch to tab B, switch back — the detail is still on top.
- [ ] Tapping the already-active tab pops that branch to its root (`initialLocation: index == currentIndex`).
- [ ] Typed routes (if adopted) compile after `build_runner`, and `dart run build_runner build` produces no conflicting outputs.
- [ ] Deep links resolve on both platforms via `adb shell am start ...` and `xcrun simctl openurl ...`.
- [ ] An unknown location renders `errorBuilder`, not a crash or a blank screen.
- [ ] Path parameters containing spaces / slashes round-trip correctly (encode on write, decode on read).
- [ ] State restoration verified with "Don't keep activities" enabled on Android — the stack and active tab return intact.
- [ ] `flutter analyze` is clean and router tests pass (see `flutter-testing-and-benchmark` for the router test harness).
