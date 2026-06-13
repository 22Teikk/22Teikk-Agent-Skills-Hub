# Android Accessibility Checklist

Quick reference for Android accessibility standards. Use alongside the corresponding `android-ui-*` skills.

## Table of Contents
- [Essential Checks](#essential-checks)
- [Jetpack Compose Patterns](#jetpack-compose-patterns)
- [XML View Patterns](#xml-view-patterns)
- [Testing Tools](#testing-tools)
- [Common Anti-Patterns](#common-anti-patterns)

## Essential Checks

### 1. Screen Reader Compatibility (TalkBack)
- [ ] Every non-text element (images, icons, buttons) has a meaningful content description.
- [ ] Decorative graphics have content description set to null (so TalkBack skips them).
- [ ] Group related items (e.g. icon + text label) into a single focusable target to simplify navigation.

### 2. Touch Target Sizes
- [ ] All interactive elements (buttons, checkboxes, text links) have touch targets of at least **48dp x 48dp** (to support users with motor impairment).
- [ ] Add touch target padding if the visual element is smaller than 48dp.

### 3. Screen Focus Order
- [ ] Keyboard and switch access focus transitions follow a logical, natural sequence (top-to-bottom, start-to-end).
- [ ] Custom focus traversal is configured when default ordering is not logical.

### 4. Color & Contrast
- [ ] Contrast ratio between text and its background is at least 4.5:1.
- [ ] Color is never the only way to convey state or crucial information (add helper text or icons).

## Jetpack Compose Patterns

### 1. Content Descriptions
```kotlin
Icon(
    imageVector = Icons.Default.Close,
    contentDescription = stringResource(R.string.close_button_description)
)
```

### 2. Custom Semantics & Click Labels
- Use custom click labels to describe actions to screen readers.

```kotlin
Modifier.semantics {
    onClick(label = "Opens the task detail screen", action = null)
}
```

### 3. Merging Semantics
- Merge child elements into a single focusable container.

```kotlin
Row(
    modifier = Modifier
        .clickable(onClick = { /* Action */ })
        .clearAndSetSemantics {
            contentDescription = "Task: Buy Groceries, Pending"
        }
) {
    Icon(Icons.Default.Pending, contentDescription = null)
    Text("Buy Groceries")
}
```

## XML View Patterns

### 1. Content Descriptions
```xml
<ImageButton
    android:id="@+id/btn_close"
    android:layout_width="48dp"
    android:layout_height="48dp"
    android:src="@drawable/ic_close"
    android:contentDescription="@string/close_button_description" />
```

### 2. Grouping Views
- Use `android:focusable="true"` on parent layouts and set `android:focusable="false"` on child elements to merge them for screen readers.

## Testing Tools
- **Accessibility Scanner**: Download Google's Accessibility Scanner app to scan screens for contrast, target size, and label issues.
- **TalkBack**: Turn on TalkBack in Android Settings -> Accessibility to manually navigate screens.
- **Layout Inspector**: Verify screen hierarchy and semantics mapping inside Android Studio.

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| ImageButton without label | TalkBack announces "Unlabelled Button" | Add `contentDescription` |
| Small touch targets (< 48dp) | Hard for users to tap | Expand clickable area using padding |
| Red/Green state indication only | Color-blind users cannot distinguish states | Add helper text or state icons |
| Splitting descriptive elements | Text label and value read as separate items | Group views or merge Compose semantics |
