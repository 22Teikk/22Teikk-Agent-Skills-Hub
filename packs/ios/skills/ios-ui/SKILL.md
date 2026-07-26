---
name: ios-ui
description: Builds iOS user interfaces using SwiftUI and the Observation framework. Use when creating or modifying SwiftUI views, `@Observable` view models, `NavigationStack` routes, `List`/`LazyVGrid`, async view work via `.task`, or accessibility modifiers.
version: 1.0.0
platform: ios
depends-on:
  - ios-data-and-concurrency
---

# iOS UI Engineering (SwiftUI & Observation)

## Overview

Build accessible, performant, state-correct iOS interfaces in SwiftUI. Use the Observation framework (`@Observable`) for view models, hoist state into the view layer, drive async work with the `.task` modifier, and navigate via type-safe `NavigationStack` paths. Replace Jetpack Compose idioms with their SwiftUI counterparts — never transliterate Kotlin syntax into Swift.

## When to Use

- Use when developing user interfaces in Swift-based iOS projects targeting iOS 17+.
- Use when creating a new SwiftUI screen, custom `View`, or `ViewModifier`.
- Use when introducing or refactoring an `@Observable` view model.
- Use when wiring up navigation via `NavigationStack` / typed `NavigationPath`.
- Use when migrating a UIKit screen to SwiftUI (or wrapping a UIKit view via `UIViewRepresentable`).
- Do NOT use for AppKit (macOS), watchOS, or visionOS — `NavigationStack` and `@Observable` semantics differ; use a sibling skill.

## Core Process

### 1. MVVM with the Observation Framework

- **View (SwiftUI)**: Dumb presentation. Reads state, calls methods on the model, propagates user events.
- **View Model**: `@Observable` class (or `@Bindable` when two-way binding is required). Owns UI state as stored properties.
- **UI State**: One struct (`@MainActor` isolated) representing the whole screen — loading / loaded / error / partial.

```swift
// UI State — value type, exhaustive, @MainActor isolated
@MainActor
struct TaskListUiState {
    var tasks: [Task] = []
    var isLoading: Bool = false
    var errorMessage: String? = nil
}

// View Model — @Observable, @MainActor, constructor-injected dependencies
@Observable
@MainActor
final class TaskListModel {
    private let getTasks: GetTasksUseCase
    private(set) var state = TaskListUiState()

    init(getTasks: GetTasksUseCase) {
        self.getTasks = getTasks
    }

    func load() async {
        state.isLoading = true
        state.errorMessage = nil
        do {
            // Stream yields to state — see ios-data-and-concurrency for the AsyncSequence pattern
            for try await tasks in getTasks() {
                state.tasks = tasks
                state.isLoading = false
            }
        } catch {
            state.errorMessage = error.localizedDescription
            state.isLoading = false
        }
    }
}
```

### 2. State Hoisting & View Recomputation Discipline

- **Hoist state up**: pass state down as `let` constants or bindings; let the view model own the source of truth.
- **Cheap body**: SwiftUI re-runs `body` on every state change. Anything expensive (parsing, sorting > 1000 items, regex) belongs in the view model or behind `@State` + `.task`.
- **Avoid `@State` for owned view models** when the model is injected — use `@Bindable` for two-way binding into an `@Observable`, or just call methods directly.
- **Identity in lists**: always pass a stable `id:` to `List` / `ForEach` (or make the element `Identifiable`). Animations and diffing depend on it.

```swift
// Stateless, hoistable view — previewable and unit-testable in isolation
struct TaskListContent: View {
    let state: TaskListUiState
    let onSelect: (Task.ID) -> Void
    let onRefresh: () -> Void

    var body: some View {
        Group {
            if state.isLoading && state.tasks.isEmpty {
                ProgressView()
            } else if let message = state.errorMessage, state.tasks.isEmpty {
                ContentUnavailableView(
                    "Couldn't load tasks",
                    systemImage: "exclamationmark.triangle",
                    description: Text(message)
                )
            } else {
                List(state.tasks) { task in
                    Button {
                        onSelect(task.id)
                    } label: {
                        TaskRow(task: task)
                    }
                }
                .refreshable { onRefresh() }
            }
        }
    }
}
```

### 3. Type-Safe Navigation with NavigationStack

- Define routes as an enum that conforms to `Hashable`. Use a `@State` `NavigationPath` (or an external router) for programmatic push/pop.

```swift
enum AppRoute: Hashable {
    case taskList
    case taskDetail(Task.ID)
}

struct RootView: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            TaskListScreen(path: $path)
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .taskList:
                        TaskListScreen(path: $path) // root, re-rendered
                    case .taskDetail(let id):
                        TaskDetailScreen(taskId: id)
                    }
                }
        }
    }
}

// Pushing a route — never use NavigationLink(value:) inside computed collections
// without an enclosing NavigationStack; keep push sites explicit:
struct TaskListScreen: View {
    @Binding var path: NavigationPath
    let onSelect: (Task.ID) -> Void = { id in /* push from parent */ }
    // ...
}
```

### 4. Async Work in Views via `.task` and `.task(id:)`

- Use `.task` for view-scoped work that should cancel on disappear. Use `.task(id: someValue)` to restart when an input changes.
- Use `.refreshable` to wrap `Task { ... }` for pull-to-refresh.
- Never start a `Task { ... }` at the top level of `body` — it has no lifecycle and will leak.

```swift
struct TaskListScreen: View {
    @State private var model: TaskListModel
    @State private var path = NavigationPath()

    init(getTasks: GetTasksUseCase) {
        _model = State(initialValue: TaskListModel(getTasks: getTasks))
    }

    var body: some View {
        TaskListContent(
            state: model.state,
            onSelect: { id in path.append(AppRoute.taskDetail(id)) },
            onRefresh: { await model.load() }
        )
        .task {
            await model.load()
        }
        // .task(id: filterKey) { ... } for re-running on input change
    }
}
```

### 5. Accessibility, Dynamic Type & System Materials

- Every interactive element needs a label (`accessibilityLabel`, or a label-bearing control like `Button`).
- Use `Text` (never `String(format:)`) so VoiceOver, Dynamic Type, and RTL all work.
- Honor `@Environment(\.dynamicTypeSize)` — do not hard-code font sizes below `.body`.
- For custom controls, add `.accessibilityAddTraits(.isButton)` / `.isHeader` / `.updatesFrequently`.

```swift
struct TaskRow: View {
    let task: Task
    var body: some View {
        HStack {
            Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(task.isCompleted ? .green : .secondary)
            Text(task.title)
                .font(.body)
                .accessibilityLabel("\(task.title), \(task.isCompleted ? "completed" : "pending")")
        }
        .padding(.vertical, 4)
    }
}
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This screen is too simple for a view model" | Screens grow. A view model from day one gives you a real place to put loading/error/empty logic and keeps SwiftUI previews cheap. |
| "I'll add accessibility labels at the end" | Retrofitting accessibility means re-reading every View. Adding it as you write the row is one `.accessibilityLabel(...)` — never a refactor. |
| "I'll use `Task { ... }` at the top of `body` to fire a load" | Top-level `Task` in `body` has no view lifecycle, so it keeps running after the user navigates away and re-fires on every recomposition. Use `.task`. |
| "I can fetch with `URLSession.shared` directly inside the view" | Views that hit the network are not previewable, not testable, and violate MVVM. Route through a repository injected into the view model. |
| "`@StateObject` is fine; `@Observable` is too new" | `@Observable` (Observation framework, iOS 17+) eliminates `@Published` boilerplate and re-renders only views that read changed properties. For a new project, `@Observable` is the default. |

## Red Flags

- A view that calls `URLSession.shared`, opens a `ModelContext`, or reads `UserDefaults` directly.
- `Task { ... }` placed at the top level of `body` (no `.task` lifecycle).
- `List` / `ForEach` over a non-`Identifiable` collection without `id:` — animations break and rows get duplicated.
- `NavigationLink(destination:)` (the deprecated string-based API) used instead of `NavigationStack(path:)`.
- Hardcoded user-facing strings — use `Text("…")` + `LocalizedStringKey` / `.stringsdict` so localization is possible.
- `@StateObject` mixed with `@State` for the same object (the object is created twice).
- `print()` for analytics or logging in shipping code — use `os.Logger` (see `ios-data-and-concurrency` for observability hooks).

## Verification

- [ ] UI state derives from a single `@Observable` model; views are stateless where possible.
- [ ] Async work runs inside `.task` (not top-level `Task`).
- [ ] All `List` / `ForEach` use stable identity (`Identifiable` or explicit `id:`).
- [ ] Navigation uses `NavigationStack(path:)` with a `Hashable` route enum.
- [ ] Every interactive view has an accessibility label or is a label-bearing control.
- [ ] Previews render with sample data — no live network calls inside `Preview`.
- [ ] Dynamic Type does not clip or truncate at `.accessibility3` (or the project target).
- [ ] Logging is routed through `os.Logger`, not `print`.
