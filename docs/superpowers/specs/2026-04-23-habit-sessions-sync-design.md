# Habit Sessions Sync

**Date:** 2026-04-23
**Status:** Approved

## Overview

Extend the existing Supabase sync layer to include `habit_sessions`. Sessions are mutable records (start time, end time, and soft-delete can all change after creation), so they require an `updated_at` timestamp field to support incremental pull filtering — the same approach used by `lists`, `tasks`, and `folders`.

---

## Type Change — `src/types.ts`

Add `updated_at: string` to `HabitSession`:

```ts
export interface HabitSession {
  id: string;
  task_id: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  deleted_at: string | null;
  updated_at: string;       // ← new
  pending_sync: boolean;
}
```

---

## DB Layer — `src/db/sessions.ts`

Four write functions (`startSession`, `stopSession`, `updateSession`, `deleteSession`) each need two additions:

1. Set `updated_at: new Date().toISOString()` on the record being written.
2. Call `requestSync()` after the write.

Read functions (`getSessionsForTaskDate`, `getActiveSessionsForDate`) are unchanged.

---

## Sync — `src/db/sync.ts`

### `pushPending`

Add a `habit_sessions` block after the existing `habit_completions` block. Same pattern: fetch all, filter by `pending_sync`, upsert via `toRemote()`, clear flag on success.

Push order: folders → lists → tasks → habit_completions → habit_sessions. Sessions are last because they have a foreign key on `tasks.id`.

### `pullFromSupabase`

Add `'habit_sessions'` to the table loop. Filter field is `updated_at`. Conflict resolution is last-write-wins on `updated_at` — same as lists/tasks/folders.

The `filterField` lookup in the loop currently special-cases `habit_completions` to use `created_at`. `habit_sessions` uses `updated_at` (the default), so no new special case is needed.

### `deleteAllCloudData`

Add `'habit_sessions'` before `'habit_completions'` in the tables array. Deletion order: habit_sessions → habit_completions → tasks → lists → folders → user_settings.

---

## Pending Count — `src/hooks/useSync.ts`

Add `habit_sessions` to the parallel fetch in `countPending`:

```ts
const [lists, tasks, habits, sessions] = await Promise.all([
  req<List[]>(db.transaction('lists').objectStore('lists').getAll()),
  req<Task[]>(db.transaction('tasks').objectStore('tasks').getAll()),
  req<HabitCompletion[]>(db.transaction('habit_completions').objectStore('habit_completions').getAll()),
  req<HabitSession[]>(db.transaction('habit_sessions').objectStore('habit_sessions').getAll()),
]);
return (
  lists.filter((l) => l.pending_sync).length +
  tasks.filter((t) => t.pending_sync).length +
  habits.filter((h) => h.pending_sync).length +
  sessions.filter((s) => s.pending_sync).length
);
```

---

## Migration — `supabase/migrations/20260423000000_add_habit_sessions.sql`

Update in place (not yet applied to remote). Add `updated_at TIMESTAMPTZ NOT NULL` column.

---

## Tests

### `src/tests/db/sync.test.ts`

- `pushPending`: upserts pending sessions; clears `pending_sync` after success.
- `pullFromSupabase`: merges remote sessions into IDB; uses `updated_at` filter field for `habit_sessions`.
- `deleteAllCloudData`: `habit_sessions` is included in the delete calls.

### `src/tests/db/sessions.test.ts`

- `startSession`, `stopSession`, `updateSession`, `deleteSession` each call `requestSync()`.
- `startSession`, `stopSession`, `updateSession`, `deleteSession` each set `updated_at` on the written record.

---

## Files Changed

| File | Change |
|---|---|
| `src/types.ts` | Add `updated_at` to `HabitSession` |
| `src/db/sessions.ts` | Set `updated_at`, call `requestSync()` in all write functions |
| `src/db/sync.ts` | Add `habit_sessions` to `pushPending`, `pullFromSupabase`, `deleteAllCloudData` |
| `src/hooks/useSync.ts` | Add `habit_sessions` to `countPending` |
| `src/tests/db/sync.test.ts` | New tests for sessions push/pull/delete |
| `src/tests/db/sessions.test.ts` | Tests for `updated_at` and `requestSync()` calls |
| `supabase/migrations/20260423000000_add_habit_sessions.sql` | Add `updated_at` column |

---

## Out of Scope

- Real-time subscriptions / Supabase Realtime for sessions
- Conflict resolution beyond last-write-wins
- Syncing sessions for past days (sessions are already local-only for past days by UI design)
