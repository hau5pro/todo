# Detail Panel UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three UX improvements: click-away closes the detail panel on desktop, the Note section moves to the top of the panel, and the habit list note displays inline to the right of the title.

**Architecture:** All changes are purely UI — no data model, DB, or store changes required. The backdrop is a new element in `DetailSlot` (AppShell). The Note reorder is a cut-and-paste within `TaskDetailPanel`. The HabitItem change removes the column wrapper and switches to an inline row layout with CSS-controlled sizing.

**Tech Stack:** React 18, TypeScript, CSS custom properties, Framer Motion (AnimatePresence already used)

---

## File Map

| File | Change |
|---|---|
| `src/components/AppShell.tsx` | Add `detail-backdrop` div to `DetailSlot` |
| `src/components/TaskDetailPanel.tsx` | Move Note section above Schedule |
| `src/components/HabitItem.tsx` | Remove `habit-item__title-wrap` div; title and note are direct flex children |
| `src/app.css` | Add `.detail-backdrop`; update `.habit-item__title-wrap`, `.habit-item__title`, `.habit-item__note` |

---

## Task 1: Click-Away Backdrop

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/app.css`

No automated test — verify manually: open a task, click to the left of the panel, panel should close.

- [ ] **Step 1: Add backdrop to `DetailSlot`**

In `src/components/AppShell.tsx`, replace the `DetailSlot` function (currently lines 14–25):

```tsx
function DetailSlot() {
  const { detail, close } = useTaskDetail();
  const { pathname } = useLocation();

  useEffect(() => { close(); }, [pathname, close]);

  return (
    <>
      <AnimatePresence>
        {detail && <div className="detail-backdrop" onClick={close} />}
      </AnimatePresence>
      <AnimatePresence>
        {detail && <TaskDetailPanel />}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Add `.detail-backdrop` CSS**

In `src/app.css`, find the `.task-detail-panel` block (around line 2181) and add the backdrop rule directly before it:

```css
.detail-backdrop {
  position: absolute;
  inset: 0;
  right: 335px;
  z-index: 1;
  cursor: default;
}

@media (max-width: 640px) {
  .detail-backdrop {
    display: none;
  }
}
```

The `right: 335px` matches the panel width so the backdrop covers only the `app-main` area to the left. On mobile (≤640px) the panel covers the full screen so the backdrop is hidden.

- [ ] **Step 3: Run full test suite**

```bash
npm run test
```

Expected: 229/229 pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShell.tsx src/app.css
git commit -m "feat: close detail panel on click-away (desktop only)"
```

---

## Task 2: Move Note Section to Top of Detail Panel

**Files:**
- Modify: `src/components/TaskDetailPanel.tsx`

No automated test — verify by opening any task's detail panel and confirming Note appears first.

- [ ] **Step 1: Cut the Note section from its current position**

In `src/components/TaskDetailPanel.tsx`, the Note section currently sits after the Organize section (around lines 392–405). It looks like:

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

Remove it from its current location.

- [ ] **Step 2: Paste the Note section after the title input**

Place the Note section immediately after the title `<input>` block (around line 208) and before the `{/* Schedule */}` block:

```tsx
        <input
          ref={inputRef}
          className="task-detail-title-input"
          aria-label="Task title"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { setEditTitle(task.title); e.currentTarget.blur(); }
          }}
        />

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

        {/* Schedule: due date + recurrence — hidden for habit tasks */}
        {!isHabitTask && (
```

- [ ] **Step 3: Run full test suite**

```bash
npm run test
```

Expected: 229/229 pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/TaskDetailPanel.tsx
git commit -m "feat: move note section to top of task detail panel"
```

---

## Task 3: HabitItem Inline Note (Right of Title)

**Files:**
- Modify: `src/components/HabitItem.tsx`
- Modify: `src/app.css`

No automated test — verify by adding a note to a habit and checking the inline display.

- [ ] **Step 1: Remove wrapper div from HabitItem JSX**

In `src/components/HabitItem.tsx`, the current JSX has a `habit-item__title-wrap` column wrapper (lines 53–60):

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

Replace with title and note as direct children (no wrapper div):

```tsx
      <span className={`habit-item__title${completedToday ? ' habit-item__title--completed' : ''}`}>
        {title}
      </span>
      {note && (
        <span className="habit-item__note">{note}</span>
      )}
```

- [ ] **Step 2: Update CSS for inline layout**

In `src/app.css`, replace the `.habit-item__title-wrap`, `.habit-item__title`, and `.habit-item__note` blocks (lines 1268–1286):

Current:
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
.habit-item__note {
  font-size: 0.75rem;
  color: var(--fg-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Replace with (no wrapper class, title gets `flex: 1`, note is `flex: 0 0 auto` capped at `18ch`):

```css
.habit-item__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.habit-item__note {
  flex: 0 0 auto;
  max-width: 18ch;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: var(--fg-muted);
}
```

The `.habit-item__title-wrap` rule is fully removed (no longer referenced in JSX).

- [ ] **Step 3: Run full test suite**

```bash
npm run test
```

Expected: 229/229 pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/HabitItem.tsx src/app.css
git commit -m "feat: display habit note inline to the right of title"
```
