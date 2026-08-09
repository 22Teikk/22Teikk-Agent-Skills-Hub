---
name: flutter-animations
description: "Use when writing or reviewing Flutter motion in the UI: choosing between implicit widget animations (AnimatedContainer, AnimatedOpacity, AnimatedSwitcher, TweenAnimationBuilder), explicit AnimationController + Tween/AnimatedBuilder, Hero shared-element transitions, staggered Interval sequences, AnimatedList insert/remove, spring curves, and physics-based motion. Do not use for route/navigation transitions (see flutter-navigation) or for theming decisions (see flutter-theming)."
version: 1.0.0
platform: flutter
depends-on: [flutter-testing-and-benchmark, flutter-theming]
---

# Flutter: Animations

## Overview

Pick the **smallest animation API that matches the job**. Implicit widget animations (`AnimatedContainer`, `AnimatedOpacity`, `AnimatedSwitcher`, `TweenAnimationBuilder`) cover ~90% of real-world motion with zero lifecycle management — start there. Escalate to `AnimationController` + `AnimatedBuilder` only when you need repeat/reverse/seek control or a value the implicit widgets cannot express. Use `Hero` for shared-element transitions between routes, staggered `Interval` sequences when several values must move in choreographed lockstep, and `AnimatedList` for list insert/remove. Every animation in this skill is state-driven and testable; there is no "fire and forget" motion.

## When to Use

- Use when implementing or reviewing any motion in a Flutter UI.
- Use when choosing between `AnimatedContainer`, `AnimatedOpacity`, `AnimatedSwitcher`, `TweenAnimationBuilder`, `AnimationController`, `Hero`, staggered sequences, and `AnimatedList`.
- Use when picking durations, `Curves`, and physics (spring) parameters.
- Do NOT use for route/navigation transitions — that is `flutter-navigation` territory; this skill covers in-widget motion only.
- Do NOT use for theming or design-token decisions — see `flutter-theming`.

## Core Process

### 1. Decision ladder: pick the smallest API

| Visual job | API |
|---|---|
| Animate container properties toward new values (`color`, `padding`, `width/height`, `borderRadius`, `alignment`, `transform`) | `AnimatedContainer` |
| Fade a value or a subtree in/out | `AnimatedOpacity` |
| Cross-fade between different children in the same slot | `AnimatedSwitcher` |
| Animate any single custom value with no controller bookkeeping | `TweenAnimationBuilder` |
| Repeat, reverse, loop, seek, or drive a `CustomPainter`/non-widget value | `AnimationController` + `AnimatedBuilder` / `AnimatedWidget` |
| Shared-element transition between two screens | `Hero` |
| Several values animating in a choreographed sequence off one controller | Staggered: one controller + `Interval` + multiple `Tween`s |
| Animate list items being inserted/removed | `AnimatedList` |
| Physics-based motion (fling, bounce, spring settle) | `flutter/physics` simulations or `Curves` on an implicit/explicit animation |

Rule: if an implicit widget can express the motion, use it. Escalate to `AnimationController` only when it cannot.

### 2. Implicit animations — the default

Implicit widgets take a `duration` and a `curve`, and animate automatically when their input value changes. No `setState` orchestration, no `dispose`.

```dart
// Animate color, padding, size, and border-radius together.
AnimatedContainer(
  duration: const Duration(milliseconds: 250),
  curve: Curves.easeInOut,
  padding: expanded ? const EdgeInsets.all(24) : const EdgeInsets.all(8),
  decoration: BoxDecoration(
    color: selected ? colorScheme.primary : colorScheme.surface,
    borderRadius: BorderRadius.circular(expanded ? 16 : 8),
  ),
  child: ...,
)
```

`AnimatedSwitcher` cross-fades between different children — but only if the children have **different `Key`s**, otherwise the switch cannot tell the content changed:

```dart
AnimatedSwitcher(
  duration: const Duration(milliseconds: 300),
  child: isLoading
      ? const Spinner(key: ValueKey('loading'))
      : const Content(key: ValueKey('content')),
)
```

`TweenAnimationBuilder` animates any single custom value between `begin` and `end`, re-animating whenever the tween's `end` changes — useful for values with no dedicated implicit widget:

```dart
TweenAnimationBuilder<double>(
  tween: Tween(begin: 0, end: progress),
  duration: const Duration(milliseconds: 500),
  builder: (context, value, child) =>
      CircularProgressIndicator(value: value),
)
```

### 3. Explicit: `AnimationController` + `AnimatedBuilder`

Use when motion repeats, reverses, loops, or must be seeked by user input. The controller requires a `TickerProvider` (use `SingleTickerProviderStateMixin` for one controller, `TickerProviderStateMixin` for several) and **must be `dispose()`d**.

```dart
class Pulse extends StatefulWidget { ... }

class _PulseState extends State<Pulse> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 800),
  )..repeat(reverse: true);

  late final Animation<double> _scale =
      Tween(begin: 0.9, end: 1.0).animate(
          CurvedAnimation(parent: _controller, curve: Curves.easeInOut));

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _scale,
      child: /* expensive static subtree */ const Icon(Icons.record),
      builder: (context, child) => Transform.scale(scale: _scale.value, child: child),
    );
  }
}
```

Pass the static `child` into `AnimatedBuilder` so only the scaled widget rebuilds — the static subtree stays cached. Prefer transition widgets (`FadeTransition`, `ScaleTransition`, `SlideTransition`, `RotationTransition`, `SizeTransition`) over raw `Transform`+manual wiring where one exists.

### 4. `Hero` shared-element transitions

`Hero` flies a widget between two routes. Requirements: **wrap matching widgets on both the source and destination routes**, tags must be **unique within each route**, and the widget tree must have a `MaterialApp` ancestor — the `Navigator`'s overlay runs the hero flight. No controller needed.

```dart
// Source route
Hero(tag: 'task-avatar-${task.id}', child: Avatar(url: task.avatarUrl))

// Destination route (same tag)
Hero(tag: 'task-avatar-${task.id}', child: Avatar(url: task.avatarUrl, large: true))
```

Disable flights in a subtree with `HeroMode(enabled: false, child: ...)` (e.g., inside a screen that is itself a hero's destination and must not re-trigger a flight). Route transitions themselves belong to `flutter-navigation` — do not hand-roll page transitions here.

### 5. Staggered animations

One `AnimationController`, multiple `Tween`s, each gated by an `Interval` — never one controller per value. `Interval` is a curve whose `begin`/`end` (0.0–1.0) select the window of the controller's progress in which that animation runs.

```dart
late final AnimationController _controller = AnimationController(
  vsync: this, duration: const Duration(milliseconds: 1200));

late final Animation<double> _fade = Tween(begin: 0.0, end: 1.0).animate(
  CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.3)));
late final Animation<Offset> _slide = Tween<Offset>(
  begin: const Offset(0, 0.25), end: Offset.zero).animate(
  CurvedAnimation(parent: _controller,
      curve: const Interval(0.2, 0.6, curve: Curves.easeOut)));

// build: FadeTransition(opacity: _fade, child: SlideTransition(position: _slide, ...))
// trigger: _controller.forward();
```

Keep the intervals overlapping or adjacent; a gap between intervals means nothing animates during that span.

### 6. `AnimatedList` for insert/remove

`AnimatedList` animates items into and out of a list. Hold a `GlobalKey<AnimatedListState>` and call `insertItem` / `removeItem` on it; `removeItem` needs a builder for the outgoing widget so it can animate away after removal.

```dart
final _listKey = GlobalKey<AnimatedListState>();

// Insert: _listKey.currentState?.insertItem(index);
// Remove (returns a builder so the item animates out before it is dropped):
_listKey.currentState?.removeItem(
  index,
  (context, animation) => SizeTransition(
    sizeFactor: animation, child: _TaskTile(task: tasks[index])),
);
```

Use `AnimatedList` only when the items themselves must animate. For plain data changes, a `ListView.builder` with `AnimatedSwitcher`/`AnimatedContainer` per item is simpler.

### 7. Curves and physics

- **Durations**: 150–300ms for micro-interactions, up to ~500ms for larger layout changes; match the whole pack's motion language. Do not invent per-widget durations on a whim.
- **Curves**: `Curves.easeInOut` for most state changes, `Curves.easeOutBack` for a subtle overshoot on scale reveals, `Curves.elasticOut` / `Curves.bounceOut` for deliberate bounce — used sparingly.
- **Real physics**: `package:flutter/physics` provides `SpringSimulation`, `SpringDescription`, `GravitySimulation`. Drive a controller with `controller.animateWith(simulation)` for fling/spring-settle motion that implicit curves cannot fake.

```dart
final simulation = SpringSimulation(
  const SpringDescription(mass: 1, stiffness: 200, damping: 20),
  0, 1, 0, // start, end, velocity
);
_controller.animateWith(simulation);
```

### 8. Performance rules

- **Prefer implicit.** Every `AnimationController` you add is vsync wiring, `dispose` obligation, and a leak risk. If `AnimatedX` can do it, `AnimatedX` does it.
- **`RepaintBoundary`** isolates independently-animating subtrees (carousel slides, animated charts) so the rest of the screen does not repaint each frame.
- **Animate transforms, not layout.** Animating `width`/`height`/`padding` re-runs layout on the whole subtree every frame. Prefer `ScaleTransition`, `Transform.scale`, or `AnimatedScale` for size-like motion — those only repaint/composite.
- **Opacity on large subtrees is expensive.** `AnimatedOpacity`/`FadeTransition` below full opacity creates a `saveLayer` (an offscreen render) per frame. Keep the faded subtree small, or animate a transform instead.
- **Scope rebuilds.** Use `AnimatedBuilder`'s `child` parameter and transition widgets so a ticking controller rebuilds only the animated widgets, not the whole screen.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "AnimatedOpacity hides the widget" | Below `opacity: 1.0` the subtree stays in the tree, in layout, and hit-testable. For true removal use `AnimatedSwitcher` or gate with an `if`. |
| "I need an `AnimationController` for everything" | Implicit widgets cover most motion with zero lifecycle. Controllers add vsync/`dispose` obligations and leak if mishandled. |
| "I'll animate `width`/`height` for a smooth expand" | Layout animation re-runs layout every frame and janks large subtrees. Prefer `ScaleTransition`/`Transform`, or `AnimatedSize` for simple auto-sizing cases. |
| "`Hero` needs special setup" | `Hero` needs unique tags on both routes plus a `MaterialApp` ancestor — no controller, no `TickerProvider`. |
| "Staggered means one controller per value" | One controller + `Interval` curves on multiple `Tween`s. Per-value controllers drift out of sync and cannot be reversed as a unit. |
| "Animating opacity on the whole screen is fine" | Every frame under 1.0 opacity renders the entire subtree to an offscreen layer. Keep faded subtrees small. |

## Red Flags

- An `AnimationController` where an implicit widget would do (unnecessary lifecycle and leak surface).
- An `AnimationController` without `dispose()` in its `State`.
- `AnimatedSwitcher` children without `Key`s — the switch never detects a content change.
- Duplicate `Hero` tags within the same route (runtime assertion) or `Hero` used without a `MaterialApp` ancestor (no flight).
- Staggered motion implemented as N independent controllers.
- `AnimatedOpacity`/`FadeTransition` wrapping a large, expensive subtree.
- `width`/`height`/`padding` animated on a frequently-rebuilt subtree instead of a transform.
- A screen-wide rebuild driven directly by an `AnimationController` instead of a scoped `AnimatedBuilder`.
- Animation tests using `pumpAndSettle` on a repeating controller (it never settles — the test times out).

## Verification

- [ ] The smallest API from the decision ladder is used; no implicit-capable motion runs on an `AnimationController`.
- [ ] Every `AnimationController` is `dispose()`d (or owned by a widget that manages its lifecycle).
- [ ] `Hero` tags are unique per route and wrap matching widgets on both source and destination.
- [ ] `RepaintBoundary` isolates independently-animating subtrees.
- [ ] Layout properties are not animated where a transform (scale/translate/rotate) would do.
- [ ] Staggered sequences use one controller with `Interval` curves.
- [ ] Widget tests cover the motion via `tester.pump(duration)` / `tester.pumpAndSettle()` (see `flutter-testing-and-benchmark`).
- [ ] `flutter analyze` is clean and `flutter test` passes.
