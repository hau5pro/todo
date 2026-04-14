# Changelog

## [1.0.0] — 2026-04-14

### Core

- Offline-first architecture using IndexedDB; no account required
- Optional Supabase sync with Google OAuth — push/pull diffs on demand
- PWA support — installable on desktop and mobile
- Persistent My Day items until end of day

### Tasks

- Create, complete, reorder, and delete tasks across multiple lists
- General, cyclical, and shopping list types with a shared list router
- Soft-delete tasks when their parent list is deleted
- Add tasks directly from My Day, targeting the Tasks list with today's due date
- Add-task input stays focused after Enter for rapid entry
- Optional due date and scheduled time per task

### Task detail panel

- Side panel with note field, due date, scheduled time, and group assignment
- Note persists to DB and syncs; displayed inline in list view (truncated)
- Click outside to close on desktop
- Full keyboard tab order including textarea

### Habits

- Daily habits view with recurrence picker (interval + unit)
- Habit completions with streak calculation
- Habit groups with drag-and-drop reordering across groups
- Habit groups shown in My Day
- Inline note displayed to the right of habit title in list view
- Template view with duplicate action

### My Day

- Dedicated view with overdue, today, and habits sections
- Habit groups rendered with separators
- New tasks prepended so the latest always appears first
- Tasks sorted by updated_at as a tiebreaker for consistent order across reloads

### Lists & folders

- Icon picker (86 icons) for user-created lists
- Folder view with rename, delete, duplicate, and add-list actions
- Folder rename inline in FolderView
- Semantic icons for pinned lists

### Drag & drop

- Pointer-based drag with live line indicator across all views (tasks, habits, sidebar, folders)
- Cross-group drag in ListView and DailyView
- Edit-mode pill treatment consistent across task, habit, and folder-list views

### Animations

- Task enter/exit animations in ungrouped and grouped sections
- Task entry into completed section
- Add-task input open/close
- Detail panel backdrop fade on close

### Keyboard & accessibility

- Full keyboard navigation with focus traps
- Annotated layout diagram in help section
- iOS PWA focus workarounds for always-mounted inputs

### Performance

- TaskItem and HabitItem wrapped in React.memo
- Memoized sorted task lists and stable toggle callbacks in list hot paths
- Stable toggle callbacks via useCallback in ListView and DailyView
- SettingsContext value memoized to prevent unnecessary consumer re-renders

### Other

- Haptic feedback on supported devices
- Install instructions hidden if app is already installed
