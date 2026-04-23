# Habit Time Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users start/stop a timer on any habit and log multiple timed sessions per day, viewable and editable in the task detail panel.

**Architecture:** A new `habit_sessions` IndexedDB store (DB v4) holds sessions independently of completions. The detail panel owns session state locally; it reads/writes via `db/sessions.ts`. A `notifySessionChange` hook in `TaskDetailContext` lets the panel signal `DailyView` to reload the habit list (so the row dot updates while the panel is open).

**Tech Stack:** React 18, TypeScript, IndexedDB (fake-indexeddb in tests), Vitest, @testing-library/react

---

## File Map

| File | Change |
|---|---|
| `src/types.ts` | Add `HabitSession` interface |
| `src/db/client.ts` | Bump `DB_VERSION` → 4, add `habit_sessions` store, update `clearAllLocalData` |
| `src/db/sessions.ts` | **New** — all session DB functions |
| `src/tests/db/sessions.test.ts` | **New** — unit tests for sessions DB layer |
| `src/hooks/useHabits.ts` | Add `hasActiveSession` to `HabitRow`, fetch active sessions in `load` |
| `src/tests/hooks/useHabits.test.ts` | Add `hasActiveSession` tests |
| `src/contexts/TaskDetailContext.tsx` | Add `sessionChangeKey` + `notifySessionChange` |
| `src/views/DailyView.tsx` | Reload on `sessionChangeKey` change |
| `src/components/HabitItem.tsx` | Accept `hasActiveSession` prop, render pulsing dot |
| `src/components/HabitGroupSection.tsx` | Pass `hasActiveSession` through to `HabitItem` |
| `src/app.css` | Styles for timer section, session rows, active dot |
| `src/components/TaskDetailPanel.tsx` | Add Timer section for habit tasks |

---

### Task 1: Add `HabitSession` type and DB schema

**Files:**
- Modify: `src/types.ts`
- Modify: `src/db/client.ts`

- [ ] **Step 1: Add `HabitSession` to `src/types.ts`**

Add after the `HabitCompletion` interface (line 56):

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

- [ ] **Step 2: Bump DB version and add `habit_sessions` store in `src/db/client.ts`**

Change `const DB_VERSION = 3;` to `const DB_VERSION = 4;`.

Add this block after the `// v3` block in `onupgradeneeded`:

```ts
// v4: habit_sessions store
if (oldVersion < 4) {
  const sessions = db.createObjectStore('habit_sessions', { keyPath: 'id' });
  sessions.createIndex('task_id', 'task_id');
  sessions.createIndex('date', 'date');
  sessions.createIndex('task_id_date', ['task_id', 'date']);
}
```

- [ ] **Step 3: Add `habit_sessions` to `clearAllLocalData`**

Update the `clearAllLocalData` function in `src/db/client.ts`. Change the transaction to include `'habit_sessions'` and add a clear call:

```ts
export function clearAllLocalData(): Promise<void> {
  return getDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(['lists', 'tasks', 'habit_completions', 'folders', 'habit_sessions'], 'readwrite');
        tx.objectStore('lists').clear();
        tx.objectStore('tasks').clear();
        tx.objectStore('habit_completions').clear();
        tx.objectStore('folders').clear();
        tx.objectStore('habit_sessions').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}
```

- [ ] **Step 4: Run existing tests to confirm no regressions**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/db/client.ts
git commit -m "feat: add HabitSession type and habit_sessions IDB store (v4)"
```

---

### Task 2: DB layer — `src/db/sessions.ts`

**Files:**
- Create: `src/db/sessions.ts`
- Create: `src/tests/db/sessions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/db/sessions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  startSession,
  stopSession,
  updateSession,
  deleteSession,
  getSessionsForTaskDate,
  getActiveSessionsForDate,
} from '../../db/sessions';
import { createList } from '../../db/lists';
import { createTask } from '../../db/tasks';

describe('startSession', () => {
  it('creates a session with ended_at null', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Meditate');
    const session = await startSession(task.id, '2026-04-23');
    expect(session.task_id).toBe(task.id);
    expect(session.date).toBe('2026-04-23');
    expect(session.ended_at).toBeNull();
    expect(session.deleted_at).toBeNull();
    expect(session.pending_sync).toBe(true);
  });
});

describe('stopSession', () => {
  it('fills in ended_at', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Exercise');
    const session = await startSession(task.id, '2026-04-23');
    const stopped = await stopSession(session.id);
    expect(stopped.id).toBe(session.id);
    expect(stopped.ended_at).not.toBeNull();
    expect(typeof stopped.ended_at).toBe('string');
  });
});

describe('updateSession', () => {
  it('overwrites both timestamps', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Read');
    const session = await startSession(task.id, '2026-04-23');
    const stopped = await stopSession(session.id);
    const newStart = '2026-04-23T08:00:00.000Z';
    const newEnd = '2026-04-23T08:30:00.000Z';
    const updated = await updateSession(stopped.id, newStart, newEnd);
    expect(updated.started_at).toBe(newStart);
    expect(updated.ended_at).toBe(newEnd);
  });
});

describe('deleteSession', () => {
  it('soft-deletes by setting deleted_at', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Yoga');
    const session = await startSession(task.id, '2026-04-23');
    await stopSession(session.id);
    await deleteSession(session.id);
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions).toHaveLength(0);
  });
});

describe('getSessionsForTaskDate', () => {
  it('returns sessions for the given task and date', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Journal');
    await startSession(task.id, '2026-04-23').then(s => stopSession(s.id));
    await startSession(task.id, '2026-04-23').then(s => stopSession(s.id));
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions).toHaveLength(2);
    expect(sessions.every(s => s.task_id === task.id)).toBe(true);
    expect(sessions.every(s => s.date === '2026-04-23')).toBe(true);
  });

  it('excludes sessions for other dates', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Stretch');
    await startSession(task.id, '2026-04-22').then(s => stopSession(s.id));
    await startSession(task.id, '2026-04-23').then(s => stopSession(s.id));
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions).toHaveLength(1);
  });

  it('excludes soft-deleted sessions', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Walk');
    const s = await startSession(task.id, '2026-04-23');
    await stopSession(s.id);
    await deleteSession(s.id);
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions).toHaveLength(0);
  });

  it('returns sessions sorted by started_at ascending', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Run');
    const s1 = await startSession(task.id, '2026-04-23');
    await new Promise(r => setTimeout(r, 5));
    const s2 = await startSession(task.id, '2026-04-23');
    await stopSession(s1.id);
    await stopSession(s2.id);
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions[0].id).toBe(s1.id);
    expect(sessions[1].id).toBe(s2.id);
  });
});

describe('getActiveSessionsForDate', () => {
  it('returns only sessions with ended_at null', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Meditate');
    const active = await startSession(task.id, '2026-04-23');
    const finished = await startSession(task.id, '2026-04-23');
    await stopSession(finished.id);
    const result = await getActiveSessionsForDate('2026-04-23');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(active.id);
  });

  it('excludes soft-deleted active sessions', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Read');
    const s = await startSession(task.id, '2026-04-23');
    await deleteSession(s.id);
    const result = await getActiveSessionsForDate('2026-04-23');
    expect(result).toHaveLength(0);
  });

  it('excludes active sessions from other dates', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Exercise');
    await startSession(task.id, '2026-04-22');
    const result = await getActiveSessionsForDate('2026-04-23');
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/hau5/projects/todo && npx vitest run src/tests/db/sessions.test.ts
```

Expected: FAIL — `Cannot find module '../../db/sessions'`

- [ ] **Step 3: Create `src/db/sessions.ts`**

```ts
import { getDB, req, excludeDeleted } from './client';
import type { HabitSession } from '../types';

export async function startSession(taskId: string, date: string): Promise<HabitSession> {
  const db = await getDB();
  const session: HabitSession = {
    id: crypto.randomUUID(),
    task_id: taskId,
    date,
    started_at: new Date().toISOString(),
    ended_at: null,
    deleted_at: null,
    pending_sync: true,
  };
  await req(db.transaction('habit_sessions', 'readwrite').objectStore('habit_sessions').add(session));
  return session;
}

export async function stopSession(sessionId: string): Promise<HabitSession> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession>(store.get(sessionId));
  const updated: HabitSession = { ...existing, ended_at: new Date().toISOString(), pending_sync: true };
  await req(store.put(updated));
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
  const existing = await req<HabitSession>(store.get(sessionId));
  const updated: HabitSession = { ...existing, started_at: startedAt, ended_at: endedAt, pending_sync: true };
  await req(store.put(updated));
  return updated;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession>(store.get(sessionId));
  await req(store.put({ ...existing, deleted_at: new Date().toISOString(), pending_sync: true }));
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/hau5/projects/todo && npx vitest run src/tests/db/sessions.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/sessions.ts src/tests/db/sessions.test.ts
git commit -m "feat: add habit sessions DB layer with tests"
```

---

### Task 3: Add `hasActiveSession` to `useHabits`

**Files:**
- Modify: `src/hooks/useHabits.ts`
- Modify: `src/tests/hooks/useHabits.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these two tests to the `describe('useHabits')` block in `src/tests/hooks/useHabits.test.ts`:

```ts
import { startSession } from '../../db/sessions';

// Inside describe('useHabits', () => { ... })

it('hasActiveSession is true when a running session exists for today', async () => {
  const list = await dbCreateList('Timer Habits', 'daily');
  const task = await dbCreateTask(list.id, 'Exercise');
  await startSession(task.id, getTodayString());

  const { result } = renderHook(() => useHabits(list.id));
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  const row = result.current.rows.find((r) => r.task.id === task.id);
  expect(row?.hasActiveSession).toBe(true);
});

it('hasActiveSession is false when no active session exists', async () => {
  const list = await dbCreateList('Timer Habits 2', 'daily');
  const task = await dbCreateTask(list.id, 'Read');

  const { result } = renderHook(() => useHabits(list.id));
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  const row = result.current.rows.find((r) => r.task.id === task.id);
  expect(row?.hasActiveSession).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/hau5/projects/todo && npx vitest run src/tests/hooks/useHabits.test.ts
```

Expected: FAIL — `Property 'hasActiveSession' does not exist on type 'HabitRow'`

- [ ] **Step 3: Update `HabitRow` and `load` in `src/hooks/useHabits.ts`**

Replace the entire file:

```ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { getTasksByList } from '../db/tasks';
import { getCompletionsForTask, getTodayCompletions, calculateStreak } from '../db/habits';
import { getActiveSessionsForDate } from '../db/sessions';
import { getTodayString } from '../utils/date';
import type { Task } from '../types';

export interface HabitRow {
  task: Task;
  completedToday: boolean;
  streak: number;
  hasActiveSession: boolean;
}

export function useHabits(listId: string) {
  const [rows, setRows] = useState<HabitRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const today = useMemo(() => getTodayString(), []);
  const cancelledRef = useRef(false);
  const loadGenRef = useRef(0);

  const load = useCallback(async (): Promise<HabitRow[]> => {
    const gen = ++loadGenRef.current;
    try {
      const [tasks, todayCompletions, activeSessions] = await Promise.all([
        getTasksByList(listId),
        getTodayCompletions(today),
        getActiveSessionsForDate(today),
      ]);

      const completedIds = new Set(todayCompletions.map((c) => c.task_id));
      const activeSessionTaskIds = new Set(activeSessions.map((s) => s.task_id));

      const rowsWithStreaks = await Promise.all(
        tasks.map(async (task) => {
          const completions = await getCompletionsForTask(task.id);
          return {
            task,
            completedToday: completedIds.has(task.id),
            streak: calculateStreak(completions, task.id, today),
            hasActiveSession: activeSessionTaskIds.has(task.id),
          };
        })
      );

      if (cancelledRef.current || gen !== loadGenRef.current) return [];
      setRows(rowsWithStreaks);
      return rowsWithStreaks;
    } catch (err) {
      console.error('useHabits load failed', err);
      return [];
    } finally {
      if (!cancelledRef.current && gen === loadGenRef.current) setIsLoading(false);
    }
  }, [listId, today]);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [listId, today]);

  return { rows, isLoading, reload: load, today };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/hau5/projects/todo && npx vitest run src/tests/hooks/useHabits.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useHabits.ts src/tests/hooks/useHabits.test.ts
git commit -m "feat: add hasActiveSession to HabitRow"
```

---

### Task 4: Row dot — `HabitItem`, passthrough, and CSS

**Files:**
- Modify: `src/components/HabitItem.tsx`
- Modify: `src/components/HabitGroupSection.tsx`
- Modify: `src/views/DailyView.tsx`
- Modify: `src/app.css`

- [ ] **Step 1: Add `hasActiveSession` prop and dot to `src/components/HabitItem.tsx`**

Add `hasActiveSession?: boolean` to the `Props` interface and destructure it:

```ts
interface Props {
  id: string;
  title: string;
  note?: string | null;
  completedToday: boolean;
  streak: number;
  hasActiveSession?: boolean;
  onToggle: (id: string) => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const HabitItem = memo(function HabitItem({ id, title, note, completedToday, streak, hasActiveSession, onToggle, onSelect, isSelected }: Props) {
```

In the JSX, add the dot after `habit-item__title-wrap` and before the note span. Insert after the closing `</span>` of `habit-item__title-wrap` (around line 58 in the original file):

```tsx
{hasActiveSession && (
  <span className="habit-item__active-dot" aria-label="Timer running" />
)}
```

- [ ] **Step 2: Add CSS for the dot to `src/app.css`**

Append at the end of the file:

```css
/* ── Habit active session dot ── */
.habit-item__active-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--success) 25%, transparent);
  animation: habit-dot-pulse 1.8s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes habit-dot-pulse {
  0%, 100% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--success) 25%, transparent); }
  50%       { box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 10%, transparent); }
}
```

- [ ] **Step 3: Pass `hasActiveSession` through `HabitGroupSection`**

In `src/components/HabitGroupSection.tsx`, update `HabitRowItem`'s props interface and the `HabitItem` call:

In the `HabitRowItem` function props interface, add `hasActiveSession?: boolean`. Pass it through to `HabitItem`:

```tsx
function HabitRowItem({ row, editMode, onToggle, onSelect, onDelete, isSelected, onReorderStart, onGroupDragStart, dragging }: {
  row: HabitRow; editMode: boolean;
  onToggle: (id: string) => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
  onReorderStart?: (e: React.PointerEvent) => void;
  onGroupDragStart?: (e: React.PointerEvent) => void;
  dragging?: boolean;
}) {
  // ...existing JSX...
  <HabitItem
    id={row.task.id}
    title={row.task.title}
    note={row.task.note}
    completedToday={row.completedToday}
    streak={row.streak}
    hasActiveSession={row.hasActiveSession}
    onToggle={onToggle}
    onSelect={editMode ? undefined : onSelect}
    isSelected={!editMode && isSelected}
  />
```

- [ ] **Step 4: Pass `hasActiveSession` through `DailyView`'s `HabitRow`**

In `src/views/DailyView.tsx`, update the `HabitItem` call in the local `HabitRow` component the same way:

```tsx
<HabitItem
  id={row.task.id}
  title={row.task.title}
  note={row.task.note}
  completedToday={row.completedToday}
  streak={row.streak}
  hasActiveSession={row.hasActiveSession}
  onToggle={onToggle}
  onSelect={editMode ? undefined : onSelect}
  isSelected={!editMode && isSelected}
/>
```

- [ ] **Step 5: Run all tests and confirm no regressions**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/HabitItem.tsx src/components/HabitGroupSection.tsx src/views/DailyView.tsx src/app.css
git commit -m "feat: show pulsing dot on habit row when timer is running"
```

---

### Task 5: Wire `TaskDetailContext` for session change notifications

**Files:**
- Modify: `src/contexts/TaskDetailContext.tsx`
- Modify: `src/views/DailyView.tsx`

- [ ] **Step 1: Add `sessionChangeKey` and `notifySessionChange` to `TaskDetailContext.tsx`**

Replace the entire file:

```tsx
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Task } from '../types';

interface Detail {
  task: Task;
}

interface ContextValue {
  detail: Detail | null;
  open: (d: Detail) => void;
  close: () => void;
  updateTask: (t: Task) => void;
  sessionChangeKey: number;
  notifySessionChange: () => void;
}

const Ctx = createContext<ContextValue | null>(null);

export function TaskDetailProvider({ children }: { children: React.ReactNode }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [sessionChangeKey, setSessionChangeKey] = useState(0);

  const open = useCallback((d: Detail) => setDetail(d), []);
  const close = useCallback(() => setDetail(null), []);
  const updateTask = useCallback((t: Task) => setDetail((prev) => prev ? { ...prev, task: t } : null), []);
  const notifySessionChange = useCallback(() => setSessionChangeKey((k) => k + 1), []);

  const value = useMemo(
    () => ({ detail, open, close, updateTask, sessionChangeKey, notifySessionChange }),
    [detail, open, close, updateTask, sessionChangeKey, notifySessionChange],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskDetail() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTaskDetail must be used within TaskDetailProvider');
  return ctx;
}
```

- [ ] **Step 2: Subscribe to `sessionChangeKey` in `src/views/DailyView.tsx`**

Add this effect inside `DailyView` after the existing effects. First destructure `sessionChangeKey` from `useTaskDetail`:

```ts
const { detail, open: openDetail, close: closeDetail, sessionChangeKey } = useTaskDetail();
```

Then add the effect (after the existing `useEffect` for `prevDetail`):

```ts
useEffect(() => {
  if (sessionChangeKey === 0) return; // skip initial mount
  reload();
}, [sessionChangeKey]);
```

- [ ] **Step 3: Run tests and confirm no regressions**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/TaskDetailContext.tsx src/views/DailyView.tsx
git commit -m "feat: add notifySessionChange to TaskDetailContext for row dot live updates"
```

---

### Task 6: Timer section in `TaskDetailPanel`

**Files:**
- Modify: `src/components/TaskDetailPanel.tsx`
- Modify: `src/app.css`

- [ ] **Step 1: Add helper functions at the top of `TaskDetailPanel.tsx`**

Add these helpers after the existing `formatDueDate` function (after line 39):

```ts
/** Format an ISO timestamp as h:mm (e.g. "9:05", "14:30"). */
function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Elapsed time from startedAt to now, formatted as m:ss or h:mm:ss. */
function formatElapsed(startedAt: string): string {
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Duration of a completed session, formatted as "17m" or "1h 5m". */
function sessionDuration(session: { started_at: string; ended_at: string }): string {
  const secs = Math.floor(
    (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000,
  );
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

/** Convert a local date string ('YYYY-MM-DD') + 'HH:MM' to an ISO timestamp. */
function timeOnDateToISO(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00`).toISOString();
}
```

- [ ] **Step 2: Add new imports to `TaskDetailPanel.tsx`**

Add to the existing import block at the top of the file:

```ts
import { useState as _useState, useEffect as _useEffect, useRef as _useRef } from 'react';
```

Wait — `useState`, `useEffect`, and `useRef` are already imported. Instead, add the new named imports:

```ts
import { getSessionsForTaskDate, startSession, stopSession, updateSession, deleteSession } from '../db/sessions';
import { getTodayString } from '../utils/date';
import type { HabitSession } from '../types';
```

- [ ] **Step 3: Add session state and effects inside `TaskDetailPanel`**

Add these state declarations after the existing state declarations (after line ~63 in the original file):

```ts
const [sessions, setSessions] = useState<HabitSession[]>([]);
const [, setTimerTick] = useState(0);
const [editingField, setEditingField] = useState<{ sessionId: string; field: 'start' | 'end' } | null>(null);
const [fieldInput, setFieldInput] = useState('');
const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
const { notifySessionChange } = useTaskDetail();
```

Add this effect to load sessions when the detail task changes (add after the existing `useEffect` for `calOpen`):

```ts
useEffect(() => {
  if (!detail || !isHabitTask) { setSessions([]); return; }
  getSessionsForTaskDate(detail.task.id, getTodayString()).then(setSessions).catch(console.error);
}, [detail?.task.id, isHabitTask]);
```

Add this effect to tick the clock every second when a session is active:

```ts
useEffect(() => {
  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  const active = sessions.find((s) => s.ended_at === null);
  if (active) {
    timerIntervalRef.current = setInterval(() => setTimerTick((t) => t + 1), 1000);
  } else {
    timerIntervalRef.current = null;
  }
  return () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };
}, [sessions]);
```

- [ ] **Step 4: Add session handler functions inside `TaskDetailPanel`**

Add these functions after `commitNote` (after line ~169 in the original file):

```ts
async function reloadSessions() {
  if (!task) return;
  const fresh = await getSessionsForTaskDate(task.id, getTodayString());
  setSessions(fresh);
  notifySessionChange();
}

async function handleTimerStart() {
  if (!task) return;
  await startSession(task.id, getTodayString());
  await reloadSessions();
}

async function handleTimerStop() {
  const active = sessions.find((s) => s.ended_at === null);
  if (!active) return;
  await stopSession(active.id);
  await reloadSessions();
}

function startEditingField(session: HabitSession, field: 'start' | 'end') {
  const activeSession = sessions.find((s) => s.ended_at === null);
  if (activeSession) return; // no editing while timer running
  setEditingField({ sessionId: session.id, field });
  setFieldInput(formatSessionTime(field === 'start' ? session.started_at : session.ended_at!));
}

async function commitFieldEdit(session: HabitSession) {
  if (!editingField || editingField.sessionId !== session.id) return;
  setEditingField(null);
  const hhmm = parseTimeInput(fieldInput.replace(':', ''));
  if (!hhmm) return;
  const newISO = timeOnDateToISO(session.date, hhmm);
  const newStartedAt = editingField.field === 'start' ? newISO : session.started_at;
  const newEndedAt = editingField.field === 'end' ? newISO : session.ended_at!;
  await updateSession(session.id, newStartedAt, newEndedAt);
  await reloadSessions();
}

async function handleSessionDelete(sessionId: string) {
  await deleteSession(sessionId);
  await reloadSessions();
}
```

- [ ] **Step 5: Add the Timer section JSX inside `TaskDetailPanel`**

Add the Timer section after the Note section's closing `</div>` (after line ~223 in the original file) and before the `{!isHabitTask && (` Schedule section:

```tsx
{/* Timer — habit tasks only */}
{isHabitTask && (() => {
  const activeSession = sessions.find((s) => s.ended_at === null) ?? null;
  return (
    <div className="task-detail-section">
      <span className="task-detail-section__heading">Timer</span>
      <div className="habit-timer">
        <div className="habit-timer__clock">
          <span className={`habit-timer__digits${activeSession ? ' habit-timer__digits--active' : ''}`}>
            {activeSession ? formatElapsed(activeSession.started_at) : '0:00'}
          </span>
          {activeSession ? (
            <button className="habit-timer__stop-btn" onClick={handleTimerStop}>
              <span className="habit-timer__stop-square" /> Stop
            </button>
          ) : (
            <button className="habit-timer__start-btn" onClick={handleTimerStart}>
              <span className="habit-timer__start-tri" /> Start
            </button>
          )}
        </div>
        {sessions.length > 0 && (
          <>
            <span className="habit-timer__sessions-label">Sessions today</span>
            <div className="habit-timer__session-list">
              {sessions.map((s) => {
                const isActive = s.ended_at === null;
                const editStart = editingField?.sessionId === s.id && editingField.field === 'start';
                const editEnd = editingField?.sessionId === s.id && editingField.field === 'end';
                return (
                  <div
                    key={s.id}
                    className={`habit-timer__session-row${isActive ? ' habit-timer__session-row--active' : ''}`}
                  >
                    {editStart ? (
                      <input
                        className="habit-timer__time-input"
                        value={fieldInput}
                        onChange={(e) => setFieldInput(e.target.value)}
                        onBlur={() => commitFieldEdit(s)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`habit-timer__time${isActive ? ' habit-timer__time--active' : ''}`}
                        onClick={() => startEditingField(s, 'start')}
                      >
                        {formatSessionTime(s.started_at)}
                      </span>
                    )}
                    <span className="habit-timer__sep">–</span>
                    {isActive ? (
                      <span className="habit-timer__time habit-timer__time--active">running…</span>
                    ) : editEnd ? (
                      <input
                        className="habit-timer__time-input"
                        value={fieldInput}
                        onChange={(e) => setFieldInput(e.target.value)}
                        onBlur={() => commitFieldEdit(s)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="habit-timer__time"
                        onClick={() => startEditingField(s, 'end')}
                      >
                        {formatSessionTime(s.ended_at!)}
                      </span>
                    )}
                    <span className="habit-timer__duration">
                      {isActive ? formatElapsed(s.started_at) : sessionDuration(s as { started_at: string; ended_at: string })}
                    </span>
                    {!isActive && !activeSession && (
                      <button
                        className="habit-timer__delete"
                        onClick={() => handleSessionDelete(s.id)}
                        title="Delete session"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
})()}
```

- [ ] **Step 6: Add timer CSS to `src/app.css`**

Append at the end of the file (after the dot pulse rules added in Task 4):

```css
/* ── Habit timer section ── */
.habit-timer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.habit-timer__clock {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.habit-timer__digits {
  font-size: 2rem;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
  color: var(--fg-muted);
  transition: color 0.2s;
}

.habit-timer__digits--active { color: var(--success); }

.habit-timer__start-btn,
.habit-timer__stop-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  font-weight: 500;
  min-height: var(--touch-size);
  transition: background 0.15s, border-color 0.15s;
}

.habit-timer__start-btn {
  background: var(--hover);
  border: 1px solid var(--border);
  color: var(--fg);
}

.habit-timer__stop-btn {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 35%, transparent);
  color: var(--success);
}

.habit-timer__stop-square {
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 1px;
  flex-shrink: 0;
}

.habit-timer__start-tri {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid currentColor;
  flex-shrink: 0;
}

.habit-timer__sessions-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
}

.habit-timer__session-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.habit-timer__session-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 7px;
  font-size: 0.8rem;
  transition: background 0.12s;
}

.habit-timer__session-row:hover { background: var(--hover); }

.habit-timer__session-row--active { opacity: 0.8; }

.habit-timer__time {
  font-variant-numeric: tabular-nums;
  color: var(--fg);
  cursor: text;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color 0.12s, background 0.12s;
  white-space: nowrap;
}

.habit-timer__session-row:hover .habit-timer__time:not(.habit-timer__time--active) {
  border-color: var(--border);
}

.habit-timer__time--active {
  color: var(--success);
  cursor: default;
}

.habit-timer__sep {
  color: var(--fg-muted);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.habit-timer__duration {
  margin-left: auto;
  color: var(--fg-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.habit-timer__delete {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: none;
  border: none;
  color: var(--fg-muted);
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s, color 0.1s;
  flex-shrink: 0;
}

.habit-timer__session-row:hover .habit-timer__delete { opacity: 1; }
.habit-timer__delete:hover { color: var(--danger); }

.habit-timer__time-input {
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  font-family: inherit;
  background: var(--surface);
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 4px;
  padding: 2px 6px;
  width: 54px;
  text-align: center;
  outline: none;
}
```

- [ ] **Step 7: Run all tests and confirm no regressions**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 8: Build to confirm no TypeScript errors**

```bash
cd /home/hau5/projects/todo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/TaskDetailPanel.tsx src/app.css
git commit -m "feat: add timer section to habit detail panel"
```
