# Habit Time Logging

**Date:** 2026-04-23
**Status:** Approved

## Overview

Allow users to log time towards habits using a start/stop timer. Multiple sessions per day are supported. The timer and the completion checkbox are fully independent. Timer controls live in the detail panel; a small pulsing dot on the habit row indicates a running timer.

---

## Data Model

New type added to `src/types.ts`:

```ts
export interface HabitSession {
  id: string;
  task_id: string;
  date: string;         // 'YYYY-MM-DD' — local date the session was started
  started_at: string;   // ISO timestamp
  ended_at: string | null;  // null while running
  deleted_at: string | null;
  pending_sync: boolean;
}
```

---

## Database Schema

DB version bumps from 3 → 4. New `habit_sessions` object store:

- **Primary key:** `id`
- **Index `task_id`:** look up all sessions for a habit
- **Index `date`:** look up all sessions on a given day
- **Index `task_id_date`:** look up sessions for a specific habit on a specific day (non-unique — multiple sessions per day allowed)

Migration in `onupgradeneeded`: create the store and indexes when `oldVersion < 4`.

---

## DB Layer — `src/db/sessions.ts`

Six functions:

| Function | Description |
|---|---|
| `startSession(taskId, date)` | Create a new record with `ended_at: null`. Returns the new session. |
| `stopSession(sessionId)` | Fill in `ended_at` with the current timestamp. Returns the updated session. |
| `updateSession(sessionId, startedAt, endedAt)` | Overwrite both timestamps (for inline editing). Returns the updated session. |
| `deleteSession(sessionId)` | Soft-delete by setting `deleted_at`. |
| `getSessionsForTaskDate(taskId, date)` | All non-deleted sessions for a habit on a given day, sorted by `started_at`. |
| `getActiveSessionsForDate(date)` | All sessions with `ended_at: null` and `deleted_at: null` for a given day (used to populate row dots). |

---

## Hook Changes — `src/hooks/useHabits.ts`

`HabitRow` gains one new field:

```ts
export interface HabitRow {
  task: Task;
  completedToday: boolean;
  streak: number;
  hasActiveSession: boolean;  // true if a session with ended_at: null exists today
}
```

In the `load` function, `getActiveSessionsForDate(today)` is called alongside the existing `getTodayCompletions(today)` — a single parallel fetch. Each row sets `hasActiveSession` from the resulting set of active task IDs. No per-habit async calls needed.

---

## UI — Habit Row Dot

`HabitItem` receives a new optional `hasActiveSession?: boolean` prop. When true, a small pulsing green dot is rendered inline after the title, before the streak flame. Implemented with a CSS `@keyframes` pulse animation on `box-shadow`.

The dot is absent when the timer is not running — rows stay clean by default.

---

## UI — Detail Panel Timer Section

Shown only for habit tasks (`isHabitTask`). Placed after the Note section.

### Layout

```
[ Timer ]  ← section heading

  12:34                    [ ■ Stop ]
  ── or when idle ──
  0:00                     [ ▶ Start ]

Sessions today
  9:05  –  9:22      17m   ×
  9:41  –  10:15     34m   ×
```

### Behaviour

**When idle:**
- Clock shows `0:00`
- Start button creates a new session via `startSession()`, triggers a reload of sessions
- Each session row has two inline-editable time fields (start, end) — same input pattern as the existing due-time field (tap to focus, blur/Enter to commit via `updateSession()`)
- Each session row has a delete button (soft-delete via `deleteSession()`)

**When running:**
- Clock ticks up via `setInterval`, computed from the active session's `started_at` — accurate even if the panel was closed and reopened mid-session
- Stop button calls `stopSession()` on the active session
- All session rows are dimmed and non-interactive while a timer is running — no editing or deleting until stopped

**State management:**
- The detail panel fetches sessions via `getSessionsForTaskDate(taskId, today)` when it opens and after any start/stop/edit/delete action
- No session state flows through the Zustand store or `useHabits` — the panel manages it locally
- After stop/start, the panel calls back to reload the parent habit list (to update `hasActiveSession` on the row dot)

### Manual correction use case
Since sessions are inline-editable when idle, a user who forgot to start the timer can stop a running session early (or let it run to approximate the end), then tap the start/end times to correct them.

---

## Files Changed

| File | Change |
|---|---|
| `src/types.ts` | Add `HabitSession` interface |
| `src/db/client.ts` | Bump `DB_VERSION` to 4, add `habit_sessions` store + indexes in `onupgradeneeded` |
| `src/db/sessions.ts` | New file — all session DB functions |
| `src/hooks/useHabits.ts` | Add `hasActiveSession` to `HabitRow`, fetch active sessions in `load` |
| `src/components/HabitItem.tsx` | Accept `hasActiveSession` prop, render pulsing dot |
| `src/components/HabitGroupSection.tsx` | Pass `hasActiveSession` through to `HabitItem` |
| `src/views/DailyView.tsx` | Pass `hasActiveSession` through to `HabitItem` |
| `src/components/TaskDetailPanel.tsx` | Add Timer section for habit tasks |
| `src/app.css` | Styles for timer section, session rows, active dot |
| `src/db/client.ts` (`clearAllLocalData`) | Add `habit_sessions` to the clear transaction |

---

## Out of Scope

- Syncing sessions to Supabase (schema + sync logic deferred)
- Logging time for past days (today only)
- Aggregate time stats / history view
