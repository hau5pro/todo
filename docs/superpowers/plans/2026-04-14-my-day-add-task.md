# My Day — Add Task Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to add one-off tasks from the My Day view; tasks land in the list named "Tasks" with `due_date = today` and appear immediately in the Today section.

**Architecture:** Extend the `addTask` store action with an optional `due_date` param that is passed through to the DB layer; when the date is today, optimistically push to `myDayToday` in the same `set()` call. `MyDayView` resolves the Tasks list by name and renders an add-task input under the Today section heading — the Today section always renders (even with zero tasks) so the input always has a home.

**Tech Stack:** React 18, TypeScript, Zustand, IndexedDB (via `src/db/tasks.ts`), Vitest

---

## File map

| File | Change |
|---|---|
| `src/store/index.ts` | Extend `addTask` type + implementation to accept `due_date?` |
| `src/views/MyDayView.tsx` | Add input state, always-render Today section, add-task form |
| `src/tests/store/store-tasks.test.ts` | New `describe` block for `addTask` with `due_date` |

---

## Task 1: Extend `addTask` in the store

**Files:**
- Modify: `src/store/index.ts:109` (type signature)
- Modify: `src/store/index.ts:343-353` (implementation)
- Test: `src/tests/store/store-tasks.test.ts`

- [ ] **Step 1: Write four failing tests**

Append to `src/tests/store/store-tasks.test.ts` (after the existing `store: addTask` describe block):

```ts
import { getTodayString } from '../../utils/date';

describe('store: addTask with due_date', () => {
  it('sets due_date on the created task', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const today = getTodayString();
    const task = await useAppStore.getState().addTask(list.id, 'Quick task', null, today);
    expect(task.due_date).toBe(today);
  });

  it('adds task to myDayToday when due_date is today', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const today = getTodayString();
    const task = await useAppStore.getState().addTask(list.id, 'Quick task', null, today);
    expect(useAppStore.getState().myDayToday.find((t) => t.id === task.id)).toBeDefined();
  });

  it('does not add to myDayToday when due_date is a future date', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await useAppStore.getState().addTask(list.id, 'Future task', null, '2099-01-01');
    expect(useAppStore.getState().myDayToday.find((t) => t.id === task.id)).toBeUndefined();
  });

  it('does not add to myDayToday when due_date is omitted', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await useAppStore.getState().addTask(list.id, 'No date task');
    expect(useAppStore.getState().myDayToday.find((t) => t.id === task.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/tests/store/store-tasks.test.ts
```

Expected: the four new tests fail with a TypeScript error (`Expected 2-3 arguments, but got 4`) or assertion failures.

- [ ] **Step 3: Update the `addTask` type signature**

In `src/store/index.ts`, find line 109:

```ts
addTask: (listId: string, title: string, group?: string | null) => Promise<Task>;
```

Replace with:

```ts
addTask: (listId: string, title: string, group?: string | null, due_date?: string) => Promise<Task>;
```

- [ ] **Step 4: Update the `addTask` implementation**

In `src/store/index.ts`, find the `addTask` implementation (currently lines 343-353):

```ts
addTask: async (listId, title, group) => {
  const task = await dbCreateTask(listId, title, { group: group ?? null });
  set((s) => ({
    tasksByList: {
      ...s.tasksByList,
      [listId]: [...(s.tasksByList[listId] ?? []), task],
    },
  }));
  requestSync();
  return task;
},
```

Replace with:

```ts
addTask: async (listId, title, group, due_date) => {
  const task = await dbCreateTask(listId, title, { group: group ?? null, due_date: due_date ?? null });
  const today = getTodayString();
  set((s) => ({
    tasksByList: {
      ...s.tasksByList,
      [listId]: [...(s.tasksByList[listId] ?? []), task],
    },
    ...(due_date === today ? { myDayToday: [...s.myDayToday, task] } : {}),
  }));
  requestSync();
  return task;
},
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/tests/store/store-tasks.test.ts
```

Expected: all tests in the file pass, including the four new ones.

- [ ] **Step 6: Commit**

```bash
git add src/store/index.ts src/tests/store/store-tasks.test.ts
git commit -m "feat: extend addTask with optional due_date, optimistically update myDayToday"
```

---

## Task 2: Add the input UI to MyDayView

**Files:**
- Modify: `src/views/MyDayView.tsx`

No new automated tests for the UI — verify manually (step 5).

- [ ] **Step 1: Update imports**

In `src/views/MyDayView.tsx`, replace the first two import lines:

```ts
import { useEffect, useMemo, useCallback, useRef } from 'react';
import { Sun, Flame, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
```

with:

```ts
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { Sun, Flame, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
```

Then replace the constants import line:

```ts
import { ICON_SIZE } from '../config/constants';
```

with:

```ts
import { ICON_SIZE, ADD_TASK_PLACEHOLDER } from '../config/constants';
```

Then add one more import after the `getTodayString` import line:

```ts
import { focusLater } from '../utils/dom';
```

- [ ] **Step 2: Add `addTask` to store destructure and add input state**

In `MyDayView`, the store destructure line currently reads:

```ts
const { myDayOverdue, myDayToday, myDayHabits, myDayLoaded, loadMyDay, completeTask, advanceCyclicalTask, lists } = useAppStore();
```

Replace with:

```ts
const { myDayOverdue, myDayToday, myDayHabits, myDayLoaded, loadMyDay, completeTask, advanceCyclicalTask, lists, addTask } = useAppStore();
```

Then, directly after that line (before the `useSettings` line), add:

```ts
const tasksList = useMemo(() => lists.find((l) => l.name === 'Tasks') ?? null, [lists]);
const [newTitle, setNewTitle] = useState('');
const [addOpen, setAddOpen] = useState(false);
const submittingRef = useRef(false);
const addInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 3: Add `commitAdd` and `handleAdd` functions**

Inside the `MyDayView` function body, after the `handleHabitToggle` callback and before the early `return null`, add:

```ts
async function commitAdd() {
  if (!newTitle.trim() || submittingRef.current || !tasksList) return;
  submittingRef.current = true;
  try {
    await addTask(tasksList.id, newTitle.trim(), null, today);
    setNewTitle('');
    setAddOpen(false);
  } finally {
    submittingRef.current = false;
  }
}

async function handleAdd(e: React.FormEvent) {
  e.preventDefault();
  await commitAdd();
}
```

- [ ] **Step 4: Replace the Today section in the JSX**

Find the current Today section (the block starting with `{myDayToday.length > 0 && (`):

```tsx
{myDayToday.length > 0 && (
  <motion.section variants={sectionVariants}>
    <div className="section-heading"><Sun size={ICON_SIZE} />Today</div>
    {sortedToday.map((task) => (
      <TaskItem
        key={task.id}
        id={task.id}
        title={task.title}
        completed={task.completed}
        dueDate={task.due_date}
        dueTime={task.due_time}
        today={today}
        onToggle={handleTaskToggle}
      />
    ))}
  </motion.section>
)}
```

Replace with:

```tsx
<motion.section variants={sectionVariants}>
  <div className="section-heading"><Sun size={ICON_SIZE} />Today</div>
  {tasksList && (
    <form onSubmit={handleAdd} style={{ position: 'relative' }}>
      <AnimatePresence initial={false}>
        {!addOpen && (
          <motion.button
            key="add-trigger"
            type="button"
            className="add-task"
            onClick={() => { setAddOpen(true); focusLater(addInputRef); }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            style={{ position: 'absolute', inset: 0, margin: 0, height: '100%' }}
          >
            {ADD_TASK_PLACEHOLDER}
          </motion.button>
        )}
      </AnimatePresence>
      <input
        ref={addInputRef}
        className="add-task-input"
        placeholder={ADD_TASK_PLACEHOLDER}
        aria-label="Add task"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onFocus={() => setAddOpen(true)}
        onBlur={() => {
          if (!newTitle.trim()) setAddOpen(false);
          else commitAdd();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setNewTitle(''); setAddOpen(false); }
        }}
        data-add-task
        style={{
          opacity: addOpen ? 1 : 0,
          transition: 'opacity 0.12s ease',
          pointerEvents: addOpen ? 'auto' : 'none',
        }}
      />
    </form>
  )}
  {sortedToday.map((task) => (
    <TaskItem
      key={task.id}
      id={task.id}
      title={task.title}
      completed={task.completed}
      dueDate={task.due_date}
      dueTime={task.due_time}
      today={today}
      onToggle={handleTaskToggle}
    />
  ))}
</motion.section>
```

Also update the `hasAnything` check so the empty state message no longer depends on `myDayToday`:

Find:
```ts
const hasAnything = myDayOverdue.length > 0 || myDayToday.length > 0 || myDayHabits.length > 0;
```

Replace with:
```ts
const hasAnything = myDayOverdue.length > 0 || myDayToday.length > 0 || myDayHabits.length > 0 || !!tasksList;
```

- [ ] **Step 5: Verify the build and manually test**

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

Then run the dev server and manually confirm:
- My Day shows `+ Add task` under the Today heading
- Typing a title and pressing Enter (or blurring) creates a task
- The task appears immediately in the Today section
- The task appears in the Tasks list when you navigate to it
- If no list named "Tasks" exists, the input is hidden

- [ ] **Step 6: Commit**

```bash
git add src/views/MyDayView.tsx
git commit -m "feat: add task input to My Day view, targets Tasks list with due date today"
```
