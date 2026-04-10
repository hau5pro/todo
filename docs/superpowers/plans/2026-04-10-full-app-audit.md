# Full App Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Priority-driven audit of the entire TO DO codebase — bugs first, then performance, refactoring, test coverage, and docs — with one commit per logical fix.

**Architecture:** Five sequential phases. Each phase audits a defined set of files, collects findings, then applies fixes atomically. No cross-phase fixes; findings from later phases that belong to an earlier phase are noted in a findings list and handled in a follow-up.

**Tech Stack:** React 18 + TypeScript + Vite, Zustand, IndexedDB, Supabase, Framer Motion, Vitest

---

## File Map

| File | Phase(s) |
|---|---|
| `src/db/client.ts` | 1, 3 |
| `src/db/tasks.ts` | 1, 3, 4 |
| `src/db/lists.ts` | 1, 3, 4 |
| `src/db/folders.ts` | 1, 3, 4 |
| `src/db/habits.ts` | 1, 3, 4 |
| `src/db/sync.ts` | 1, 3, 4 |
| `src/db/settings.ts` | 1, 3 |
| `src/sync/orchestrator.ts` | 1, 3, 5 |
| `src/store/index.ts` | 1, 2, 3 |
| `src/hooks/*.ts` | 1, 2, 3, 4 |
| `src/views/*.tsx` | 1, 2, 3 |
| `src/components/*.tsx` | 1, 2, 3 |
| `src/utils/*.ts` | 1, 3, 4 |
| `src/contexts/SettingsContext.tsx` | 1, 2, 3 |
| `src/types.ts` | 1, 3 |
| `src/tests/**` | 4 |
| `CLAUDE.md` | 5 |

---

## Phase 1 — Bugs & Correctness

### Task 1: Audit DB layer

**Files to read:**
- `src/db/client.ts`
- `src/db/tasks.ts`
- `src/db/lists.ts`
- `src/db/folders.ts`
- `src/db/habits.ts`
- `src/db/sync.ts`
- `src/db/settings.ts`

- [ ] **Step 1: Read all DB files**

Read each file in full. For each file, check for:
- Promise rejections that are swallowed or unhandled
- Operations that assume a record exists without checking (e.g. `get()` returning `undefined` then accessing properties)
- Missing transaction rollback on failure
- Soft-delete logic not applied consistently (e.g. queries that don't filter `deleted_at`)
- `pending_sync` not set on mutations that should sync
- Type safety: any `as any` casts, non-null assertions (`!`) on values that could be null
- DB version migration logic — does it handle all upgrade paths?
- `sync.ts` specifically: push/pull interleaving, what happens if push throws mid-flight

- [ ] **Step 2: Document findings**

Write a numbered list of confirmed bugs (not "code smells" — actual incorrect behaviour). For each: file, line range, description, severity (crash / data loss / silent wrong).

- [ ] **Step 3: Fix each confirmed bug**

For each finding, apply the minimal fix. Example patterns:

```typescript
// Missing null guard → add guard
const task = await db.get('tasks', id);
if (!task) return; // add this

// Unhandled rejection → wrap
try {
  await db.put('tasks', updated);
} catch (err) {
  console.error('Failed to update task', err);
  throw err; // re-throw so caller knows
}

// deleted_at filter missing → add to query
const tasks = await tx.store.index('list_id').getAll(listId);
return tasks.filter(t => !t.deleted_at); // ensure consistency
```

- [ ] **Step 4: Run tests after each fix**

```bash
cd /home/hau5/projects/todo && npx vitest run
```
Expected: all existing tests pass.

- [ ] **Step 5: Commit each fix atomically**

```bash
git add src/db/<file>.ts
git commit -m "fix: <short description of what was wrong>"
```

---

### Task 2: Audit sync orchestrator

**Files to read:**
- `src/sync/orchestrator.ts`
- `src/hooks/useSync.ts`
- `src/db/sync.ts`

- [ ] **Step 1: Read files**

Check for:
- Race condition between concurrent `requestSync()` calls (debounce doesn't protect against two in-flight pushes)
- What happens if the user goes offline mid-push — are records correctly left as `pending_sync: true`?
- What happens if pull overwrites a local change that hasn't been pushed yet (last-write-wins conflict)
- Error handling: does a failed sync silently stop future syncs?
- `useSync.ts`: are event listeners (`visibilitychange`, `focus`) cleaned up on unmount?

- [ ] **Step 2: Document findings**

Numbered list as before.

- [ ] **Step 3: Fix each confirmed bug**

Example patterns:

```typescript
// Guard against concurrent pushes
let pushing = false;
async function push() {
  if (pushing) return;
  pushing = true;
  try {
    await doPush();
  } finally {
    pushing = false;
  }
}

// Ensure event listeners are cleaned up
useEffect(() => {
  const handler = () => requestSync();
  window.addEventListener('focus', handler);
  return () => window.removeEventListener('focus', handler);
}, []);
```

- [ ] **Step 4: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 5: Commit each fix**

```bash
git add src/sync/orchestrator.ts src/hooks/useSync.ts
git commit -m "fix: <description>"
```

---

### Task 3: Audit store

**Files to read:**
- `src/store/index.ts`

- [ ] **Step 1: Read file**

Check for:
- Store actions that update local state optimistically but don't handle DB failure (if DB throws, state is now inconsistent)
- Actions that call DB ops without `await` (fire-and-forget mutations)
- State slices that can drift from DB truth (e.g. delete from store but not from DB, or vice versa)
- Missing `requestSync()` calls after mutations that should sync
- Any direct state mutation (bypassing Zustand's `set`)
- Selectors that compute derived data inline (should be memoised outside store)

- [ ] **Step 2: Document findings**

- [ ] **Step 3: Fix each confirmed bug**

Example patterns:

```typescript
// Missing await → add it
async deleteTask(id: string) {
  await dbDeleteTask(id); // was missing await
  set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
  requestSync();
}

// Missing requestSync → add it
async updateList(id: string, patch: Partial<List>) {
  const updated = await dbUpdateList(id, patch);
  set(state => ({ lists: state.lists.map(l => l.id === id ? updated : l) }));
  requestSync(); // was missing
}
```

- [ ] **Step 4: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 5: Commit each fix**

```bash
git add src/store/index.ts
git commit -m "fix: <description>"
```

---

### Task 4: Audit hooks

**Files to read:**
- `src/hooks/useBlockEdgeSwipe.ts`
- `src/hooks/useHabits.ts`
- `src/hooks/useKeyboardNav.ts`
- `src/hooks/useLineDrag.ts`
- `src/hooks/useList.ts`
- `src/hooks/useMyDay.ts`
- `src/hooks/useSync.ts`

- [ ] **Step 1: Read all hook files**

Check for:
- Event listeners or timers not cleaned up in `useEffect` return
- Stale closure bugs (using state/props values inside callbacks without proper deps)
- Missing dependency arrays, or deps arrays that are incomplete
- Hooks that call async functions in effects without handling component unmount (leads to "setState on unmounted component")
- `useLineDrag.ts` specifically: DOM refs that could be null being accessed without guards

- [ ] **Step 2: Document findings**

- [ ] **Step 3: Fix each confirmed bug**

Example patterns:

```typescript
// Stale closure → add to deps
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose(); // onClose was missing from deps
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [onClose]); // add onClose

// Unmount guard for async effect
useEffect(() => {
  let cancelled = false;
  async function load() {
    const data = await fetchSomething();
    if (!cancelled) setState(data);
  }
  load();
  return () => { cancelled = true; };
}, []);
```

- [ ] **Step 4: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 5: Commit each fix**

```bash
git add src/hooks/<file>.ts
git commit -m "fix: <description>"
```

---

### Task 5: Audit views and components

**Files to read:**
- `src/views/MyDayView.tsx`
- `src/views/ListView.tsx`
- `src/views/DailyView.tsx`
- `src/views/FolderView.tsx`
- `src/views/SettingsView.tsx`
- `src/views/SetupWizard.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TaskDetailPanel.tsx`
- `src/components/TaskItem.tsx`
- `src/components/HabitItem.tsx`
- `src/components/AnimatedCheckbox.tsx`
- `src/components/CalendarPicker.tsx`
- `src/components/RecurrencePicker.tsx`
- `src/components/SyncDot.tsx`
- `src/components/EditControls.tsx`
- `src/contexts/SettingsContext.tsx`
- `src/contexts/TaskDetailContext.tsx`

- [ ] **Step 1: Read all files**

Check for:
- Edit states not reset on unmount (e.g. `editingListName` still true when component unmounts)
- Mutually exclusive UI states that can both be active (see CLAUDE.md: "One edit state at a time")
- Async operations in event handlers without loading/error states where user could trigger twice
- Missing `key` props in lists, or `key` set to array index (causes wrong re-use)
- `TaskDetailPanel`: panel open for a deleted task — does it handle the task being gone?
- `SetupWizard`: what happens if list creation fails mid-wizard?
- `SettingsView`: danger zone operations — are they guarded against double-click?
- `CalendarPicker` / `RecurrencePicker`: edge cases in date arithmetic

- [ ] **Step 2: Document findings**

- [ ] **Step 3: Fix each confirmed bug**

Example patterns:

```typescript
// Reset edit state on unmount
useEffect(() => {
  return () => {
    setEditingListName(false); // clean up on unmount
  };
}, []);

// Guard against double-submit
const [deleting, setDeleting] = useState(false);
async function handleDelete() {
  if (deleting) return;
  setDeleting(true);
  try {
    await deleteAllData();
  } finally {
    setDeleting(false);
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 5: Commit each fix**

```bash
git add src/views/<file>.tsx  # or src/components/<file>.tsx
git commit -m "fix: <description>"
```

---

### Task 6: Audit utils and types

**Files to read:**
- `src/utils/date.ts`
- `src/utils/dom.ts`
- `src/utils/easing.ts`
- `src/utils/order.ts`
- `src/utils/sound.ts`
- `src/types.ts`

- [ ] **Step 1: Read all files**

Check for:
- Date utilities: timezone assumptions, daylight-saving edge cases, off-by-one in date comparisons
- `order.ts`: `reinsert` function — does it handle out-of-bounds indices, empty arrays, same-position moves?
- `sound.ts`: AudioContext not closed/cleaned up, browser compatibility guard missing
- `dom.ts`: DOM queries that could return null without guards
- `types.ts`: fields marked optional that are always required, or required that are sometimes absent

- [ ] **Step 2: Document findings**

- [ ] **Step 3: Fix each confirmed bug**

- [ ] **Step 4: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 5: Commit each fix**

```bash
git add src/utils/<file>.ts
git commit -m "fix: <description>"
```

---

### Task 7: Phase 1 summary

- [ ] **Step 1: Write brief summary**

List: total bugs found, bugs fixed, anything deferred. Output as a short bullet list in the terminal.

- [ ] **Step 2: Verify all tests pass**

```bash
cd /home/hau5/projects/todo && npx vitest run
```
Expected: all pass.

---

## Phase 2 — Performance

### Task 8: Audit re-renders in components

**Files to read:**
- `src/components/Sidebar.tsx`
- `src/components/TaskItem.tsx`
- `src/components/HabitItem.tsx`
- `src/components/TaskDetailPanel.tsx`
- `src/views/ListView.tsx`
- `src/views/DailyView.tsx`
- `src/views/MyDayView.tsx`
- `src/store/index.ts`

- [ ] **Step 1: Read files, look for render hotspots**

Check for:
- Inline object literals passed as props: `<Comp style={{ margin: 0 }} />` — new object every render
- Inline array literals as props or deps: `<Comp items={[a, b]} />` — new array every render
- Inline arrow functions as props that aren't stable: `<Comp onClick={() => doThing(id)} />`
- `useSelector`-style store subscriptions that return new objects/arrays on every call (e.g. `state => state.tasks.filter(...)` inline)
- Components that receive the entire store slice when they only need one field
- `useMemo`/`useCallback` with missing or wrong deps (doing more work than needed, or not memoising when they should)
- Expensive sorts/filters (e.g. `orderedTasks` computation) run without memoisation
- `React.memo` missing on pure leaf components that render in long lists (TaskItem, HabitItem)

- [ ] **Step 2: Document findings**

List each issue with file + line range. Mark as: "inline literal", "missing memo", "wide subscription", "expensive inline compute".

- [ ] **Step 3: Fix each issue**

Example patterns:

```typescript
// Inline object → move outside or useMemo
// Before:
<motion.div style={{ padding: '0 0.5rem' }}>
// After: move to a constant outside the component
const PANEL_STYLE = { padding: '0 0.5rem' };
<motion.div style={PANEL_STYLE}>

// Inline filter in store subscription → memoize in component
// Before:
const tasks = useAppStore(s => s.tasks.filter(t => t.list_id === listId));
// After:
const allTasks = useAppStore(s => s.tasks);
const tasks = useMemo(() => allTasks.filter(t => t.list_id === listId), [allTasks, listId]);

// Unstable callback prop → useCallback
// Before:
<TaskItem onDelete={() => deleteTask(task.id)} />
// After:
const handleDelete = useCallback(() => deleteTask(task.id), [task.id, deleteTask]);
<TaskItem onDelete={handleDelete} />

// Add React.memo to pure list-item components
export const TaskItem = memo(function TaskItem({ task, ...props }) {
  ...
});
```

- [ ] **Step 4: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 5: Commit each fix**

```bash
git add src/components/<file>.tsx
git commit -m "perf: <description of what was causing re-renders>"
```

---

### Task 9: Audit store selectors and SettingsContext

**Files to read:**
- `src/store/index.ts`
- `src/contexts/SettingsContext.tsx`

- [ ] **Step 1: Read files**

Check for:
- Store state shape: are computed/derived values stored in state (should be derived at use-site with `useMemo`)?
- `SettingsContext`: does the context value object get recreated on every render? (Causes all consumers to re-render)
- Any `useEffect` in context that triggers unnecessarily

- [ ] **Step 2: Document findings**

- [ ] **Step 3: Fix each issue**

Example pattern:

```typescript
// SettingsContext value unstable → memoize
const value = useMemo(() => ({
  theme,
  accent,
  sound,
  // ...all settings
  setTheme,
  setAccent,
}), [theme, accent, sound, setTheme, setAccent]);

return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
```

- [ ] **Step 4: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 5: Commit each fix**

```bash
git add src/store/index.ts src/contexts/SettingsContext.tsx
git commit -m "perf: <description>"
```

---

### Task 10: Phase 2 summary

- [ ] **Step 1: Write brief summary**

List: total perf issues found and fixed.

- [ ] **Step 2: Verify all tests pass**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

---

## Phase 3 — Refactoring

### Task 11: Dead code and unused exports

**Files:** All source files

- [ ] **Step 1: Find unused exports**

```bash
cd /home/hau5/projects/todo && npx tsc --noEmit 2>&1 | grep "declared but"
```

Also manually check:
- Functions/constants exported but not imported anywhere
- Commented-out code blocks
- Feature flags or config values that are always one value
- Imports that are unused (TypeScript should warn, but check)

- [ ] **Step 2: Remove each piece of dead code**

Remove the code. If it's an export used nowhere, delete it. Do not comment it out.

- [ ] **Step 3: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add -p  # stage only dead code removals
git commit -m "refactor: remove dead code — <list what was removed>"
```

---

### Task 12: Duplicated logic

**Files:** All source files (focus on db/, utils/, components/)

- [ ] **Step 1: Read files looking for duplication**

Common patterns to look for:
- The same `filter(t => !t.deleted_at)` repeated across multiple DB functions
- The same date formatting logic in multiple places
- The same "get ordered items from IDs" pattern in multiple hooks/views
- Copy-pasted error handling blocks

- [ ] **Step 2: Extract each duplicated piece into a shared utility**

Example:

```typescript
// src/db/client.ts — add shared filter
export function excludeDeleted<T extends { deleted_at?: string | null }>(records: T[]): T[] {
  return records.filter(r => !r.deleted_at);
}

// Then in tasks.ts, lists.ts, etc.:
import { excludeDeleted } from './client';
return excludeDeleted(await tx.store.getAll());
```

- [ ] **Step 3: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 4: Commit each extraction**

```bash
git add src/db/client.ts src/db/tasks.ts src/db/lists.ts
git commit -m "refactor: extract shared <utility name> to eliminate duplication"
```

---

### Task 13: Overly large files

**Files with >400 lines:**
- `src/components/Sidebar.tsx` (~1112 lines)
- `src/views/ListView.tsx` (~745 lines)
- `src/views/DailyView.tsx` (~528 lines)
- `src/store/index.ts` (~440 lines)

- [ ] **Step 1: Read each large file and identify split boundaries**

For each file, find sub-components or logical sections that have a clear single responsibility and could be extracted. Only split if:
1. The extracted unit has a clear name and purpose
2. The split reduces complexity at the call site (not just moves lines)
3. The extracted unit is self-contained (doesn't need to reach back into the parent's internals)

- [ ] **Step 2: Extract each unit**

Example — Sidebar.tsx has `NavTooltip`, `SortableListRow`, `FolderRow`, `SortableSettingsRow` as internal components. These could move to a `src/components/sidebar/` directory if they're large enough.

For each extraction:
```bash
# Create new file
touch src/components/<NewComponent>.tsx
# Move component definition and its imports
# Update imports in the original file
```

- [ ] **Step 3: Run tests**

```bash
cd /home/hau5/projects/todo && npx vitest run
```

- [ ] **Step 4: Build check**

```bash
cd /home/hau5/projects/todo && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit each extraction**

```bash
git add src/components/<NewComponent>.tsx src/components/Sidebar.tsx
git commit -m "refactor: extract <ComponentName> from Sidebar into its own file"
```

---

### Task 14: Type improvements

**Files:** `src/types.ts`, all files using `any` or non-null assertions

- [ ] **Step 1: Find type issues**

```bash
cd /home/hau5/projects/todo && grep -rn " as any\|: any\|!\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."
```

- [ ] **Step 2: Fix each type issue**

For each `as any` or `!.`:
- If the value genuinely can't be null (proven by logic), add a comment explaining why
- If it could be null, add a proper null guard instead of the `!`
- If `as any` is used to escape type checking, find the correct type

Example:
```typescript
// Before:
const el = document.querySelector('.sidebar') as any;
el.scrollTop = 0;

// After:
const el = document.querySelector('.sidebar');
if (el instanceof HTMLElement) el.scrollTop = 0;
```

- [ ] **Step 3: Run type check**

```bash
cd /home/hau5/projects/todo && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/  # only the type-fixed files
git commit -m "refactor: replace unsafe type assertions with proper guards"
```

---

### Task 15: Phase 3 summary

- [ ] **Step 1: Write brief summary**

List: dead code removed, duplications extracted, files split, type issues fixed.

- [ ] **Step 2: Verify all tests pass and types check**

```bash
cd /home/hau5/projects/todo && npx vitest run && npx tsc --noEmit
```

---

## Phase 4 — Test Coverage

### Task 16: Audit existing test coverage

**Files to read:**
- All files in `src/tests/`

- [ ] **Step 1: Read all existing tests**

For each test file, note:
- What functions/paths are covered
- What's explicitly missing (edge cases, error paths, boundary values)

Build a gap list:
- Functions in `src/db/*.ts` with no test
- Store actions in `src/store/index.ts` with no test
- Utility functions in `src/utils/*.ts` with no test
- Hooks in `src/hooks/*.ts` with no test
- Edge cases called out in comments but not tested

- [ ] **Step 2: Document the gap list**

Write a numbered list: file → function → what's missing.

---

### Task 17: Fill DB layer test gaps

**Files:**
- Modify: `src/tests/db/tasks.test.ts`
- Modify: `src/tests/db/lists.test.ts`
- Modify: `src/tests/db/folders.test.ts`
- Modify: `src/tests/db/habits.test.ts`
- Modify: `src/tests/db/sync.test.ts`

- [ ] **Step 1: Add missing tests for tasks.ts**

Focus on:
- `getTasks` with `deleted_at` filter (soft-deleted tasks should not appear)
- `deleteTask` — verify soft delete sets `deleted_at`, not hard delete
- Cyclical task advancement with edge dates (month boundary, Feb 28/29)
- `advanceRecurringTask` when no future occurrences exist

```typescript
it('getTasks excludes soft-deleted tasks', async () => {
  const list = await createList('Test', 'general');
  const task = await createTask(list.id, 'Active');
  await deleteTask(task.id);
  const tasks = await getTasks(list.id);
  expect(tasks.find(t => t.id === task.id)).toBeUndefined();
});

it('deleteTask soft-deletes, not hard-deletes', async () => {
  const list = await createList('Test', 'general');
  const task = await createTask(list.id, 'To delete');
  await deleteTask(task.id);
  const db = await getDb();
  const raw = await db.get('tasks', task.id);
  expect(raw).toBeDefined();
  expect(raw?.deleted_at).toBeTruthy();
});
```

- [ ] **Step 2: Run new tests**

```bash
cd /home/hau5/projects/todo && npx vitest run src/tests/db/tasks.test.ts
```
Expected: all pass.

- [ ] **Step 3: Add missing tests for habits.ts**

Focus on:
- Streak calculation when completions have gaps
- Streak of 0 when last completion was before today
- Toggle completion off (was complete, now incomplete)

```typescript
it('calculateStreak returns 0 when last completion was not today or yesterday', async () => {
  const completions = [{ date: '2026-04-07' }]; // 3 days ago
  const streak = calculateStreak(completions, '2026-04-10');
  expect(streak).toBe(0);
});

it('calculateStreak counts consecutive days ending today', async () => {
  const completions = [
    { date: '2026-04-08' },
    { date: '2026-04-09' },
    { date: '2026-04-10' },
  ];
  const streak = calculateStreak(completions, '2026-04-10');
  expect(streak).toBe(3);
});
```

- [ ] **Step 4: Run new tests**

```bash
cd /home/hau5/projects/todo && npx vitest run src/tests/db/habits.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tests/db/
git commit -m "test: add missing DB layer edge case coverage"
```

---

### Task 18: Fill utils test gaps

**Files:**
- Modify: `src/tests/utils/order.test.ts`
- Create: `src/tests/utils/date.test.ts`

- [ ] **Step 1: Add edge case tests for order.ts**

```typescript
// src/tests/utils/order.test.ts — add these cases
it('reinsert handles same-position move (no-op)', () => {
  const arr = ['a', 'b', 'c'];
  expect(reinsert(arr, 1, 1)).toEqual(['a', 'b', 'c']);
});

it('reinsert handles moving to start', () => {
  const arr = ['a', 'b', 'c'];
  expect(reinsert(arr, 2, 0)).toEqual(['c', 'a', 'b']);
});

it('reinsert handles moving to end', () => {
  const arr = ['a', 'b', 'c'];
  expect(reinsert(arr, 0, 2)).toEqual(['b', 'c', 'a']);
});

it('reinsert handles single element array', () => {
  const arr = ['a'];
  expect(reinsert(arr, 0, 0)).toEqual(['a']);
});
```

- [ ] **Step 2: Create date.test.ts**

Read `src/utils/date.ts` first, then write tests for each exported function covering boundary values.

```typescript
// src/tests/utils/date.test.ts
import { describe, it, expect } from 'vitest';
// import date utilities — check exact exports in src/utils/date.ts
```

- [ ] **Step 3: Run new tests**

```bash
cd /home/hau5/projects/todo && npx vitest run src/tests/utils/
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/tests/utils/
git commit -m "test: add edge case coverage for order and date utils"
```

---

### Task 19: Fill store test gaps

**Files:**
- Modify: `src/tests/store/store-tasks.test.ts`
- Modify: `src/tests/store/store-lists.test.ts`
- Modify: `src/tests/store/store-folders.test.ts`

- [ ] **Step 1: Read existing store tests**

Identify: which store actions have no test? Common gaps:
- Error path: what does the store do if the DB throws?
- `requestSync` called after mutation
- Optimistic update then failure

- [ ] **Step 2: Add missing store action tests**

Focus on: actions that mutate both local state and DB. Verify both are updated.

```typescript
it('deleteTask removes task from store state', async () => {
  const list = await dbCreateList('Test', 'general');
  const task = await dbCreateTask(list.id, 'To delete');
  await useAppStore.getState().loadLists();
  await useAppStore.getState().deleteTask(task.id);
  const tasks = useAppStore.getState().tasks;
  expect(tasks.find(t => t.id === task.id)).toBeUndefined();
});
```

- [ ] **Step 3: Run new tests**

```bash
cd /home/hau5/projects/todo && npx vitest run src/tests/store/
```

- [ ] **Step 4: Commit**

```bash
git add src/tests/store/
git commit -m "test: add store action coverage for missing mutations"
```

---

### Task 20: Fill hook test gaps

**Files:**
- Modify: `src/tests/hooks/useHabits.test.ts`
- Modify: `src/tests/hooks/useMyDay.test.ts`
- Modify: `src/tests/hooks/useList.test.ts`

- [ ] **Step 1: Read existing hook tests, identify gaps**

Common gaps:
- `useHabits`: streak displayed correctly for 0-streak vs active streak
- `useMyDay`: tasks that were completed on a prior day are hidden
- `useList`: ordering respected, hidden tasks excluded

- [ ] **Step 2: Add missing tests**

Follow the existing test patterns in each file for setup/teardown.

- [ ] **Step 3: Run new tests**

```bash
cd /home/hau5/projects/todo && npx vitest run src/tests/hooks/
```

- [ ] **Step 4: Commit**

```bash
git add src/tests/hooks/
git commit -m "test: add missing hook test coverage"
```

---

### Task 21: Phase 4 summary and full test run

- [ ] **Step 1: Run full test suite**

```bash
cd /home/hau5/projects/todo && npx vitest run
```
Expected: all pass.

- [ ] **Step 2: Write brief summary**

List: total new tests added, any remaining known gaps.

---

## Phase 5 — Docs

### Task 22: Update CLAUDE.md

**File:** `CLAUDE.md`

- [ ] **Step 1: Read CLAUDE.md in full**

Compare against current codebase state. Check:
- Key file map — any files moved, added, or removed during audit phases?
- UI behaviour rules — any new patterns established during refactoring?
- Git rules — still accurate?

- [ ] **Step 2: Apply updates**

Update only what changed. Do not rewrite sections that are still accurate.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect post-audit codebase state"
```

---

### Task 23: Inline comments for non-obvious logic

**Files to annotate:**
- `src/sync/orchestrator.ts` — debounce strategy, concurrent push guard
- `src/db/habits.ts` — streak calculation edge cases
- `src/hooks/useLineDrag.ts` — why DOM refs instead of Framer Motion Reorder.Group
- `src/components/Sidebar.tsx` — iOS PWA focus workaround (always-mounted input)
- `src/app.css` — explain the `nav-icon-btn--active:hover` specificity fix

- [ ] **Step 1: Read each file**

Find the non-obvious sections. Write a one-line comment that explains the *why*, not the *what*.

```typescript
// Good comment (explains why):
// Guard against concurrent pushes — a second requestSync() could fire
// before the first push completes, causing duplicate upserts.
let pushing = false;

// Bad comment (restates the code):
// Set pushing to false
pushing = false;
```

For CSS:
```css
/* nav-icon-btn:hover has specificity (0,2,0) which overrides nav-icon-btn--active
   at (0,1,0). This rule, declared after :hover, wins at equal specificity
   and restores accent color when hovering over the active item. */
.nav-icon-btn--active:hover { color: var(--accent); background: var(--accent-dim); }
```

- [ ] **Step 2: Commit**

```bash
git add src/sync/orchestrator.ts src/db/habits.ts src/hooks/useLineDrag.ts src/components/Sidebar.tsx src/app.css
git commit -m "docs: add explanatory comments for non-obvious logic"
```

---

### Task 24: Final verification

- [ ] **Step 1: Full test suite**

```bash
cd /home/hau5/projects/todo && npx vitest run
```
Expected: all pass.

- [ ] **Step 2: Type check**

```bash
cd /home/hau5/projects/todo && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Build check**

```bash
cd /home/hau5/projects/todo && npx vite build
```
Expected: successful build, no warnings.

- [ ] **Step 4: Write final summary**

Brief writeup covering all 5 phases: what was found, what was fixed, what was added, what remains.
