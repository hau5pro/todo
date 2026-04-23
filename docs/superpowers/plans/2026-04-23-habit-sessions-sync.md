# Habit Sessions Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Supabase sync layer to push, pull, and delete `habit_sessions` records, mirroring the pattern used by every other synced table.

**Architecture:** `HabitSession` gains an `updated_at` field (needed for incremental pull filtering since sessions are mutable). Each write function in `sessions.ts` sets `updated_at` and calls `requestSync()`. `sync.ts` and `useSync.ts` are extended with habit_sessions blocks following the exact same patterns as `lists`, `tasks`, `folders`, and `habit_completions`. The Supabase migration is updated in-place (not yet applied to remote).

**Tech Stack:** TypeScript, IndexedDB via `src/db/client.ts`, Supabase via `@supabase/supabase-js`, Vitest + fake-indexeddb for tests.

---

## File Map

| File | Change |
|---|---|
| `src/types.ts` | Add `updated_at: string` to `HabitSession` |
| `src/db/sessions.ts` | Set `updated_at`, call `requestSync()` in all four write functions |
| `src/db/sync.ts` | Add `habit_sessions` to `pushPending`, `pullFromSupabase`, `deleteAllCloudData` |
| `src/hooks/useSync.ts` | Add `habit_sessions` to `countPending` |
| `src/tests/db/sessions.test.ts` | Add `updated_at` and `requestSync` tests |
| `src/tests/db/sync.test.ts` | Add push/pull/delete tests for sessions; update filter-field and delete table-list tests |
| `supabase/migrations/20260423000000_add_habit_sessions.sql` | Add `updated_at` column (edit in place — not yet applied to remote) |

---

### Task 1: Add `updated_at` to `HabitSession` and update write functions

**Files:**
- Modify: `src/types.ts`
- Modify: `src/db/sessions.ts`
- Modify: `src/tests/db/sessions.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/tests/db/sessions.test.ts`. The import line and mock go at the top of the file, the `beforeEach` and new `it` blocks go inside the existing `describe` blocks.

```ts
// At the top of the file, update the vitest import and add the mock:
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestSync } from '../../sync/orchestrator';

vi.mock('../../sync/orchestrator', () => ({ requestSync: vi.fn() }));

// After the existing imports, add a top-level beforeEach to clear mock state:
beforeEach(() => {
  vi.clearAllMocks();
});
```

Then add these `it` blocks inside each existing `describe`:

```ts
// Inside describe('startSession'):
it('sets updated_at as a valid ISO timestamp', async () => {
  const list = await createList('Habits', 'daily');
  const task = await createTask(list.id, 'Meditate');
  const session = await startSession(task.id, '2026-04-23');
  expect(typeof session.updated_at).toBe('string');
  expect(Number.isNaN(new Date(session.updated_at).getTime())).toBe(false);
});
it('calls requestSync', async () => {
  const list = await createList('Habits', 'daily');
  const task = await createTask(list.id, 'Meditate');
  await startSession(task.id, '2026-04-23');
  expect(requestSync).toHaveBeenCalledTimes(1);
});

// Inside describe('stopSession'):
it('sets updated_at on stop', async () => {
  const list = await createList('Habits', 'daily');
  const task = await createTask(list.id, 'Exercise');
  const session = await startSession(task.id, '2026-04-23');
  const stopped = await stopSession(session.id);
  expect(typeof stopped.updated_at).toBe('string');
  expect(Number.isNaN(new Date(stopped.updated_at).getTime())).toBe(false);
});
it('calls requestSync', async () => {
  const list = await createList('Habits', 'daily');
  const task = await createTask(list.id, 'Exercise');
  const session = await startSession(task.id, '2026-04-23');
  vi.clearAllMocks();
  await stopSession(session.id);
  expect(requestSync).toHaveBeenCalledTimes(1);
});

// Inside describe('updateSession'):
it('sets updated_at on update', async () => {
  const list = await createList('Habits', 'daily');
  const task = await createTask(list.id, 'Read');
  const session = await startSession(task.id, '2026-04-23');
  const stopped = await stopSession(session.id);
  const result = await updateSession(stopped.id, '2026-04-23T08:00:00.000Z', '2026-04-23T08:30:00.000Z');
  expect(typeof result.updated_at).toBe('string');
  expect(Number.isNaN(new Date(result.updated_at).getTime())).toBe(false);
});
it('calls requestSync', async () => {
  const list = await createList('Habits', 'daily');
  const task = await createTask(list.id, 'Read');
  const session = await startSession(task.id, '2026-04-23');
  const stopped = await stopSession(session.id);
  vi.clearAllMocks();
  await updateSession(stopped.id, '2026-04-23T08:00:00.000Z', '2026-04-23T08:30:00.000Z');
  expect(requestSync).toHaveBeenCalledTimes(1);
});

// Inside describe('deleteSession'):
it('calls requestSync', async () => {
  const list = await createList('Habits', 'daily');
  const task = await createTask(list.id, 'Yoga');
  const session = await startSession(task.id, '2026-04-23');
  await stopSession(session.id);
  vi.clearAllMocks();
  await deleteSession(session.id);
  expect(requestSync).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run src/tests/db/sessions.test.ts
```

Expected: failures on the new `it` blocks (no `updated_at` field, `requestSync` not imported/called yet).

- [ ] **Step 3: Add `updated_at` to `HabitSession` in `src/types.ts`**

```ts
export interface HabitSession {
  id: string;
  task_id: string;
  date: string;         // 'YYYY-MM-DD' — local date the session was started
  started_at: string;   // ISO timestamp
  ended_at: string | null;  // null while running
  deleted_at: string | null;
  updated_at: string;   // ISO timestamp — set on every write
  pending_sync: boolean;
}
```

- [ ] **Step 4: Rewrite `src/db/sessions.ts`**

```ts
import { getDB, req, excludeDeleted } from './client';
import { requestSync } from '../sync/orchestrator';
import type { HabitSession } from '../types';

export async function startSession(taskId: string, date: string): Promise<HabitSession> {
  const db = await getDB();
  const now = new Date().toISOString();
  const session: HabitSession = {
    id: crypto.randomUUID(),
    task_id: taskId,
    date,
    started_at: now,
    ended_at: null,
    deleted_at: null,
    updated_at: now,
    pending_sync: true,
  };
  await req(db.transaction('habit_sessions', 'readwrite').objectStore('habit_sessions').add(session));
  requestSync();
  return session;
}

export async function stopSession(sessionId: string): Promise<HabitSession> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession | undefined>(store.get(sessionId));
  if (!existing) throw new Error(`Session not found: ${sessionId}`);
  const now = new Date().toISOString();
  const updated: HabitSession = { ...existing, ended_at: now, updated_at: now, pending_sync: true };
  await req(store.put(updated));
  requestSync();
  return updated;
}

export async function updateSession(
  sessionId: string,
  startedAt: string,
  endedAt: string,
): Promise<HabitSession> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession | undefined>(store.get(sessionId));
  if (!existing) throw new Error(`Session not found: ${sessionId}`);
  const updated: HabitSession = {
    ...existing,
    started_at: startedAt,
    ended_at: endedAt,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  };
  await req(store.put(updated));
  requestSync();
  return updated;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession | undefined>(store.get(sessionId));
  if (!existing) throw new Error(`Session not found: ${sessionId}`);
  const now = new Date().toISOString();
  await req(store.put({ ...existing, deleted_at: now, updated_at: now, pending_sync: true }));
  requestSync();
}

export async function getSessionsForTaskDate(taskId: string, date: string): Promise<HabitSession[]> {
  const db = await getDB();
  const all = await req<HabitSession[]>(
    db
      .transaction('habit_sessions')
      .objectStore('habit_sessions')
      .index('task_id_date')
      .getAll([taskId, date]),
  );
  return excludeDeleted(all).sort((a, b) => a.started_at.localeCompare(b.started_at));
}

export async function getActiveSessionsForDate(date: string): Promise<HabitSession[]> {
  const db = await getDB();
  const all = await req<HabitSession[]>(
    db.transaction('habit_sessions').objectStore('habit_sessions').index('date').getAll(date),
  );
  return all.filter((s) => s.ended_at === null && s.deleted_at === null);
}
```

- [ ] **Step 5: Run the tests — all should pass**

```bash
npx vitest run src/tests/db/sessions.test.ts
```

Expected: all tests pass (including the 8 new ones).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/db/sessions.ts src/tests/db/sessions.test.ts
git commit -m "feat: add updated_at to HabitSession and call requestSync in write functions"
```

---

### Task 2: Extend `pushPending` for habit_sessions

**Files:**
- Modify: `src/db/sync.ts`
- Modify: `src/tests/db/sync.test.ts`

- [ ] **Step 1: Write the failing push tests**

Add to the `describe('pushPending')` block in `src/tests/db/sync.test.ts`.

First, add imports at the top of the file:

```ts
import { startSession } from '../../db/sessions';
import type { HabitSession } from '../../types';
```

Then add inside `describe('pushPending')`:

```ts
it('upserts pending sessions to Supabase', async () => {
  const list = await createList('Habits', 'daily');
  const task = await createTask(list.id, 'Exercise');
  const session = await startSession(task.id, '2026-04-23');
  const mockSupa = makeMockSupabase();
  await pushPending(await getDB(), mockSupa as never, 'user-123');
  expect(mockSupa.from).toHaveBeenCalledWith('habit_sessions');
  expect(mockSupa._upsertMock).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ id: session.id, user_id: 'user-123' })]),
    expect.any(Object)
  );
});

it('clears pending_sync on sessions after successful upsert', async () => {
  const list = await createList('Habits', 'daily');
  const task = await createTask(list.id, 'Exercise');
  await startSession(task.id, '2026-04-23');
  const mockSupa = makeMockSupabase();
  const db = await getDB();
  await pushPending(db, mockSupa as never, 'user-123');
  const all = await req<HabitSession[]>(
    db.transaction('habit_sessions').objectStore('habit_sessions').getAll()
  );
  expect(all.every((s) => s.pending_sync === false)).toBe(true);
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/tests/db/sync.test.ts
```

Expected: the two new tests fail — `habit_sessions` is not yet handled in `pushPending`.

- [ ] **Step 3: Add `habit_sessions` block to `pushPending` in `src/db/sync.ts`**

Update the import line at the top:

```ts
import type { List, ListFolder, Task, HabitCompletion, HabitSession } from '../types';
```

Add the following block inside `pushPending`, after the `habit_completions` block and before `if (errors.length > 0)`:

```ts
  // Habit sessions
  const allSessions = await req<HabitSession[]>(
    db.transaction('habit_sessions').objectStore('habit_sessions').getAll()
  );
  const pendingSessions = allSessions.filter((s) => s.pending_sync);
  if (pendingSessions.length > 0) {
    const { error } = await supabase
      .from('habit_sessions')
      .upsert(pendingSessions.map((s) => toRemote(s, userId)), { onConflict: 'id' });
    if (error) {
      errors.push(`habit_sessions: ${error.message}`);
    } else {
      const tx = db.transaction('habit_sessions', 'readwrite');
      const store = tx.objectStore('habit_sessions');
      await Promise.all(
        pendingSessions.map((s) => req(store.put({ ...s, pending_sync: false })))
      );
    }
  }
```

- [ ] **Step 4: Run the tests — all should pass**

```bash
npx vitest run src/tests/db/sync.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/sync.ts src/tests/db/sync.test.ts
git commit -m "feat: push pending habit_sessions to Supabase"
```

---

### Task 3: Extend `pullFromSupabase` for habit_sessions

**Files:**
- Modify: `src/db/sync.ts`
- Modify: `src/tests/db/sync.test.ts`

- [ ] **Step 1: Write the failing pull tests**

Update the existing filter-field test inside `describe('pullFromSupabase')` to also assert `habit_sessions` uses `updated_at`. Replace the existing test named `'uses created_at filter for habit_completions and updated_at for lists/tasks'` with:

```ts
it('uses updated_at filter for all tables except habit_completions which uses created_at', async () => {
  const mockSupa = makePullMockSupabase({});
  const db = await getDB();
  await pullFromSupabase(db, mockSupa as never);

  expect(mockSupa._gtSpies['lists']).toHaveBeenCalledWith('updated_at', expect.any(String));
  expect(mockSupa._gtSpies['tasks']).toHaveBeenCalledWith('updated_at', expect.any(String));
  expect(mockSupa._gtSpies['habit_completions']).toHaveBeenCalledWith('created_at', expect.any(String));
  expect(mockSupa._gtSpies['habit_sessions']).toHaveBeenCalledWith('updated_at', expect.any(String));
});
```

Also add a new test that verifies remote sessions are written to IDB:

```ts
it('merges remote sessions into IDB with pending_sync: false and without user_id', async () => {
  const remoteSession = {
    id: 'remote-session-1',
    task_id: 'task-abc',
    date: '2026-04-23',
    started_at: '2026-04-23T09:00:00.000Z',
    ended_at: '2026-04-23T09:30:00.000Z',
    deleted_at: null,
    updated_at: '2026-04-23T09:30:00.000Z',
    user_id: 'user-abc',
  };
  const mockSupa = makePullMockSupabase({ habit_sessions: [remoteSession] });
  const db = await getDB();
  await pullFromSupabase(db, mockSupa as never);
  const all = await req<HabitSession[]>(
    db.transaction('habit_sessions').objectStore('habit_sessions').getAll()
  );
  const stored = all.find((s) => s.id === 'remote-session-1');
  expect(stored).toBeDefined();
  expect(stored!.pending_sync).toBe(false);
  expect((stored as unknown as Record<string, unknown>).user_id).toBeUndefined();
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/tests/db/sync.test.ts
```

Expected: the filter-field test and the new merge test fail — `habit_sessions` not in pull loop yet.

- [ ] **Step 3: Update `pullFromSupabase` in `src/db/sync.ts`**

Change the table loop line from:

```ts
for (const table of ['folders', 'lists', 'tasks', 'habit_completions'] as const) {
```

to:

```ts
for (const table of ['folders', 'lists', 'tasks', 'habit_completions', 'habit_sessions'] as const) {
```

Update the local record type and localTime resolution inside the loop:

```ts
    const local = await req<ListFolder | List | Task | HabitCompletion | HabitSession | undefined>(store.get(remote.id));
    const remoteTime = remote.updated_at ?? remote.created_at;
    const localTime = local
      ? table === 'habit_completions'
        ? (local as HabitCompletion).created_at
        : (local as ListFolder | List | Task | HabitSession).updated_at
      : null;
```

(`HabitSession` is already imported after Task 2.)

- [ ] **Step 4: Run the tests — all should pass**

```bash
npx vitest run src/tests/db/sync.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/sync.ts src/tests/db/sync.test.ts
git commit -m "feat: pull habit_sessions from Supabase on sync"
```

---

### Task 4: `deleteAllCloudData`, `countPending`, and migration

**Files:**
- Modify: `src/db/sync.ts`
- Modify: `src/hooks/useSync.ts`
- Modify: `supabase/migrations/20260423000000_add_habit_sessions.sql`
- Modify: `src/tests/db/sync.test.ts`

- [ ] **Step 1: Update the `deleteAllCloudData` test to include `habit_sessions`**

In `src/tests/db/sync.test.ts`, inside `describe('deleteAllCloudData')`, replace the existing `'calls delete().eq() on every table'` test with:

```ts
it('calls delete().eq() on every table', async () => {
  const mockSupa = makeDeleteMockSupabase();
  await deleteAllCloudData(mockSupa as never, 'user-abc');
  const tables = ['habit_sessions', 'habit_completions', 'tasks', 'lists', 'folders', 'user_settings'];
  for (const table of tables) {
    expect(mockSupa.from).toHaveBeenCalledWith(table);
  }
  expect(mockSupa._deleteMock).toHaveBeenCalledTimes(tables.length);
});
```

Also update the `'throws if any table returns an error'` test — the deletion order now starts with `habit_sessions`, so the mock sequence shifts:

```ts
it('throws if any table returns an error', async () => {
  const eqMock = vi.fn()
    .mockResolvedValueOnce({ error: null })   // habit_sessions
    .mockResolvedValueOnce({ error: null })   // habit_completions
    .mockResolvedValueOnce({ error: { message: 'permission denied' } }) // tasks
    .mockResolvedValue({ error: null });       // rest
  const mockSupa = {
    from: vi.fn().mockReturnValue({ delete: vi.fn().mockReturnValue({ eq: eqMock }) }),
  };
  await expect(deleteAllCloudData(mockSupa as never, 'user-abc')).rejects.toThrow('tasks: permission denied');
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/tests/db/sync.test.ts
```

Expected: `'calls delete().eq() on every table'` fails (wrong count) and `'throws if any table returns an error'` fails (wrong error message — currently expects `tasks` error but `habit_sessions` is first now).

- [ ] **Step 3: Update `deleteAllCloudData` in `src/db/sync.ts`**

Change the tables array from:

```ts
  const tables = ['habit_completions', 'tasks', 'lists', 'folders', 'user_settings'] as const;
```

to:

```ts
  const tables = ['habit_sessions', 'habit_completions', 'tasks', 'lists', 'folders', 'user_settings'] as const;
```

- [ ] **Step 4: Run sync tests — all should pass**

```bash
npx vitest run src/tests/db/sync.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Update `countPending` in `src/hooks/useSync.ts`**

Update the import line at the top of the file:

```ts
import type { List, Task, HabitCompletion, HabitSession } from '../types';
```

Replace the `countPending` function:

```ts
async function countPending(): Promise<number> {
  const db = await getDB();
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
}
```

- [ ] **Step 6: Update the Supabase migration**

Replace `supabase/migrations/20260423000000_add_habit_sessions.sql` with:

```sql
-- Add habit_sessions table for time logging against habit tasks.
-- Sync logic is deferred; this migration creates the schema so the table
-- exists on the remote when sync is eventually implemented.

CREATE TABLE habit_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) NOT NULL,
  date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  pending_sync BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE habit_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habit_sessions" ON habit_sessions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX habit_sessions_task_id_idx ON habit_sessions (task_id);
CREATE INDEX habit_sessions_date_idx ON habit_sessions (date);
CREATE INDEX habit_sessions_task_id_date_idx ON habit_sessions (task_id, date);
```

- [ ] **Step 7: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (250+ passing, no regressions).

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/db/sync.ts src/hooks/useSync.ts supabase/migrations/20260423000000_add_habit_sessions.sql src/tests/db/sync.test.ts
git commit -m "feat: extend sync layer for habit_sessions (delete, count, migration)"
```
