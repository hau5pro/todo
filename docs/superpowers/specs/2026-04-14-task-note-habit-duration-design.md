# Task Note Field + Habit Duration Display

**Date:** 2026-04-14
**Status:** Approved

## Overview

Add a `note` field to all tasks. For habits (tasks in `daily`-type lists), the note displays inline beside the title in the habit list view, truncated to one line in muted text. For all other tasks, the note is accessible only via the task detail panel.

## Data Model

Add `note: string | null` to the `Task` interface in `src/types.ts`. Defaults to `null`.

```ts
note: string | null;
```

## Database Migration

- Bump `DB_VERSION` from `2` to `3` in `src/db/client.ts`
- Add `oldVersion < 3` block in `onupgradeneeded`:
  - Open a readwrite cursor on the `tasks` object store
  - For each record missing `note`, put it back with `note: null`
- No new indexes needed — `note` is not queried by index

## DB Read/Write (`src/db/tasks.ts`)

All task read and write operations already serialize/deserialize the full task object. Pass `note` through in any place that constructs a task object explicitly (e.g. mapping rows). No structural changes to queries needed.

## Sync (`src/sync/`)

The Supabase sync layer serializes the full task object. The `note` field will be included automatically once added to the type. The Supabase `tasks` table requires a `note text` column (nullable) — this is a backend/infra change outside the scope of this implementation.

## TaskDetailPanel (`src/components/TaskDetailPanel.tsx`)

Add a `<textarea>` for `note` below the existing fields, visible for all task types. Save on change with the same debounce pattern used by other fields in the panel. Label: `"Note"`.

## HabitItem (`src/components/HabitItem.tsx`)

Add `note: string | null` to `Props`. When `note` is present, render a second `<span>` below the title:

```tsx
{note && (
  <span className="habit-item__note">{note}</span>
)}
```

**Styling** (`habit-item__note`):
- Color: muted (e.g. `var(--text-muted)` or reduced opacity)
- Font size: slightly smaller than title
- `display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden`

## Data Threading

`note` is on `row.task` (a `Task` object), so it flows naturally:

```
HabitGroupSection → HabitRowItem → HabitItem (props.note = row.task.note)
```

No changes needed to `HabitRow` or `useHabits` — `task` is already the full `Task` object.

## Out of Scope

- Supabase schema migration (add `note text` column to `tasks` table)
- Note display in `ListView` task rows (non-habit tasks)
- Note search/filtering
