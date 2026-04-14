# My Day — Add Task Design

**Date:** 2026-04-14

## Overview

Add the ability to create one-off tasks directly from the My Day view. Tasks are added to the list named "Tasks" with `due_date = today`, and appear immediately in the My Day Today section.

## Store (`src/store/index.ts`)

Extend `addTask` to accept an optional `due_date` parameter:

```ts
addTask: (listId: string, title: string, group?: string | null, due_date?: string) => Promise<Task>
```

- Pass `due_date` through to `dbCreateTask` (which already supports it via `CreateTaskOpts`).
- After the DB write, optimistically update both `tasksByList` and — when `due_date === getTodayString()` — `myDayToday`.
- No reload of My Day required; the task appears instantly.

## My Day view (`src/views/MyDayView.tsx`)

### Today section always rendered

Remove the `myDayToday.length > 0` guard so the Today section always renders. This gives the add input a permanent home even when no today tasks exist.

### Add-task input

- Placed directly under the `<Sun /> Today` section heading.
- Uses the same `add-task` / `add-task-input` CSS classes and UX pattern as `ListView`: a placeholder button that transitions to a focused input on click/focus.
- On mount, resolve the target list: `lists.find(l => l.name === 'Tasks')`. If not found, the input does not render.
- `commitAdd` calls `addTask(tasksListId, title.trim(), null, today)`.
- Submission guard via `submittingRef` (same pattern as ListView) prevents double-submit.
- Blur with empty text dismisses the input without submitting.

## Edge cases

| Scenario | Behaviour |
|---|---|
| No list named "Tasks" found | Input hidden, no crash |
| Double-tap submit | `submittingRef` guard prevents duplicate task |
| Blur with no text | Input closes, nothing submitted |
| Task added | Appears immediately in Today section via optimistic store update |

## Out of scope

- Adding tasks to lists other than "Tasks"
- Setting due time from My Day
- Group assignment from My Day
