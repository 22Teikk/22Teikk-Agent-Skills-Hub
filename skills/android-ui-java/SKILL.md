---
name: android-ui-java
description: Builds Android user interfaces using Java and XML layouts. Use when creating or modifying XML layout resources, Custom Views, ViewBinding, MVVM ViewModels, or LiveData in Java.
version: 1.0.0
platform: android
---

# Android UI Engineering (Java & XML Layouts)

## Overview

Build high-quality, responsive, accessible, and performant Android user interfaces using Java and XML Layouts. Adhere to MVVM + Clean Architecture, ViewBinding, optimized RecyclerViews, and modern ViewModels with LiveData.

## When to Use

- Use when developing or maintaining user interfaces in Java-based Android projects.
- Use when creating or editing XML layout resources (ConstraintLayout, ScrollView, etc.).
- Use when defining custom Android `View` components in Java.
- Use when working with ViewBinding or DataBinding in Java activities/fragments.
- Do NOT use for Kotlin/Compose-based UI implementations (use `android-ui-kotlin` instead).

## Core Process

### 1. ViewBinding & MVVM Setup
- **XML Layout**: Bindings are generated automatically. Use `ConstraintLayout` to keep view hierarchies flat.
- **ViewModel + LiveData**: ViewModels expose `LiveData` or `MutableLiveData` to update the UI reactively.

```java
// ViewModel Example
public class TaskViewModel extends ViewModel {
    private final GetTasksUseCase getTasksUseCase;
    private final MutableLiveData<TaskUiState> uiState = new MutableLiveData<>(new TaskUiState(true));

    @Inject
    public TaskViewModel(GetTasksUseCase getTasksUseCase) {
        this.getTasksUseCase = getTasksUseCase;
        loadTasks();
    }

    public LiveData<TaskUiState> getUiState() {
        return uiState;
    }

    public void loadTasks() {
        uiState.setValue(new TaskUiState(true));
        getTasksUseCase.execute(new DisposableSubscriber<List<Task>>() {
            @Override
            public void onNext(List<Task> tasks) {
                uiState.setValue(new TaskUiState(tasks));
            }

            @Override
            public void onError(Throwable t) {
                uiState.setValue(new TaskUiState(t.getMessage()));
            }

            @Override
            public void onComplete() {}
        });
    }
}
```

```java
// Activity/Fragment Example using ViewBinding
public class TaskListActivity extends AppCompatActivity {
    private ActivityTaskListBinding binding;
    private TaskViewModel viewModel;
    private TaskAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityTaskListBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        viewModel = new ViewModelProvider(this).get(TaskViewModel.class);
        setupRecyclerView();

        viewModel.getUiState().observe(this, state -> {
            binding.progressBar.setVisibility(state.isLoading() ? View.VISIBLE : View.GONE);
            if (state.getErrorMessage() != null) {
                showError(state.getErrorMessage());
            } else {
                adapter.submitList(state.getTasks());
            }
        });
    }

    private void setupRecyclerView() {
        adapter = new TaskAdapter();
        binding.recyclerView.setLayoutManager(new LinearLayoutManager(this));
        binding.recyclerView.setAdapter(adapter);
    }
}
```

### 2. Flat Layout Hierarchies with ConstraintLayout
- Avoid nested layouts (nested `LinearLayout` or `RelativeLayout`). Use `ConstraintLayout` as the root container to optimize layout passes.
- Use `<merge>` and `<include>` tags to reuse layouts efficiently.

### 3. Optimized RecyclerView with ListAdapter (DiffUtil)
- Always use `ListAdapter` with `DiffUtil.ItemCallback` instead of a standard `RecyclerView.Adapter` to ensure smooth updates and avoid full-list refreshes (`notifyDataSetChanged()`).

```java
public class TaskAdapter extends ListAdapter<Task, TaskAdapter.TaskViewHolder> {
    protected TaskAdapter() {
        super(DIFF_CALLBACK);
    }

    private static final DiffUtil.ItemCallback<Task> DIFF_CALLBACK = new DiffUtil.ItemCallback<Task>() {
        @Override
        public boolean areItemsTheSame(@NonNull Task oldItem, @NonNull Task newItem) {
            return oldItem.getId().equals(newItem.getId());
        }

        @Override
        public boolean areContentsTheSame(@NonNull Task oldItem, @NonNull Task newItem) {
            return oldItem.equals(newItem);
        }
    };

    @NonNull
    @Override
    public TaskViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemTaskBinding binding = ItemTaskBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        return new TaskViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull TaskViewHolder holder, int position) {
        holder.bind(getItem(position));
    }

    static class TaskViewHolder extends RecyclerView.ViewHolder {
        private final ItemTaskBinding binding;

        TaskViewHolder(ItemTaskBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        void bind(Task task) {
            binding.taskTitle.setText(task.getTitle());
        }
    }
}
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just use notifyDataSetChanged() since the list is small" | Small lists grow. Full refreshes force the entire layout to redraw, causing UI lag (jank). Use `DiffUtil` to animate updates smoothly. |
| "Setting binding to null in onDestroyView() is unnecessary" | Fragments outlive their views. Not nulling the binding variable in `onDestroyView()` causes severe memory leaks. |
| "Nesting layouts is easier than designing constraints" | Nested layout hierarchies require multiple measurement passes, multiplying rendering times and causing dropped frames. |

## Red Flags

- Standard `RecyclerView.Adapter` calling `notifyDataSetChanged()`.
- Fragments using ViewBinding without clearing the binding reference in `onDestroyView()`.
- Deeply nested layouts (more than 3 levels deep) inside scrollable containers.
- View classes (Activities or Fragments) performing network or database queries directly.
- Overuse of `wrap_content` inside ConstraintLayout where match_constraint (`0dp`) is expected.

## Verification

- [ ] ViewBinding reference is nulled out in `onDestroyView()` for Fragments to prevent leaks.
- [ ] No nested `LinearLayout` weight chains inside scroll views.
- [ ] RecyclerView uses `ListAdapter` + `DiffUtil`.
- [ ] All interactive Views have touch targets of at least 48dp x 48dp.
- [ ] Accessibility warnings are resolved in layout XML files (e.g. contentDescription set).
