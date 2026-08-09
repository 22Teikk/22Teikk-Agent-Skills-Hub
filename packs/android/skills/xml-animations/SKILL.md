---
name: xml-animations
description: "Use when writing or reviewing Android animations in XML/Java/Kotlin View-based UI: showing or hiding views with fade/slide, animating a single property, running several animators together, animating layout transitions with TransitionManager, building constraint-driven motion with MotionLayout, adding shared element transitions between screens, or choosing between ObjectAnimator, ViewPropertyAnimator, AnimatorSet, TransitionManager, and MotionLayout."
version: 1.0.0
platform: android
---

# Android View Animations (XML / Java / Kotlin)

## Overview

Choose and review Android View-based animation APIs (XML, Java, Kotlin) for single properties, coordinated animators, layout transitions, MotionLayout scenes, and shared element screen transitions. Pick the **smallest API that matches the problem**: simple property targets first, then coordinated sets, then layout-aware transitions, then full MotionLayout for complex constraint-driven motion. Do not reach for MotionLayout when `ViewPropertyAnimator` or `TransitionManager` is sufficient.

## When to Use

- Use when implementing or reviewing animations in View-based (XML layout) Android projects (Java or Kotlin).
- Use when choosing between `ViewPropertyAnimator`, `ObjectAnimator`, `AnimatorSet`, `TransitionManager`, and `MotionLayout`.
- Use when setting up shared element transitions between Activity or Fragment screens.
- Do NOT use for Jetpack Compose UI (use `compose-animations` instead).

## Core Process

### 1. Pick the Smallest Animation API

| Need | API |
|---|---|
| Animate one or two view properties (alpha, translation, scale, rotation) imperatively | [`ViewPropertyAnimator`](https://developer.android.com/reference/android/view/ViewPropertyAnimator) via `view.animate()` |
| Animate a single arbitrary property of any object | [`ObjectAnimator`](https://developer.android.com/reference/android/animation/ObjectAnimator) |
| Compute interpolated values without targeting a view property directly | [`ValueAnimator`](https://developer.android.com/reference/android/animation/ValueAnimator) |
| Run multiple animators together or in sequence | [`AnimatorSet`](https://developer.android.com/reference/android/animation/AnimatorSet) |
| Animate layout changes automatically when views are added, removed, or repositioned | [`TransitionManager`](https://developer.android.com/reference/android/transition/TransitionManager) + `beginDelayedTransition` or `Scene` |
| Constraint-driven motion across multiple states with complex paths | [`MotionLayout`](https://developer.android.com/training/constraint-layout/motionlayout) |
| Animate between drawables on state change (checked, pressed, selected) | [`AnimatedStateListDrawable`](https://developer.android.com/reference/android/graphics/drawable/AnimatedStateListDrawable) |
| Play a vector drawable animation defined in XML | [`AnimatedVectorDrawable`](https://developer.android.com/reference/android/graphics/drawable/AnimatedVectorDrawable) |
| Shared elements between Activity or Fragment transitions | [`ActivityOptions.makeSceneTransitionAnimation`](https://developer.android.com/training/transitions/start-activity) / Fragment shared element API |

### 2. `ViewPropertyAnimator` — Fluent Single-View Motion

The fastest path for simple fade, slide, or scale on a single view. Cancels gracefully and chains well.

```kotlin
// Fade out, then slide in from below
view.animate()
    .alpha(0f)
    .setDuration(200)
    .withEndAction {
        view.translationY = 100f
        view.alpha = 1f
        view.animate()
            .translationY(0f)
            .alpha(1f)
            .setDuration(300)
            .setInterpolator(DecelerateInterpolator())
            .start()
    }
    .start()
```

```java
// Java equivalent
view.animate()
    .alpha(0f)
    .setDuration(200)
    .withEndAction(() -> {
        view.setTranslationY(100f);
        view.setAlpha(1f);
        view.animate()
            .translationY(0f)
            .alpha(1f)
            .setDuration(300)
            .setInterpolator(new DecelerateInterpolator())
            .start();
    })
    .start();
```

### 3. `ObjectAnimator` — Single Property, Any Target

Use when `ViewPropertyAnimator` does not cover the property (e.g., custom drawable attributes, background color via `ArgbEvaluator`, scroll position).

```kotlin
val colorAnim = ObjectAnimator.ofArgb(
    view, "backgroundColor",
    Color.WHITE, Color.parseColor("#FF6200EE")
).apply {
    duration = 300
    interpolator = AccelerateDecelerateInterpolator()
}
colorAnim.start()
```

```xml
<!-- res/animator/fade_in.xml -->
<objectAnimator
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:propertyName="alpha"
    android:valueFrom="0"
    android:valueTo="1"
    android:duration="300"
    android:interpolator="@android:interpolator/decelerate_quad" />
```

### 4. `AnimatorSet` — Coordinated Multi-Property Motion

Run several animators **together** (`playTogether`) or **in sequence** (`playSequentially`).

```kotlin
val fadeIn  = ObjectAnimator.ofFloat(view, "alpha", 0f, 1f).setDuration(200)
val slideUp = ObjectAnimator.ofFloat(view, "translationY", 80f, 0f).setDuration(300)

AnimatorSet().apply {
    play(slideUp).with(fadeIn)        // both at once
    interpolator = DecelerateInterpolator()
    start()
}
```

### 5. `TransitionManager` — Automatic Layout Transitions

Let the system animate view additions, removals, and re-layout automatically. No per-property code required.

```kotlin
// Animate any layout change within a ViewGroup
TransitionManager.beginDelayedTransition(container, AutoTransition())
view.visibility = View.GONE   // layout change happens; system animates it
```

For more control, define named `Scene`s in XML and transition between them:

```kotlin
val sceneA = Scene.getSceneForLayout(container, R.layout.scene_a, context)
val sceneB = Scene.getSceneForLayout(container, R.layout.scene_b, context)

TransitionManager.go(sceneB, ChangeBounds().apply { duration = 400 })
```

### 6. Interpolator Selection

| Motion feel | Interpolator |
|---|---|
| Natural deceleration (elements arriving) | `DecelerateInterpolator` |
| Natural acceleration (elements leaving) | `AccelerateInterpolator` |
| Overshoot a target, spring back | `OvershootInterpolator` |
| Anticipate before moving, decelerate at end | `AnticipateOvershootInterpolator` |
| Bounce at the end | `BounceInterpolator` |
| Ease in and out (general-purpose) | `AccelerateDecelerateInterpolator` |
| Material Design standard easing | `FastOutSlowInInterpolator` (from `androidx.interpolator`) |
| Material Design enter easing | `LinearOutSlowInInterpolator` |
| Material Design exit easing | `FastOutLinearInInterpolator` |

Prefer Material interpolators from `androidx.interpolator.view.animation` for UI that follows Material Design.

### 7. `MotionLayout` — Constraint-Driven Scene Animation

Use **only** when the motion involves multiple views changing constraints across two or more states. Simpler layouts should use `TransitionManager` or `ViewPropertyAnimator`.

```xml
<!-- res/layout/activity_motion.xml -->
<androidx.constraintlayout.motion.widget.MotionLayout
    android:id="@+id/motionLayout"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:layoutDescription="@xml/scene_motion">

    <ImageView
        android:id="@+id/header"
        android:layout_width="match_parent"
        android:layout_height="180dp" />
</androidx.constraintlayout.motion.widget.MotionLayout>
```

```xml
<!-- res/xml/scene_motion.xml -->
<MotionScene xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:motion="http://schemas.android.com/apk/res-auto">

    <Transition
        motion:constraintSetStart="@id/start"
        motion:constraintSetEnd="@id/end"
        motion:duration="400">
        <OnSwipe
            motion:touchAnchorId="@id/header"
            motion:dragDirection="dragUp" />
    </Transition>

    <ConstraintSet android:id="@+id/start">
        <Constraint android:id="@+id/header"
            android:layout_width="match_parent"
            android:layout_height="180dp"
            motion:layout_constraintTop_toTopOf="parent" />
    </ConstraintSet>

    <ConstraintSet android:id="@+id/end">
        <Constraint android:id="@+id/header"
            android:layout_width="match_parent"
            android:layout_height="56dp"
            motion:layout_constraintTop_toTopOf="parent" />
    </ConstraintSet>
</MotionScene>
```

Trigger programmatically:

```kotlin
motionLayout.transitionToEnd()
motionLayout.transitionToStart()
motionLayout.progress = 0.5f // seek to midpoint
```

### 8. Shared Element Transitions

Tag matching views with `transitionName` in both source and destination layouts:

```xml
<!-- source layout -->
<ImageView
    android:id="@+id/thumbnail"
    android:transitionName="hero_image" />

<!-- destination layout -->
<ImageView
    android:id="@+id/detail_image"
    android:transitionName="hero_image" />
```

Start the activity with the shared element:

```kotlin
val options = ActivityOptionsCompat.makeSceneTransitionAnimation(
    this,
    thumbnailView,
    "hero_image"
)
startActivity(intent, options.toBundle())
```

For **Fragment** shared elements, use `addSharedElement()` on the `FragmentTransaction`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Using `MotionLayout` for a simple fade or slide is fine" | MotionLayout adds significant layout overhead for single-property motion. Use `ViewPropertyAnimator` or `TransitionManager`. |
| "Calling `view.animate().alpha(0f)` hides the view from layout" | Alpha changes visual appearance, not layout visibility. Add `.withEndAction { view.visibility = View.GONE }` or use `TransitionManager`. |
| "Starting a new `ObjectAnimator` automatically cancels the old one" | Running parallel ObjectAnimators on the same property causes glitching. Cancel the previous animator explicitly or use `ViewPropertyAnimator`. |
| "Legacy View animations (`AnimationUtils.loadAnimation`) work the same as ObjectAnimator" | Legacy View animations only alter drawing pixels, not actual interactive View bounds or click targets. Always use Property Animators (`Animator`). |

## Red Flags

- Using `MotionLayout` for simple single-view property animations.
- View fading out via alpha animation without setting `visibility = GONE` at end action (leaves non-interactive ghost view in layout).
- ObjectAnimators started repeatedly without canceling existing running instances.
- Legacy `AnimationUtils` / `Animation` class used instead of property animators (`ObjectAnimator`, `ViewPropertyAnimator`).
- Shared element transition failing because `android:transitionName` string values mismatch between source and destination.

## Verification

- [ ] Smallest appropriate animation API selected according to decision table.
- [ ] View visibility set to `GONE`/`INVISIBLE` after fade-out animations.
- [ ] Property Animators used instead of legacy View animations.
- [ ] Shared element transitions verify matching `transitionName` properties.
- [ ] MotionLayout scenes verified to compile without missing layout anchors.
