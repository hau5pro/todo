# Animation Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add enter/exit animations to task items, entry animation when tasks move to the completed section, and a toggle animation on the add-task input.

**Architecture:** All three changes use existing Framer Motion patterns already in the codebase. For task enter/exit: wrap task lists in `AnimatePresence` and move the `data-reorder-id` attribute up to a `motion.div` wrapper so the drag-reorder system (which reads `group.children` filtered by `data-reorder-id`) continues to work. For completed-task entry: extend the already-present `AnimatePresence` wrappers to animate on entry, not just exit. For the add-task input: keep the `<input>` always mounted for keyboard-nav compatibility, animate it open/closed with a `motion.div` height+opacity wrapper, and show a trigger button when closed.

**Tech Stack:** React 18, TypeScript, Framer Motion (already installed), CSS custom properties from `src/app.css`

---

## File map

| File | Changes |
|---|---|
| `src/views/ListView.tsx` | Tasks 1, 3, 4: ungrouped task AnimatePresence, completed entry animation, add-task toggle |
| `src/components/GroupSection.tsx` | Task 2: grouped task AnimatePresence |

---

## Task 1: Task enter/exit — ListView ungrouped tasks

**Files:**
- Modify: `src/views/ListView.tsx`

### Context

`useLineDrag` reads drag targets by querying `[data-reorder-context]`'s **direct children** and filtering by `data-reorder-id`:
```ts
// src/hooks/useLineDrag.ts:54-56
itemsRef.current = Array.from(group.children)
  .filter((el) => el instanceof HTMLElement && el.hasAttribute('data-reorder-id'))
  .map((el) => ({ id: el.getAttribute('data-reorder-id')!, el }));
```
This means `data-reorder-id` must live on the **direct child** of `[data-reorder-context]`. The current `TaskRow` root div carries `data-reorder-id`. The plan is to promote `data-reorder-id` to the `motion.div` wrapper, which becomes the new direct child.

- [ ] **Step 1: Remove `data-reorder-id` from TaskRow's root div**

In `src/views/ListView.tsx`, the local `TaskRow` function (starts around line 45). Change its root element from:

```tsx
<div
  data-reorder-id={task.id}
  className={`task-row${editMode ? ' task-row--editing' : ''}`}
  style={{ cursor: 'default', opacity: dragging ? 0.4 : 1 }}
>
```

to:

```tsx
<div
  className={`task-row${editMode ? ' task-row--editing' : ''}`}
  style={{ cursor: 'default', opacity: dragging ? 0.4 : 1 }}
>
```

- [ ] **Step 2: Wrap the ungrouped task list in AnimatePresence with animated motion.div wrappers**

Locate the `<div data-reorder-context="ungrouped">` block (~line 450). Replace:

```tsx
<div data-reorder-context="ungrouped">
  {ungroupedTasks.map((task) => (
    <TaskRow
      key={task.id}
      task={task}
      editMode={taskEditMode}
      today={today}
      dragging={task.id === draggingTaskId}
      onToggle={handleToggle}
      onSelect={() => handleSelectTask(task)}
      onDelete={() => removeTask(task.id, listId!)}
      isSelected={detail?.task.id === task.id}
      onReorderStart={(e) => startDrag(e, task.id, 'ungrouped', 'task-row--dragging')}
      onGroupDragStart={(e) => { e.preventDefault(); setDraggingTaskId(task.id); }}
    />
  ))}
</div>
```

with:

```tsx
<div data-reorder-context="ungrouped">
  <AnimatePresence initial={false}>
    {ungroupedTasks.map((task) => (
      <motion.div
        key={task.id}
        data-reorder-id={task.id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto', transition: { duration: 0.22, ease: ease.snap } }}
        exit={{ opacity: 0, height: 0, transition: { duration: 0.18, ease: ease.in } }}
        style={{ overflow: 'hidden' }}
      >
        <TaskRow
          task={task}
          editMode={taskEditMode}
          today={today}
          dragging={task.id === draggingTaskId}
          onToggle={handleToggle}
          onSelect={() => handleSelectTask(task)}
          onDelete={() => removeTask(task.id, listId!)}
          isSelected={detail?.task.id === task.id}
          onReorderStart={(e) => startDrag(e, task.id, 'ungrouped', 'task-row--dragging')}
          onGroupDragStart={(e) => { e.preventDefault(); setDraggingTaskId(task.id); }}
        />
      </motion.div>
    ))}
  </AnimatePresence>
</div>
```

Note: `key` moves from `TaskRow` to the `motion.div`. `TaskRow` no longer needs a `key` prop since it's not the direct child of the map anymore.

- [ ] **Step 3: Run the test suite**

```bash
npm run test -- --run
```

Expected: all existing tests pass. No tests exist for ListView so this verifies no import/type breakage.

- [ ] **Step 4: Verify visually in the dev server**

```bash
npm run dev
```

Open a list. Add a task — it should slide down and fade in. Delete a task (via edit mode's delete button) — it should fade out and its height should collapse. The drag-to-reorder handles should still work.

- [ ] **Step 5: Commit**

```bash
git add src/views/ListView.tsx
git commit -m "feat: animate ungrouped task enter/exit in ListView"
```

---

## Task 2: Task enter/exit — GroupSection

**Files:**
- Modify: `src/components/GroupSection.tsx`

- [ ] **Step 1: Remove `data-reorder-id` from TaskRow's root div**

In `src/components/GroupSection.tsx`, the local `TaskRow` function (starts at line 11). Change its root element from:

```tsx
<div
  data-reorder-id={task.id}
  className={`task-row${editMode ? ' task-row--editing' : ''}`}
  style={{ cursor: 'default', opacity: dragging ? 0.4 : 1 }}
>
```

to:

```tsx
<div
  className={`task-row${editMode ? ' task-row--editing' : ''}`}
  style={{ cursor: 'default', opacity: dragging ? 0.4 : 1 }}
>
```

- [ ] **Step 2: Wrap the grouped task list in AnimatePresence with animated motion.div wrappers**

Locate the `<div data-reorder-context={groupName}>` block (~line 192). The `motion` import is already present at the top of the file. Replace:

```tsx
<div data-reorder-context={groupName}>
  {tasks.map((task) => (
    <TaskRow
      key={task.id}
      task={task}
      editMode={editMode}
      today={today}
      dragging={task.id === draggingTaskId}
      onToggle={onToggle}
      onSelect={() => onSelect(task)}
      onDelete={() => onDelete(task)}
      isSelected={selectedTaskId === task.id}
      onReorderStart={(e) => startDrag(e, task.id, groupName, 'task-row--dragging')}
      onGroupDragStart={(e) => onGroupDragStart(e, task.id)}
    />
  ))}
</div>
```

with:

```tsx
<div data-reorder-context={groupName}>
  <AnimatePresence initial={false}>
    {tasks.map((task) => (
      <motion.div
        key={task.id}
        data-reorder-id={task.id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto', transition: { duration: 0.22, ease: ease.snap } }}
        exit={{ opacity: 0, height: 0, transition: { duration: 0.18, ease: ease.in } }}
        style={{ overflow: 'hidden' }}
      >
        <TaskRow
          task={task}
          editMode={editMode}
          today={today}
          dragging={task.id === draggingTaskId}
          onToggle={onToggle}
          onSelect={() => onSelect(task)}
          onDelete={() => onDelete(task)}
          isSelected={selectedTaskId === task.id}
          onReorderStart={(e) => startDrag(e, task.id, groupName, 'task-row--dragging')}
          onGroupDragStart={(e) => onGroupDragStart(e, task.id)}
        />
      </motion.div>
    ))}
  </AnimatePresence>
</div>
```

The `ease` import is already present at the top of `GroupSection.tsx` via `import { ease } from '../utils/easing'`.

- [ ] **Step 3: Run the test suite**

```bash
npm run test -- --run
```

Expected: all existing tests pass.

- [ ] **Step 4: Verify visually in the dev server**

Open a list that has groups. Add a task to a group — it should animate in. Delete a task — it should animate out. Drag-to-reorder within a group should still work.

- [ ] **Step 5: Commit**

```bash
git add src/components/GroupSection.tsx
git commit -m "feat: animate grouped task enter/exit in GroupSection"
```

---

## Task 3: Completed task entry animation

**Files:**
- Modify: `src/views/ListView.tsx`

### Context

The completed task section (~line 501) already has `AnimatePresence initial={false}` and `motion.div` wrappers per task, but they only define `exit`. This task adds `initial` and `animate` so tasks entering the completed section also animate.

- [ ] **Step 1: Add enter animation to completed task motion.div wrappers**

Locate the `AnimatePresence initial={false}` block inside the completed section (~line 511). Replace:

```tsx
<AnimatePresence initial={false}>
  {visibleCompleted.map((task) => (
    <motion.div
      key={task.id}
      exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeIn' as const } }}
    >
```

with:

```tsx
<AnimatePresence initial={false}>
  {visibleCompleted.map((task) => (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto', transition: { duration: 0.22, ease: ease.snap } }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.18, ease: ease.in } }}
      style={{ overflow: 'hidden' }}
    >
```

- [ ] **Step 2: Run the test suite**

```bash
npm run test -- --run
```

Expected: all existing tests pass.

- [ ] **Step 3: Verify visually**

Open a list. Expand the completed section. Check off an active task — it should exit the active list and enter the completed section with an animation. Uncheck a completed task — it should exit the completed section.

- [ ] **Step 4: Commit**

```bash
git add src/views/ListView.tsx
git commit -m "feat: animate task entry into completed section"
```

---

## Task 4: Add-task input toggle animation

**Files:**
- Modify: `src/views/ListView.tsx`

### Context

The `data-add-task` attribute on the input is read by `useKeyboardNav` (`document.querySelector('[data-add-task]').focus()`). The input must remain mounted at all times so keyboard navigation continues to work. The solution: always mount the `<input>`, animate its container between `height: 0` (closed) and `height: auto` (open). Show a trigger button when closed; hide it when open.

- [ ] **Step 1: Add `addOpen` state and `addInputRef`**

Add two new declarations near the other `useState` declarations at the top of the `ListView` function body (~line 109):

```tsx
const [addOpen, setAddOpen] = useState(false);
const addInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 2: Reset `addOpen` on list navigation**

Find the `useEffect` that resets state when `listId` changes (~line 141):

```tsx
useEffect(() => {
  setTaskEditMode(false);
  setEditingListName(false);
  setCompletedVisible(COMPLETED_PAGE_SIZE);
}, [listId]);
```

Add `setAddOpen(false)` to it:

```tsx
useEffect(() => {
  setTaskEditMode(false);
  setEditingListName(false);
  setCompletedVisible(COMPLETED_PAGE_SIZE);
  setAddOpen(false);
}, [listId]);
```

- [ ] **Step 3: Update `commitAdd` to close the input after submitting**

Find `commitAdd` (~line 278):

```tsx
async function commitAdd() {
  if (!newTitle.trim()) return;
  await addTask(listId!, newTitle.trim());
  setNewTitle('');
  closeDetail();
}
```

Add `setAddOpen(false)`:

```tsx
async function commitAdd() {
  if (!newTitle.trim()) return;
  await addTask(listId!, newTitle.trim());
  setNewTitle('');
  setAddOpen(false);
  closeDetail();
}
```

- [ ] **Step 4: Replace the add-task form with the animated toggle**

Find the `<motion.form>` block inside the ungrouped drop zone (~line 434):

```tsx
<motion.form
  initial={{ opacity: 0, y: 5 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: 'easeOut', delay: 0.21 }}
  onSubmit={handleAdd}
>
  <input
    className="add-task-input"
    placeholder={ADD_TASK_PLACEHOLDER}
    aria-label="Add task"
    value={newTitle}
    onChange={(e) => setNewTitle(e.target.value)}
    onBlur={commitAdd}
    data-add-task
  />
</motion.form>
```

Replace it with:

```tsx
<motion.form
  initial={{ opacity: 0, y: 5 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: 'easeOut', delay: 0.21 }}
  onSubmit={handleAdd}
>
  <AnimatePresence initial={false}>
    {!addOpen && (
      <motion.button
        key="add-trigger"
        type="button"
        className="add-task"
        onClick={() => { setAddOpen(true); focusLater(addInputRef); }}
        exit={{ opacity: 0, transition: { duration: 0.08 } }}
      >
        {ADD_TASK_PLACEHOLDER}
      </motion.button>
    )}
  </AnimatePresence>
  <motion.div
    animate={addOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
    transition={{ duration: addOpen ? 0.22 : 0.16, ease: addOpen ? ease.snap : ease.in }}
    style={{ overflow: 'hidden' }}
  >
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
    />
  </motion.div>
</motion.form>
```

Note: `focusLater` is already imported in `ListView.tsx`.

- [ ] **Step 5: Run the test suite**

```bash
npm run test -- --run
```

Expected: all existing tests pass.

- [ ] **Step 6: Verify visually and check keyboard nav**

- Click "＋ Add a task" button — input should animate open.
- Type a task and press Enter — input should submit and animate closed, trigger button should reappear.
- Click away with empty input — input should animate closed.
- Press Escape inside the input — should close without submitting.
- Navigate to the input via keyboard (arrow keys or Tab in the list) — the input should animate open on focus.

- [ ] **Step 7: Commit**

```bash
git add src/views/ListView.tsx
git commit -m "feat: animate add-task input open/close"
```
