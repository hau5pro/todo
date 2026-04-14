# Task Note Field + Habit Duration Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `note: string | null` field to all tasks, editable in the detail panel for every task type, with inline truncated display in the habit list view.

**Architecture:** `note` is added to the `Task` type and flows through IndexedDB (with a v2→v3 migration cursor), the DB layer, and the Zustand store. The detail panel gets a multi-line textarea for all tasks. `HabitItem` renders the note inline below the title, CSS-truncated to one line.

**Tech Stack:** TypeScript, IndexedDB (fake-indexeddb in tests), Vitest, React 18, Zustand, CSS custom properties

---

## File Map

| File | Change |
|---|---|
| `src/types.ts` | Add `note: string \| null` to `Task` interface |
| `src/db/client.ts` | Bump `DB_VERSION` to `3`; add v3 migration cursor on `tasks` store |
| `src/db/tasks.ts` | Include `note: null` in `createTask`; add `'note'` to `updateTask` Pick type |
| `src/store/index.ts` | Add `'note'` to `updateTaskFields` Pick type |
| `src/components/TaskDetailPanel.tsx` | Add `noteInput` state + textarea + save-on-blur handler |
| `src/components/HabitItem.tsx` | Add `note` prop; render `<span className="habit-item__note">` when present |
| `src/components/HabitGroupSection.tsx` | Pass `row.task.note` to `HabitItem` |
| `src/app.css` | Add `.habit-item__note` styles |
| `src/tests/db/tasks.test.ts` | Tests for `note` field in `createTask` and `updateTask` |

---

## Task 1: Add `note` to `Task` type and DB migration

**Files:**
- Modify: `src/types.ts`
- Modify: `src/db/client.ts`
- Test: `src/tests/db/tasks.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/tests/db/tasks.test.ts` inside the `tasks CRUD` describe block:

```ts
it('createTask includes note: null by default', async () => {
  const list = await createList('Test', 'general');
  const task = await createTask(list.id, 'Meditate');
  expect(task.note).toBeNull();
});

it('updateTask persists a note value', async () => {
  const list = await createList('Test', 'general');
  const task = await createTask(list.id, 'Meditate');
  const updated = await updateTask(task.id, { note: '30 min' });
  expect(updated.note).toBe('30 min');
});

it('updateTask clears note when set to null', async () => {
  const list = await createList('Test', 'general');
  const task = await createTask(list.id, 'Meditate');
  await updateTask(task.id, { note: '30 min' });
  const cleared = await updateTask(task.id, { note: null });
  expect(cleared.note).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- src/tests/db/tasks.test.ts --reporter=verbose
```

Expected: 3 new tests fail with type errors or assertion errors.

- [ ] **Step 3: Add `note` to the `Task` interface**

In `src/types.ts`, add `note` after `group`:

```ts
  group: string | null;                // optional group/section name within the list
  note: string | null;                 // free-form note or duration hint
  updated_at: string;
```

- [ ] **Step 4: Bump DB version and add migration**

In `src/db/client.ts`, make these two changes:

Change:
```ts
const DB_VERSION = 2;
```
To:
```ts
const DB_VERSION = 3;
```

Add a `v3` block after the existing `v2` block inside `onupgradeneeded`:

```ts
      // v3: add note field to existing task records
      if (oldVersion < 3) {
        if (db.objectStoreNames.contains('tasks')) {
          const tasksStore = tx.objectStore('tasks');
          tasksStore.openCursor().onsuccess = function (e) {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (!cursor) return;
            const record = cursor.value;
            if (record.note === undefined) {
              cursor.update({ ...record, note: null });
            }
            cursor.continue();
          };
        }
      }
```

- [ ] **Step 5: Run tests to verify they still fail (type error in db/tasks.ts expected)**

```bash
npm run test -- src/tests/db/tasks.test.ts --reporter=verbose
```

Expected: Tests fail because `createTask` doesn't include `note` yet and `updateTask` doesn't accept it yet.

- [ ] **Step 6: Commit type + migration**

```bash
git add src/types.ts src/db/client.ts
git commit -m "feat: add note field to Task type and DB v3 migration"
```

---

## Task 2: Thread `note` through DB layer and store

**Files:**
- Modify: `src/db/tasks.ts`
- Modify: `src/store/index.ts`
- Test: `src/tests/db/tasks.test.ts`

- [ ] **Step 1: Update `createTask` to include `note: null`**

In `src/db/tasks.ts`, the `CreateTaskOpts` type is:
```ts
type CreateTaskOpts = Partial<Pick<Task, 'due_date' | 'recurrence_interval' | 'recurrence_unit' | 'rrule' | 'completed' | 'group'>>;
```

The task object built inside `createTask` must include `note`:
```ts
  const task: Task = {
    id: crypto.randomUUID(),
    list_id: listId,
    title,
    completed: opts.completed ?? false,
    completed_at: null,
    due_date: opts.due_date ?? null,
    due_time: null,
    recurrence_interval: opts.recurrence_interval ?? null,
    recurrence_unit: opts.recurrence_unit ?? null,
    rrule: opts.rrule ?? null,
    group: opts.group ?? null,
    note: null,
    updated_at: new Date().toISOString(),
    deleted_at: null,
    pending_sync: true,
  };
```

- [ ] **Step 2: Update `updateTask` to accept `note`**

Change the `changes` parameter type in `updateTask` (line 160):

From:
```ts
export async function updateTask(id: string, changes: Partial<Pick<Task, 'title' | 'due_date' | 'due_time' | 'recurrence_interval' | 'recurrence_unit' | 'rrule' | 'group'>>): Promise<Task> {
```
To:
```ts
export async function updateTask(id: string, changes: Partial<Pick<Task, 'title' | 'due_date' | 'due_time' | 'recurrence_interval' | 'recurrence_unit' | 'rrule' | 'group' | 'note'>>): Promise<Task> {
```

- [ ] **Step 3: Update `updateTaskFields` in the store**

In `src/store/index.ts`, the `updateTaskFields` action signature (line 111):

From:
```ts
  updateTaskFields: (id: string, listId: string, fields: Partial<Pick<Task, 'due_date' | 'due_time' | 'rrule'>>) => Promise<Task>;
```
To:
```ts
  updateTaskFields: (id: string, listId: string, fields: Partial<Pick<Task, 'due_date' | 'due_time' | 'rrule' | 'note'>>) => Promise<Task>;
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm run test -- src/tests/db/tasks.test.ts --reporter=verbose
```

Expected: All 3 new tests pass, and all existing tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```

Expected: All 229 tests pass (226 existing + 3 new).

- [ ] **Step 6: Commit**

```bash
git add src/db/tasks.ts src/store/index.ts src/tests/db/tasks.test.ts
git commit -m "feat: thread note field through DB layer and store"
```

---

## Task 3: Note textarea in TaskDetailPanel

**Files:**
- Modify: `src/components/TaskDetailPanel.tsx`

No automated test — verify manually by opening a task detail and typing in the note field.

- [ ] **Step 1: Add `noteInput` state and initialize it**

At the top of `TaskDetailPanel`, add state (after the existing `useState` calls):

```ts
const [noteInput, setNoteInput] = useState('');
```

In the `useEffect` that runs on `detail?.task.id` (starts at line 72), add initialization:

```ts
  useEffect(() => {
    if (detail) {
      setEditTitle(detail.task.title);
      setGroupInput(detail.task.group ?? '');
      setNoteInput(detail.task.note ?? '');   // add this line
      setCalOpen(false);
      setEditingTime(false);
      setEditingGroup(false);
      setShowSuggestions(false);
      setHighlightIdx(-1);
      focusLater(inputRef);
    }
  }, [detail?.task.id]);
```

- [ ] **Step 2: Add `commitNote` handler**

Add this function alongside the other commit handlers (e.g. after `commitGroup`):

```ts
  async function commitNote() {
    if (!task) return;
    const note = noteInput.trim() || null;
    if (note === (task.note ?? null)) return;
    const updated = await updateTaskFields(task.id, task.list_id, { note });
    updateCtx(updated);
  }
```

- [ ] **Step 3: Add the Note section to the panel JSX**

Insert a new section after the closing `</div>` of the "Organize" section (just before `</div>` that closes `task-detail-panel__body`, around line 380):

```tsx
        {/* Note */}
        <div className="task-detail-section">
          <span className="task-detail-section__heading">Note</span>
          <div className="task-detail-section__fields">
            <textarea
              className="task-detail-note-input"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onBlur={commitNote}
              placeholder="Add a note…"
              rows={3}
            />
          </div>
        </div>
```

- [ ] **Step 4: Add CSS for the textarea**

In `src/app.css`, find the block of `.task-detail-*` styles and add:

```css
.task-detail-note-input {
  width: 100%;
  background: transparent;
  border: 1px solid var(--divider);
  border-radius: 6px;
  color: var(--fg);
  font-size: 0.875rem;
  font-family: inherit;
  padding: 8px 10px;
  resize: vertical;
  min-height: 72px;
  outline: none;
  box-sizing: border-box;
}
.task-detail-note-input:focus {
  border-color: var(--accent);
}
.task-detail-note-input::placeholder {
  color: var(--fg-muted);
}
```

- [ ] **Step 5: Run full test suite (no regressions)**

```bash
npm run test
```

Expected: All 229 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/TaskDetailPanel.tsx src/app.css
git commit -m "feat: add note textarea to task detail panel"
```

---

## Task 4: Note inline display in HabitItem

**Files:**
- Modify: `src/components/HabitItem.tsx`
- Modify: `src/components/HabitGroupSection.tsx`
- Modify: `src/app.css`

- [ ] **Step 1: Add `note` prop to `HabitItem`**

In `src/components/HabitItem.tsx`, update the `Props` interface:

```ts
interface Props {
  id: string;
  title: string;
  note: string | null;
  completedToday: boolean;
  streak: number;
  onToggle: (id: string) => void;
  onSelect?: () => void;
  isSelected?: boolean;
}
```

Update the function signature to destructure `note`:

```ts
export const HabitItem = memo(function HabitItem({ id, title, note, completedToday, streak, onToggle, onSelect, isSelected }: Props) {
```

- [ ] **Step 2: Render note below the title**

In the JSX, after the title `<span>` (line 52) and before the streak `{streak > 0 && ...}` block, add:

```tsx
      {note && (
        <span className="habit-item__note">{note}</span>
      )}
```

The title span currently has `flex: 1` via CSS — you'll restructure this in the CSS step. For now the note span sits beside the title in the flex row. The CSS in Step 3 corrects the layout.

- [ ] **Step 3: Add `.habit-item__note` CSS and adjust layout**

The `.habit-item` flex row currently has the title taking `flex: 1`. To stack title + note vertically in the same flex column, wrap them. Instead of restructuring JSX further, use CSS to make `.habit-item__note` flow below the title:

In `src/app.css`, change `.habit-item__title` to not take `flex: 1`, and add a wrapper approach. Actually the cleanest approach without JSX restructuring: make `.habit-item__note` `display: block` and override `.habit-item__title` to allow wrapping.

Replace the existing `.habit-item__title` block:

```css
.habit-item__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

With:

```css
.habit-item__title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.habit-item__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

And add `.habit-item__note`:

```css
.habit-item__note {
  font-size: 0.75rem;
  color: var(--fg-muted);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0.75;
}
```

- [ ] **Step 4: Wrap title and note in `HabitItem` JSX**

Update the JSX in `HabitItem` to use the wrapper div:

```tsx
      <div className="habit-item__title-wrap">
        <span className={`habit-item__title${completedToday ? ' habit-item__title--completed' : ''}`}>
          {title}
        </span>
        {note && (
          <span className="habit-item__note">{note}</span>
        )}
      </div>
```

Remove the standalone `{note && ...}` span added in Step 2 (it's now inside the wrapper).

- [ ] **Step 5: Pass `note` from `HabitGroupSection`**

In `src/components/HabitGroupSection.tsx`, find the `<HabitItem>` usage inside `HabitRowItem` (around line 44):

```tsx
        <HabitItem
          id={row.task.id}
          title={row.task.title}
          completedToday={row.completedToday}
          streak={row.streak}
          onToggle={onToggle}
          onSelect={editMode ? undefined : onSelect}
          isSelected={!editMode && isSelected}
        />
```

Add `note`:

```tsx
        <HabitItem
          id={row.task.id}
          title={row.task.title}
          note={row.task.note}
          completedToday={row.completedToday}
          streak={row.streak}
          onToggle={onToggle}
          onSelect={editMode ? undefined : onSelect}
          isSelected={!editMode && isSelected}
        />
```

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```

Expected: All 229 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/HabitItem.tsx src/components/HabitGroupSection.tsx src/app.css
git commit -m "feat: display note inline in habit list view, truncated to one line"
```
