# Line-Drag Refactor (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Framer Motion `Reorder.Group`/`Reorder.Item` in ListView, FolderView, and DailyView with the shared `useLineDrag` hook, matching the sidebar's pointer-based line-indicator drag system.

**Architecture:** A single `useLineDrag` hook extracts the sidebar's drag logic. It receives a `scrollRef` (or null) and an `onCommit` callback, exposes `startDrag`/`ghostRef`/`lineRef`, and manages all pointer events, RAF edge-scrolling, and line positioning imperatively. Views replace `Reorder.Group`/`Reorder.Item` with plain divs carrying `data-reorder-context`/`data-reorder-id` attributes and wire `startDrag` into their drag handle's `onPointerDown`.

**Tech Stack:** React 18, TypeScript, Vitest/jsdom, Framer Motion (kept for non-drag animations)

---

## File Map

| File | Change |
|---|---|
| `src/utils/order.ts` | Add exported `reinsert` (moved from Sidebar.tsx) |
| `src/tests/utils/order.test.ts` | Add `reinsert` tests |
| `src/hooks/useLineDrag.ts` | **New** — shared drag hook |
| `src/components/Sidebar.tsx` | Import `reinsert` from utils instead of defining locally |
| `src/app.css` | Add `.task-row--dragging` and `.folder-view-list-item-row--dragging` |
| `src/views/DailyView.tsx` | Replace Reorder with plain divs + useLineDrag |
| `src/views/FolderView.tsx` | Replace Reorder with plain divs + useLineDrag |
| `src/views/ListView.tsx` | Replace Reorder with plain divs + useLineDrag (3 contexts) |

---

## Task 1: Extract `reinsert` to `src/utils/order.ts`

**Files:**
- Modify: `src/utils/order.ts`
- Modify: `src/tests/utils/order.test.ts`
- Modify: `src/components/Sidebar.tsx` (import change only)

- [ ] **Step 1: Write failing tests for `reinsert`**

Add to `src/tests/utils/order.test.ts` below the existing `applyOrder` suite:

```ts
import { applyOrder, reinsert } from '../../utils/order';

// ... existing applyOrder tests unchanged ...

describe('reinsert', () => {
  it('moves item to start when insertAfter is __start__', () => {
    expect(reinsert(['a', 'b', 'c'], 'c', '__start__')).toEqual(['c', 'a', 'b']);
  });

  it('moves item to start when insertAfter is null', () => {
    expect(reinsert(['a', 'b', 'c'], 'b', null)).toEqual(['b', 'a', 'c']);
  });

  it('moves item after the specified id', () => {
    expect(reinsert(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
  });

  it('handles moving item that is already in position', () => {
    expect(reinsert(['a', 'b', 'c'], 'b', 'a')).toEqual(['a', 'b', 'c']);
  });

  it('appends at end when insertAfter id is not found', () => {
    expect(reinsert(['a', 'b', 'c'], 'a', 'z')).toEqual(['b', 'c', 'a']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/tests/utils/order.test.ts
```

Expected: FAIL — `reinsert is not a function` (not exported yet)

- [ ] **Step 3: Add `reinsert` to `src/utils/order.ts`**

```ts
/**
 * Apply a saved order to an array of items.
 * Items present in `order` come first (in order), followed by any items not yet in the order.
 */
export function applyOrder<T>(items: T[], order: string[], getId: (item: T) => string): T[] {
  if (order.length === 0) return items;
  const map = new Map(items.map((t) => [getId(t), t]));
  const ordered = order.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  const rest = items.filter((t) => !order.includes(getId(t)));
  return [...ordered, ...rest];
}

/**
 * Re-insert a dragged item into an ordered list after a given anchor.
 * insertAfter === null | '__start__' puts it first.
 */
export function reinsert(ids: string[], dragId: string, insertAfter: string | null): string[] {
  const without = ids.filter((id) => id !== dragId);
  if (!insertAfter || insertAfter === '__start__') return [dragId, ...without];
  const idx = without.indexOf(insertAfter);
  if (idx === -1) return [...without, dragId];
  return [...without.slice(0, idx + 1), dragId, ...without.slice(idx + 1)];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/tests/utils/order.test.ts
```

Expected: PASS — all `reinsert` tests green

- [ ] **Step 5: Update `Sidebar.tsx` to import `reinsert` from utils**

Remove the local `reinsert` definition (lines 20–26):
```ts
// DELETE this block:
function reinsert(ids: string[], dragId: string, insertAfter: string | null): string[] {
  const without = ids.filter((id) => id !== dragId);
  if (!insertAfter || insertAfter === '__start__') return [dragId, ...without];
  const idx = without.indexOf(insertAfter);
  if (idx === -1) return [...without, dragId];
  return [...without.slice(0, idx + 1), dragId, ...without.slice(idx + 1)];
}
```

Add to the existing utils import at the top of `Sidebar.tsx`:
```ts
import { reinsert } from '../utils/order';
```

- [ ] **Step 6: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/utils/order.ts src/tests/utils/order.test.ts src/components/Sidebar.tsx
git commit -m "refactor: move reinsert to utils/order"
```

---

## Task 2: Create `src/hooks/useLineDrag.ts`

**Files:**
- Create: `src/hooks/useLineDrag.ts`

- [ ] **Step 1: Write the hook**

Create `src/hooks/useLineDrag.ts` with this content:

```ts
import { useState, useRef, useEffect, useCallback } from 'react';
import { reinsert } from '../utils/order';

interface UseLineDragOptions {
  scrollRef: React.RefObject<HTMLElement | null>;
  onCommit: (dragId: string, context: string, newIds: string[]) => void;
}

interface UseLineDragReturn {
  dragId: string | null;
  startDrag: (e: React.PointerEvent, itemId: string, context: string, draggingClass?: string) => void;
  ghostRef: React.RefObject<HTMLDivElement | null>;
  lineRef: React.RefObject<HTMLDivElement | null>;
}

export function useLineDrag({ scrollRef, onCommit }: UseLineDragOptions): UseLineDragReturn {
  const [dragId, setDragId] = useState<string | null>(null);
  const contextRef = useRef<string | null>(null);
  const draggingClassRef = useRef<string | undefined>(undefined);
  const insertAfterRef = useRef<string | null>(null);
  const itemsRef = useRef<{ id: string; el: HTMLElement }[]>([]);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const pointerYRef = useRef<number>(0);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const startDrag = useCallback((
    e: React.PointerEvent,
    itemId: string,
    context: string,
    draggingClass?: string,
  ) => {
    e.preventDefault();
    contextRef.current = context;
    draggingClassRef.current = draggingClass;
    setDragId(itemId);
  }, []);

  useEffect(() => {
    if (!dragId) return;
    const context = contextRef.current;
    if (!context) return;

    const group = document.querySelector(`[data-reorder-context="${context}"]`);
    if (!group) return;

    itemsRef.current = Array.from(group.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-reorder-id'))
      .map((el) => ({ id: el.getAttribute('data-reorder-id')!, el }));

    const draggedEl = group.querySelector<HTMLElement>(`[data-reorder-id="${dragId}"]`);
    const cls = draggingClassRef.current;
    if (cls && draggedEl) draggedEl.classList.add(cls);

    const rafId = { current: 0 };
    function edgeScrollLoop() {
      const scrollEl = scrollRef.current;
      if (scrollEl) {
        const { top, bottom } = scrollEl.getBoundingClientRect();
        const y = pointerYRef.current;
        const ZONE = 64, MAX = 14;
        if (y > top && y < top + ZONE)
          scrollEl.scrollTop -= MAX * (1 - (y - top) / ZONE);
        else if (y > bottom - ZONE && y < bottom)
          scrollEl.scrollTop += MAX * (1 - (bottom - y) / ZONE);
      }
      rafId.current = requestAnimationFrame(edgeScrollLoop);
    }
    rafId.current = requestAnimationFrame(edgeScrollLoop);

    function onMove(e: PointerEvent) {
      pointerYRef.current = e.clientY;
      if (ghostRef.current) {
        ghostRef.current.style.display = 'flex';
        ghostRef.current.style.left = `${e.clientX + 14}px`;
        ghostRef.current.style.top = `${e.clientY + 10}px`;
      }

      const items = itemsRef.current;
      let insertAfter: string | null = '__start__';
      for (const { id, el } of items) {
        if (id === dragId) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientY > rect.top + rect.height / 2) insertAfter = id;
      }
      insertAfterRef.current = insertAfter;

      if (lineRef.current && items.length > 1) {
        let lineY: number | null = null;
        if (insertAfter === '__start__') {
          const first = items.find(({ id }) => id !== dragId);
          if (first) lineY = first.el.getBoundingClientRect().top;
        } else {
          const after = items.find(({ id }) => id === insertAfter);
          if (after) lineY = after.el.getBoundingClientRect().bottom;
        }
        if (lineY !== null) {
          const groupRect = group!.getBoundingClientRect();
          lineRef.current.style.opacity = '1';
          lineRef.current.style.top = `${lineY}px`;
          lineRef.current.style.left = `${groupRect.left + 4}px`;
          lineRef.current.style.width = `${groupRect.width - 8}px`;
        }
      }
    }

    function cleanup() {
      if (cls && draggedEl) draggedEl.classList.remove(cls);
      if (ghostRef.current) ghostRef.current.style.display = 'none';
      if (lineRef.current) lineRef.current.style.opacity = '0';
      itemsRef.current = [];
      insertAfterRef.current = null;
    }

    function onUp() {
      const newIds = reinsert(
        itemsRef.current.map(({ id }) => id),
        dragId!,
        insertAfterRef.current,
      );
      onCommitRef.current(dragId!, context!, newIds);
      cleanup();
      setDragId(null);
    }

    function onCancel() {
      cleanup();
      setDragId(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cleanup();
    };
  }, [dragId]);

  return { dragId, startDrag, ghostRef, lineRef };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLineDrag.ts
git commit -m "feat: add useLineDrag hook"
```

---

## Task 3: Update DailyView

**Files:**
- Modify: `src/views/DailyView.tsx`
- Modify: `src/app.css`

- [ ] **Step 1: Add CSS for dragging states to `src/app.css`**

Find the existing `.nav-item-row--dragging` rule (around line 2081):
```css
.nav-item-row--dragging {
  opacity: 0.35;
  pointer-events: none;
}
```

Add immediately after it:
```css
.task-row--dragging,
.folder-view-list-item-row--dragging {
  opacity: 0.4;
  pointer-events: none;
}
```

- [ ] **Step 2: Rewrite `src/views/DailyView.tsx`**

Replace the entire file with:

```tsx
import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, CheckCircle } from 'lucide-react';
import { DragHandle, DeleteButton } from '../components/EditControls';
import { useHabits } from '../hooks/useHabits';
import { useLineDrag } from '../hooks/useLineDrag';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useSettings } from '../contexts/SettingsContext';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion } from '../db/habits';
import { requestSync } from '../sync/orchestrator';
import { LIST_TYPE_LABELS } from '../types';
import { getListIcon } from '../config/listIcons';
import { ICON_SIZE } from '../config/constants';
import type { HabitRow } from '../hooks/useHabits';
import { applyOrder } from '../utils/order';

function HabitRow({ row, editMode, onToggle, onSelect, onDelete, isSelected, onReorderStart }: {
  row: HabitRow; editMode: boolean;
  onToggle: () => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
  onReorderStart?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      data-reorder-id={row.task.id}
      className={`task-row${editMode ? ' task-row--editing' : ''}`}
      style={{ cursor: 'default' }}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} onPointerDown={onReorderStart} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <HabitItem
          title={row.task.title}
          completedToday={row.completedToday}
          streak={row.streak}
          onToggle={onToggle}
          onSelect={editMode ? undefined : onSelect}
          isSelected={!editMode && isSelected}
        />
      </div>
      <DeleteButton show={editMode} onClick={onDelete} title="Delete habit" />
    </div>
  );
}

export function DailyView() {
  const { listId } = useParams<{ listId: string }>();
  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const addTask = useAppStore((s) => s.addTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const { rows, isLoading, reload, today } = useHabits(listId!);
  const [newTitle, setNewTitle] = useState('');
  const [habitEditMode, setHabitEditMode] = useState(false);

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
  const { listOrders, setListOrder } = useSettings();
  const prevDetail = useRef(detail);
  useEffect(() => {
    if (prevDetail.current !== null && detail === null) reload();
    prevDetail.current = detail;
  }, [detail]);

  useEffect(() => {
    setHabitEditMode(false);
  }, [listId]);

  const scrollRef = useRef<HTMLElement>(null);
  const { dragId, startDrag, ghostRef, lineRef } = useLineDrag({
    scrollRef,
    onCommit: (_dragId, _context, newIds) => {
      setListOrder(listId!, newIds);
    },
  });

  if (isLoading) return null;

  const orderedRows = applyOrder(rows, listOrders[listId!] ?? [], (r) => r.task.id);

  const ghostRow = dragId ? orderedRows.find((r) => r.task.id === dragId) : null;

  async function handleToggle(taskId: string) {
    await toggleHabitCompletion(taskId, today);
    reload();
    requestSync();
  }

  async function commitAdd() {
    if (!newTitle.trim()) return;
    await addTask(listId!, newTitle.trim());
    setNewTitle('');
    reload();
    closeDetail();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await commitAdd();
  }

  return (
    <>
      {ghostRow && createPortal(
        <div ref={ghostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
          {ghostRow.task.title}
        </div>,
        document.body
      )}
      {createPortal(
        <div ref={lineRef} className="nav-reorder-line" style={{ opacity: 0 }} />,
        document.body
      )}
      <div>
        <div className="view-header">
          {list && getListIcon(list, 20) && <span className="view-title-icon">{getListIcon(list, 20)}</span>}
          <div className="view-title-row">
            <h1 className="view-title">{list?.name ?? 'Habits'}</h1>
            <span className="view-title-actions">
              <button
                className="view-title-action-btn"
                onClick={() => setHabitEditMode((m) => !m)}
                title={habitEditMode ? 'Done editing' : 'Edit habits'}
                style={habitEditMode ? { color: 'var(--success)' } : undefined}
              >
                {habitEditMode
                  ? <CheckCircle size={ICON_SIZE} />
                  : <Pencil size={ICON_SIZE} />}
              </button>
            </span>
          </div>
          <p className="view-subtitle">{list ? LIST_TYPE_LABELS[list.type] : 'daily'}</p>
        </div>
        <div className="view-body">
          <form onSubmit={handleAdd}>
            <input
              className="add-task-input"
              placeholder="+ Add habit"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={commitAdd}
            />
          </form>
          <div data-reorder-context={listId}>
            {orderedRows.map((row) => (
              <HabitRow
                key={row.task.id}
                row={row}
                editMode={habitEditMode}
                onToggle={() => handleToggle(row.task.id)}
                onSelect={() => detail?.task.id === row.task.id ? closeDetail() : openDetail({ task: row.task })}
                onDelete={() => removeTask(row.task.id, listId!).then(reload)}
                isSelected={detail?.task.id === row.task.id}
                onReorderStart={(e) => startDrag(e, row.task.id, listId!, 'task-row--dragging')}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Smoke-test in the browser**

```bash
npm run dev
```

Open a Daily/Habit list. Enter edit mode (pencil icon). Drag a habit row by its grip handle. Verify:
- Ghost label appears under cursor
- Blue drop-line appears between rows
- Releasing commits the new order (persists after refresh)
- No layout shift during drag

- [ ] **Step 5: Commit**

```bash
git add src/views/DailyView.tsx src/app.css
git commit -m "feat: replace Reorder with useLineDrag in DailyView"
```

---

## Task 4: Update FolderView

**Files:**
- Modify: `src/views/FolderView.tsx`

- [ ] **Step 1: Rewrite `src/views/FolderView.tsx`**

Replace the entire file with:

```tsx
import { useParams, NavLink, Navigate, useNavigate, useMatch } from 'react-router-dom';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Folder, List, Pencil, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { DragHandle, DeleteButton } from '../components/EditControls';
import { useLineDrag } from '../hooks/useLineDrag';
import { useAppStore } from '../store';
import { useSettings } from '../contexts/SettingsContext';
import { applyOrder } from '../utils/order';
import { getListIcon } from '../config/listIcons';
import { ICON_SIZE } from '../config/constants';
import { ease } from '../utils/easing';
import type { List as ListType } from '../types';

const headerVariants = {
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: ease.out } },
};

function SortableListItem({
  list,
  editMode,
  folderId,
  onReorderStart,
}: {
  list: ListType;
  editMode: boolean;
  folderId: string;
  onReorderStart?: (e: React.PointerEvent) => void;
}) {
  const deleteList = useAppStore((s) => s.deleteList);
  const { folderOrders, setFolderOrder } = useSettings();
  const navigate = useNavigate();
  const match = useMatch(`/list/${list.id}`);

  async function handleDelete() {
    const currentOrder = folderOrders[folderId] ?? [];
    setFolderOrder(folderId, currentOrder.filter((id) => id !== list.id));
    await deleteList(list.id);
    if (match) navigate(`/folder/${folderId}`);
  }

  return (
    <div
      data-reorder-id={list.id}
      className={`folder-view-list-item-row${editMode ? ' folder-view-list-item-row--editing' : ''}`}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} onPointerDown={onReorderStart} />
      </div>

      {editMode ? (
        <div className="folder-view-list-item">
          <span className="folder-view-list-icon">
            {getListIcon(list, ICON_SIZE) ?? <List size={ICON_SIZE} />}
          </span>
          <span className="folder-view-list-name">{list.name}</span>
        </div>
      ) : (
        <NavLink to={`/list/${list.id}`} className="folder-view-list-item" data-nav-row>
          <span className="folder-view-list-icon">
            {getListIcon(list, ICON_SIZE) ?? <List size={ICON_SIZE} />}
          </span>
          <span className="folder-view-list-name">{list.name}</span>
        </NavLink>
      )}

      <DeleteButton show={editMode} onClick={handleDelete} title="Delete list" />
    </div>
  );
}

export function FolderView() {
  const { folderId } = useParams<{ folderId: string }>();
  const folders = useAppStore((s) => s.folders);
  const lists = useAppStore((s) => s.lists);
  const { folderOrders, setFolderOrder } = useSettings();
  const [editMode, setEditMode] = useState(false);

  const folder = folders.find((f) => f.id === folderId);
  const rawFolderLists = lists.filter((l) => l.folder_id === folderId && !l.deleted_at);
  const folderLists = applyOrder(rawFolderLists, folderOrders[folderId!] ?? [], (l) => l.id);

  const scrollRef = useRef<HTMLElement>(null);
  const { dragId, startDrag, ghostRef, lineRef } = useLineDrag({
    scrollRef,
    onCommit: (_dragId, _context, newIds) => {
      setFolderOrder(folderId!, newIds);
    },
  });

  const ghostList = dragId ? folderLists.find((l) => l.id === dragId) : null;

  if (!folder) return <Navigate to="/" replace />;

  return (
    <>
      {ghostList && createPortal(
        <div ref={ghostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
          {getListIcon(ghostList, ICON_SIZE) ?? <List size={ICON_SIZE} />}
          {ghostList.name}
        </div>,
        document.body
      )}
      {createPortal(
        <div ref={lineRef} className="nav-reorder-line" style={{ opacity: 0 }} />,
        document.body
      )}
      <div>
        <motion.div variants={headerVariants} initial="hidden" animate="show">
          <motion.div variants={itemVariants} className="view-header">
            <span className="view-title-icon"><Folder size={20} /></span>
            <div className="view-title-row">
              <h1 className="view-title">{folder.name}</h1>
              <span className="view-title-actions">
                <button
                  className="view-title-action-btn"
                  onClick={() => setEditMode((m) => !m)}
                  title={editMode ? 'Done editing' : 'Edit lists'}
                  style={editMode ? { color: 'var(--success)' } : undefined}
                >
                  {editMode ? <CheckCircle size={ICON_SIZE} /> : <Pencil size={ICON_SIZE} />}
                </button>
              </span>
            </div>
            <p className="view-subtitle">{folderLists.length} {folderLists.length === 1 ? 'list' : 'lists'}</p>
          </motion.div>
        </motion.div>

        <div className="folder-view-lists view-body" data-reorder-context="folder-lists">
          {folderLists.map((list) => (
            <SortableListItem
              key={list.id}
              list={list}
              editMode={editMode}
              folderId={folderId!}
              onReorderStart={(e) => startDrag(e, list.id, 'folder-lists', 'folder-view-list-item-row--dragging')}
            />
          ))}
          {folderLists.length === 0 && (
            <motion.p variants={itemVariants} className="empty-state">
              No lists in this folder.
            </motion.p>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Smoke-test in the browser**

Open a folder view. Enter edit mode. Drag a list row by its grip. Verify:
- Ghost appears with list icon + name
- Drop line positions correctly
- Order commits on release, persists after refresh

- [ ] **Step 4: Commit**

```bash
git add src/views/FolderView.tsx
git commit -m "feat: replace Reorder with useLineDrag in FolderView"
```

---

## Task 5: Update ListView — TaskRow and GroupSection

**Files:**
- Modify: `src/views/ListView.tsx`

This task updates the two inner components (`TaskRow`, `GroupSection`) to use plain divs with `data-reorder-id`. The outer `Reorder.Group` wrappers and hook wiring happen in Task 6.

- [ ] **Step 1: Update `TaskRow` in `ListView.tsx`**

Find the `TaskRow` function (starting around line 51). Replace `Reorder.Item` with a plain div and remove `dragControls`. The new signature adds `onReorderStart`.

**Before:**
```tsx
function TaskRow({
  task, editMode, today, dragging, onDragStart, onDragEnd,
  onToggle, onSelect, onDelete, isSelected,
}: {
  task: Task; editMode: boolean; today: string; dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggle: () => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={task}
      dragListener={false}
      dragControls={dragControls}
      variants={taskItemVariants}
      className={`task-row${editMode ? ' task-row--editing' : ''}`}
      style={{ cursor: editMode ? 'grab' : 'default', opacity: dragging ? 0.4 : 1 }}
      transition={{ layout: { duration: 0.08, ease: 'easeOut' } }}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} dragControls={dragControls} />
      </div>
```

**After:**
```tsx
function TaskRow({
  task, editMode, today, dragging, onDragStart, onDragEnd,
  onToggle, onSelect, onDelete, isSelected, onReorderStart,
}: {
  task: Task; editMode: boolean; today: string; dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggle: () => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
  onReorderStart?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      data-reorder-id={task.id}
      className={`task-row${editMode ? ' task-row--editing' : ''}`}
      style={{ cursor: editMode ? 'grab' : 'default', opacity: dragging ? 0.4 : 1 }}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} onPointerDown={onReorderStart} />
      </div>
```

Also update the closing tag from `</Reorder.Item>` to `</div>` (around line 103).

- [ ] **Step 2: Update `GroupSection` — remove `onReorder`/`dragControls`, add `startDrag`**

Find `GroupSection` (starting around line 107). Make these changes:

**Props — remove `onReorder: (newGlobalOrder: string[]) => void` and `globalOrder: string[]`, add `startDrag`:**
```tsx
function GroupSection({
  groupName, tasks, editMode, today, listId, draggingTaskId,
  onToggle, onSelect, onDelete, onRename, onDeleteGroup, onTaskDragStart, onTaskDragEnd, selectedTaskId,
  startDrag,
}: {
  groupName: string;
  tasks: Task[];
  editMode: boolean;
  today: string;
  listId: string;
  draggingTaskId: string | null;
  onToggle: (task: Task) => void;
  onSelect: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRename: (oldName: string, newName: string) => void;
  onDeleteGroup: (name: string) => void;
  onTaskDragStart: (taskId: string) => void;
  onTaskDragEnd: () => void;
  selectedTaskId: string | undefined;
  startDrag: (e: React.PointerEvent, id: string, context: string, cls?: string) => void;
})
```

**Remove `dragControls` and `handleGroupReorder`:**
```tsx
// DELETE:
const dragControls = useDragControls();

// DELETE the entire handleGroupReorder function:
function handleGroupReorder(reordered: Task[]) {
  onReorder(reorderGroupInGlobal(globalOrder, reordered.map((t) => t.id)));
}
```

**Replace `Reorder.Item` outer element with plain div:**

```tsx
// BEFORE:
return (
  <Reorder.Item
    as="div"
    value={groupName}
    dragListener={false}
    dragControls={dragControls}
    className={[
      'group-section',
      draggingTaskId ? 'group-section--dragging' : '',
      isDragOver ? 'group-section--drag-over' : '',
    ].filter(Boolean).join(' ')}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
  >

// AFTER:
return (
  <div
    data-reorder-id={groupName}
    className={[
      'group-section',
      draggingTaskId ? 'group-section--dragging' : '',
      isDragOver ? 'group-section--drag-over' : '',
    ].filter(Boolean).join(' ')}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
  >
```

Also update the closing tag from `</Reorder.Item>` to `</div>`.

**Update the DragHandle in the group header to use `startDrag`:**

```tsx
// BEFORE:
<DragHandle show={editMode && !editingName} dragControls={dragControls} />

// AFTER:
<DragHandle
  show={editMode && !editingName}
  onPointerDown={(e) => startDrag(e, groupName, 'groups', 'group-section--dragging')}
/>
```

**Replace inner `Reorder.Group` with plain div and pass `onReorderStart` to each `TaskRow`:**

```tsx
// BEFORE (inside the collapsed AnimatePresence):
<Reorder.Group as="div" axis="y" values={tasks} onReorder={handleGroupReorder}
  variants={taskListVariants} initial="hidden" animate="show"
>
  <AnimatePresence>
    {tasks.map((task) => (
      <TaskRow
        key={task.id}
        task={task}
        editMode={editMode}
        today={today}
        dragging={task.id === draggingTaskId}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', task.id);
          onTaskDragStart(task.id);
        }}
        onDragEnd={onTaskDragEnd}
        onToggle={() => onToggle(task)}
        onSelect={() => onSelect(task)}
        onDelete={() => onDelete(task)}
        isSelected={selectedTaskId === task.id}
      />
    ))}
  </AnimatePresence>
</Reorder.Group>

// AFTER:
<div data-reorder-context={groupName}>
  {tasks.map((task) => (
    <TaskRow
      key={task.id}
      task={task}
      editMode={editMode}
      today={today}
      dragging={task.id === draggingTaskId}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        onTaskDragStart(task.id);
      }}
      onDragEnd={onTaskDragEnd}
      onToggle={() => onToggle(task)}
      onSelect={() => onSelect(task)}
      onDelete={() => onDelete(task)}
      isSelected={selectedTaskId === task.id}
      onReorderStart={(e) => startDrag(e, task.id, groupName, 'task-row--dragging')}
    />
  ))}
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

The file will have unused imports at this point (`Reorder`, `useDragControls`, `taskItemVariants`) — TypeScript will still compile. Leave them in place; they'll be cleaned up in Task 6.

```bash
npx tsc --noEmit
```

Expected: no type errors (unused variable warnings may appear but won't block compilation)

---

## Task 6: Wire ListView — Hook, Outer Groups, Portals, Remove Unused Imports

**Files:**
- Modify: `src/views/ListView.tsx`

- [ ] **Step 1: Add `useLineDrag` import and hook instantiation**

Add `useLineDrag` import at the top of `ListView.tsx`:
```ts
import { useLineDrag } from '../hooks/useLineDrag';
import { createPortal } from 'react-dom';
```

Inside the `ListView` function body, after the existing `useRef`/`useState` declarations (around line 358), add:

```tsx
const scrollRef = useRef<HTMLElement>(null);
const { dragId, startDrag, ghostRef, lineRef } = useLineDrag({
  scrollRef,
  onCommit: (id, context, newIds) => {
    if (context === 'ungrouped') {
      setListOrder(listId!, newIds);
    } else if (context === 'groups') {
      setListGroupOrder(listId!, newIds);
    } else {
      setListOrder(listId!, reorderGroupInGlobal(globalOrder, newIds));
    }
  },
});
```

- [ ] **Step 2: Compute ghost label for portals**

After the `orderedActive`/`ungroupedTasks`/`allGroupNames` derivations (around line 422), add:

```tsx
const ghostTask = dragId ? activeTasks.find((t) => t.id === dragId) : null;
const ghostLabel = ghostTask?.title ?? (dragId && allGroupNames.includes(dragId) ? dragId : null);
```

- [ ] **Step 3: Add portals to the JSX**

Wrap the existing `return (` in a fragment and add ghost + line portals at the top:

```tsx
return (
  <>
    {ghostLabel !== null && createPortal(
      <div ref={ghostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
        {ghostLabel}
      </div>,
      document.body
    )}
    {createPortal(
      <div ref={lineRef} className="nav-reorder-line" style={{ opacity: 0 }} />,
      document.body
    )}
    <div>
      {/* ... existing view content ... */}
    </div>
  </>
);
```

Close the fragment `</>` at the end of the return.

- [ ] **Step 4: Replace `Reorder.Group` for ungrouped tasks**

Find (around line 633):
```tsx
<Reorder.Group as="div" axis="y" values={ungroupedTasks} onReorder={handleReorder}
  variants={taskListVariants} initial="hidden" animate="show"
>
  <AnimatePresence>
    {ungroupedTasks.map((task) => (
      <TaskRow
        key={task.id}
        task={task}
        editMode={taskEditMode}
        today={today}
        dragging={task.id === draggingTaskId}
        onDragStart={(e) => handleTaskDragStart(e, task.id)}
        onDragEnd={() => setDraggingTaskId(null)}
        onToggle={() => handleToggle(task)}
        onSelect={() => handleSelectTask(task)}
        onDelete={() => removeTask(task.id, listId!)}
        isSelected={detail?.task.id === task.id}
      />
    ))}
  </AnimatePresence>
</Reorder.Group>
```

Replace with:
```tsx
<div data-reorder-context="ungrouped">
  {ungroupedTasks.map((task) => (
    <TaskRow
      key={task.id}
      task={task}
      editMode={taskEditMode}
      today={today}
      dragging={task.id === draggingTaskId}
      onDragStart={(e) => handleTaskDragStart(e, task.id)}
      onDragEnd={() => setDraggingTaskId(null)}
      onToggle={() => handleToggle(task)}
      onSelect={() => handleSelectTask(task)}
      onDelete={() => removeTask(task.id, listId!)}
      isSelected={detail?.task.id === task.id}
      onReorderStart={(e) => startDrag(e, task.id, 'ungrouped', 'task-row--dragging')}
    />
  ))}
</div>
```

- [ ] **Step 5: Replace `Reorder.Group` for group sections**

Find (around line 657):
```tsx
<Reorder.Group as="div" axis="y" values={allGroupNames} onReorder={(names) => setListGroupOrder(listId!, names)}>
  {allGroupNames.map((groupName) => (
    <GroupSection
      key={groupName}
      groupName={groupName}
      tasks={groupMap.get(groupName) ?? []}
      editMode={taskEditMode}
      today={today}
      listId={listId!}
      globalOrder={globalOrder}
      draggingTaskId={draggingTaskId}
      onReorder={handleGroupReorder}
      onToggle={handleToggle}
      onSelect={handleSelectTask}
      onDelete={(task) => removeTask(task.id, listId!)}
      onRename={handleRenameGroup}
      onDeleteGroup={handleDeleteGroup}
      onTaskDragStart={(taskId) => setDraggingTaskId(taskId)}
      onTaskDragEnd={() => setDraggingTaskId(null)}
      selectedTaskId={detail?.task.id}
    />
  ))}
</Reorder.Group>
```

Replace with:
```tsx
<div data-reorder-context="groups">
  {allGroupNames.map((groupName) => (
    <GroupSection
      key={groupName}
      groupName={groupName}
      tasks={groupMap.get(groupName) ?? []}
      editMode={taskEditMode}
      today={today}
      listId={listId!}
      draggingTaskId={draggingTaskId}
      onToggle={handleToggle}
      onSelect={handleSelectTask}
      onDelete={(task) => removeTask(task.id, listId!)}
      onRename={handleRenameGroup}
      onDeleteGroup={handleDeleteGroup}
      onTaskDragStart={(taskId) => setDraggingTaskId(taskId)}
      onTaskDragEnd={() => setDraggingTaskId(null)}
      selectedTaskId={detail?.task.id}
      startDrag={startDrag}
    />
  ))}
</div>
```

- [ ] **Step 6: Remove now-unused code and imports**

Remove the `handleReorder` and `handleGroupReorder` functions (they were only used by `Reorder.Group`'s `onReorder` prop):
```tsx
// DELETE:
function handleReorder(reordered: Task[]) {
  setListOrder(listId!, reordered.map((t) => t.id));
}

function handleGroupReorder(newGlobalOrder: string[]) {
  setListOrder(listId!, newGlobalOrder);
}
```

Update the import line to remove `Reorder` and `useDragControls`:
```tsx
// BEFORE:
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';

// AFTER:
import { AnimatePresence, motion } from 'framer-motion';
```

Remove unused variant objects:
```tsx
// DELETE:
const taskItemVariants = {
  hidden: { opacity: 0, y: -10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const, delay: 0.05 } },
  exit:   { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' as const } },
};
```

Also remove from DailyView's import:
```tsx
// DailyView's imports already updated in Task 3. Confirm `Reorder` and `useDragControls` are not imported.
```

- [ ] **Step 7: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 8: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions to existing db/store/hook tests)

- [ ] **Step 9: Build check**

```bash
npm run build
```

Expected: build completes with no errors

- [ ] **Step 10: Smoke-test ListView in browser**

```bash
npm run dev
```

Open a list with tasks. Verify:
- **Ungrouped tasks**: Enter edit mode. Drag a task by its grip — ghost + line appear, order commits on release.
- **Group sections**: Drag a group header — group section moves.
- **Tasks within a group**: Drag a task within its group.
- **HTML5 cross-group drag**: Drag a task (by its content area) to another group — still works.
- **No layout shift** when entering edit mode.

- [ ] **Step 11: Commit**

```bash
git add src/views/ListView.tsx
git commit -m "feat: replace Reorder with useLineDrag in ListView"
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec requirement | Covered in |
|---|---|
| `useLineDrag` hook with `scrollRef`, `onCommit` | Task 2 |
| `reinsert` moved to `src/utils/order.ts` | Task 1 |
| DailyView: single context = listId, ghost = habit title, scrollRef = null | Task 3 |
| FolderView: context = "folder-lists", ghost = list name | Task 4 |
| ListView: 3 contexts, onCommit routes by context | Task 6 |
| No per-item enter/exit animations on drag rows | Tasks 3–6 (plain divs, no variants) |
| CSS `.task-row--dragging`, `.folder-view-list-item-row--dragging` | Task 3 |
| HTML5 cross-group drag in ListView untouched | Task 5–6 (draggable/onDragStart preserved) |
| Sidebar unmodified except `reinsert` import | Task 1 |
| `dragControls` / `useDragControls` removed from all views | Tasks 3–6 |
| `taskItemVariants`, `habitItemVariants` removed | Tasks 3, 6 |

**Type consistency check:**
- `startDrag(e, id, context, cls?)` — consistent across Tasks 2, 3, 4, 5, 6
- `onCommit(dragId, context, newIds)` — consistent across Tasks 2, 3, 4, 6
- `data-reorder-context` / `data-reorder-id` attributes — consistent with hook's DOM queries
