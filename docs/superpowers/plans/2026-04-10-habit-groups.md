# Habit Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make habit groups visible and manageable in DailyView and MyDayView, and replace ListView's body-drag cross-group mechanism with a dedicated icon button matching the sidebar's folder-assignment pattern.

**Architecture:** All three changes reuse existing infrastructure — `Task.group`, `listGroupOrders`/`setListGroupOrder` in SettingsContext, and `moveTaskToGroup`/`renameGroup`/`deleteGroup` in the store. DailyView gets a `HabitGroupSection` component mirroring ListView's `GroupSection`. MyDayView gets read-only group separators. ListView's cross-group trigger moves from body to a `FolderInput` button in `nav-item-drag-zone`.

**Tech Stack:** React 18, TypeScript, Zustand, Framer Motion, Lucide React, IndexedDB via existing db helpers

---

## File map

| File | Change |
|---|---|
| `src/views/ListView.tsx` | Move cross-group drag trigger from task body → `FolderInput` button in drag zone |
| `src/views/DailyView.tsx` | Add `HabitGroupSection`, ungrouped drop zone, cross-group drag, group order sync |
| `src/views/MyDayView.tsx` | Update `orderedHabits` memo; render per-list + per-group separators |

---

## Task 1: ListView — move cross-group trigger to FolderInput button

**Files:**
- Modify: `src/views/ListView.tsx`

This removes the body-drag mechanism and replaces it with an explicit icon button in the drag zone, matching how the sidebar moves lists between folders.

- [ ] **Step 1: Add `FolderInput` to imports**

In `src/views/ListView.tsx`, update the lucide-react import line (currently line 3) to include `FolderInput`:

```tsx
import { Pencil, Trash2, ChevronDown, ChevronRight, Copy, List, CheckCircle, MoreHorizontal, Smile, FolderInput } from 'lucide-react';
```

- [ ] **Step 2: Update `TaskRow` — remove body-drag, add FolderInput button**

Replace the `TaskRow` component. The content div loses its `onPointerDown` and `touchAction`, and the drag zone gains a `FolderInput` button between the reorder handle and the delete button:

```tsx
function TaskRow({
  task, editMode, today, dragging,
  onToggle, onSelect, onDelete, isSelected, onReorderStart, onGroupDragStart,
}: {
  task: Task; editMode: boolean; today: string; dragging: boolean;
  onToggle: () => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
  onReorderStart?: (e: React.PointerEvent) => void;
  onGroupDragStart?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      data-reorder-id={task.id}
      className={`task-row${editMode ? ' task-row--editing' : ''}`}
      style={{ cursor: editMode ? 'grab' : 'default', opacity: dragging ? 0.4 : 1 }}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} onPointerDown={onReorderStart} />
        {editMode && <span className="nav-item-drag-zone-divider" />}
        {editMode && (
          <span
            className="task-edit-drag"
            title="Drag to move to group"
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onGroupDragStart?.(e);
            }}
          >
            <FolderInput size={ICON_SIZE} />
          </span>
        )}
        {editMode && <span className="nav-item-drag-zone-divider" />}
        <DeleteButton show={editMode} onClick={onDelete} title="Delete task" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <TaskItem
          title={task.title}
          completed={task.completed}
          dueDate={task.due_date}
          dueTime={task.due_time}
          today={today}
          onToggle={editMode ? undefined : onToggle}
          onSelect={editMode ? undefined : onSelect}
          isSelected={!editMode && isSelected}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the app builds and cross-group drag still works**

```bash
cd /home/hau5/projects/todo && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/ListView.tsx
git commit -m "refactor: move cross-group drag trigger from task body to FolderInput button"
```

---

## Task 2: DailyView — add HabitGroupSection component

**Files:**
- Modify: `src/views/DailyView.tsx`

Add a `HabitGroupSection` component and an ungrouped drop zone. This task adds the components but doesn't yet wire up cross-group drag (that's Task 3).

- [ ] **Step 1: Update imports in DailyView**

Replace the existing imports at the top of `src/views/DailyView.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, CheckCircle, ChevronDown, ChevronRight, MoreHorizontal, Trash2, FolderInput } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DragHandle, DeleteButton } from '../components/EditControls';
import { useHabits } from '../hooks/useHabits';
import { useLineDrag } from '../hooks/useLineDrag';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useSettings } from '../contexts/SettingsContext';
import { HabitItem } from '../components/HabitItem';
import { IconPicker } from '../components/IconPicker';
import { toggleHabitCompletion } from '../db/habits';
import { requestSync } from '../sync/orchestrator';
import { LIST_TYPE_LABELS } from '../types';
import { getListIcon } from '../config/listIcons';
import { ICON_SIZE } from '../config/constants';
import { focusLater } from '../utils/dom';
import { ease } from '../utils/easing';
import type { HabitRow } from '../hooks/useHabits';
import { applyOrder } from '../utils/order';
```

- [ ] **Step 2: Update `HabitRow` to accept a group-drag prop and show the FolderInput button**

Replace the existing `HabitRow` function with:

```tsx
function HabitRow({ row, editMode, onToggle, onSelect, onDelete, isSelected, onReorderStart, onGroupDragStart }: {
  row: HabitRow; editMode: boolean;
  onToggle: () => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
  onReorderStart?: (e: React.PointerEvent) => void;
  onGroupDragStart?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      data-reorder-id={row.task.id}
      className={`task-row${editMode ? ' task-row--editing' : ''}`}
      style={{ cursor: 'default' }}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} onPointerDown={onReorderStart} />
        {editMode && <span className="nav-item-drag-zone-divider" />}
        {editMode && (
          <span
            className="task-edit-drag"
            title="Drag to move to group"
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onGroupDragStart?.(e);
            }}
          >
            <FolderInput size={ICON_SIZE} />
          </span>
        )}
        {editMode && <span className="nav-item-drag-zone-divider" />}
        <DeleteButton show={editMode} onClick={onDelete} title="Delete habit" />
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
    </div>
  );
}
```

- [ ] **Step 3: Add `HabitGroupSection` component**

Add this component after `HabitRow` and before `DailyView`:

```tsx
function HabitGroupSection({
  groupName, rows, editMode,
  startDrag, onGroupDragStart, onToggle, onSelect, onDelete, onRename, onDeleteGroup, selectedTaskId,
}: {
  groupName: string;
  rows: HabitRow[];
  editMode: boolean;
  startDrag: (e: React.PointerEvent, id: string, context: string, cls?: string) => void;
  onGroupDragStart: (e: React.PointerEvent, taskId: string) => void;
  onToggle: (row: HabitRow) => void;
  onSelect: (row: HabitRow) => void;
  onDelete: (row: HabitRow) => void;
  onRename: (oldName: string, newName: string) => void;
  onDeleteGroup: (name: string) => void;
  selectedTaskId: string | undefined;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(groupName);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function startEditName() {
    setNameValue(groupName);
    setEditingName(true);
    setMenuOpen(false);
    focusLater(nameInputRef);
  }

  function commitEditName() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== groupName) onRename(groupName, trimmed);
    setEditingName(false);
  }

  return (
    <div
      data-reorder-id={groupName}
      data-group-id={groupName}
      className="group-section"
    >
      <div className={`group-header${editMode ? ' group-header--editing' : ''}`}>
        <div className="nav-item-drag-zone">
          <DragHandle show={editMode && !editingName} onPointerDown={(e) => startDrag(e, groupName, 'groups', 'group-section--dragging')} />
          {editMode && !editingName && <span className="nav-item-drag-zone-divider" />}
          <DeleteButton show={editMode && !editingName} onClick={() => setConfirmDelete(true)} title="Delete group" />
        </div>
        <button
          className={`group-header-collapse${!collapsed ? ' group-header-collapse--expanded' : ''}`}
          onClick={() => setCollapsed((p) => !p)}
          aria-label={collapsed ? 'Expand group' : 'Collapse group'}
        >
          {collapsed ? <ChevronRight size={ICON_SIZE} /> : <ChevronDown size={ICON_SIZE} />}
        </button>

        {editingName ? (
          <input
            ref={nameInputRef}
            className="group-header-name-input"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitEditName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEditName();
              if (e.key === 'Escape') setEditingName(false);
            }}
          />
        ) : (
          <span className="group-header-name" onClick={() => setCollapsed((p) => !p)}>
            {groupName} <span className="group-header-count">({rows.length})</span>
          </span>
        )}

        <div className="group-header-menu" ref={menuRef}>
          <button
            className="group-header-menu-btn"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label="Group actions"
          >
            <MoreHorizontal size={ICON_SIZE} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className="group-header-dropdown"
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.1 }}
              >
                <button className="group-header-dropdown-item" onClick={startEditName}>
                  <Pencil size={ICON_SIZE} /> Rename
                </button>
                <button
                  className="group-header-dropdown-item group-header-dropdown-item--danger"
                  onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                >
                  <Trash2 size={ICON_SIZE} /> Delete group
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="group-section__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2, ease: ease.out }}
            style={{ overflow: 'hidden' }}
          >
            <div data-reorder-context={groupName}>
              {rows.map((row) => (
                <HabitRow
                  key={row.task.id}
                  row={row}
                  editMode={editMode}
                  onToggle={() => onToggle(row)}
                  onSelect={() => onSelect(row)}
                  onDelete={() => onDelete(row)}
                  isSelected={selectedTaskId === row.task.id}
                  onReorderStart={(e) => startDrag(e, row.task.id, groupName, 'task-row--dragging')}
                  onGroupDragStart={(e) => onGroupDragStart(e, row.task.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div
              className="modal-popup"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="modal-popup__title">Delete "{groupName}"?</h3>
              <p className="modal-popup__body">Items will be moved to the main list, not deleted.</p>
              <div className="modal-popup__actions">
                <button className="btn-danger-sm" onClick={() => { onDeleteGroup(groupName); setConfirmDelete(false); }}>Delete group</button>
                <button className="btn-ghost-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 4: Verify the build still passes**

```bash
cd /home/hau5/projects/todo && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/DailyView.tsx
git commit -m "feat: add HabitGroupSection component to DailyView"
```

---

## Task 3: DailyView — wire up group rendering and cross-group drag in DailyView

**Files:**
- Modify: `src/views/DailyView.tsx`

Replace the flat render in `DailyView` with grouped rendering, cross-group drag logic, and group order sync — mirroring ListView exactly.

- [ ] **Step 1: Replace `DailyView` function body**

Replace the entire `export function DailyView()` with the following. Key additions vs the current version:
- Destructure `moveTaskToGroup`, `renameGroup`, `deleteGroup` from `useAppStore`
- Add `listGroupOrders`, `setListGroupOrder` from `useSettings`
- Add `draggingHabitId` state + cross-group pointer tracking effect
- Add second `useLineDrag` context for groups (same `onCommit` pattern as ListView)
- Add group-order auto-sync effect
- Split `orderedRows` into `ungroupedRows` + `groupMap` + `allGroupNames`
- Render ungrouped drop zone + `HabitGroupSection` list

```tsx
export function DailyView() {
  const { listId } = useParams<{ listId: string }>();
  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const { addTask, removeTask, moveTaskToGroup, renameGroup, deleteGroup } = useAppStore();
  const { rows, isLoading, reload, today } = useHabits(listId!);
  const [newTitle, setNewTitle] = useState('');
  const [habitEditMode, setHabitEditMode] = useState(false);
  const [draggingHabitId, setDraggingHabitId] = useState<string | null>(null);

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
  const { listOrders, setListOrder, listGroupOrders, setListGroupOrder } = useSettings();
  const prevDetail = useRef(detail);
  useEffect(() => {
    if (prevDetail.current !== null && detail === null) reload();
    prevDetail.current = detail;
  }, [detail]);

  useEffect(() => {
    setHabitEditMode(false);
  }, [listId]);

  const scrollRef = useRef<HTMLElement>(null);
  const groupGhostRef = useRef<HTMLDivElement>(null);
  const groupDragTargetRef = useRef<string | null>(null);

  const { dragId, startDrag, ghostRef, lineRef } = useLineDrag({
    scrollRef,
    onCommit: (_id, context, newIds) => {
      if (context === 'ungrouped') {
        setListOrder(listId!, newIds);
      } else if (context === 'groups') {
        setListGroupOrder(listId!, newIds);
      } else {
        // reorder within a named group — splice those ids back into global order
        const globalOrder = listOrders[listId!] ?? [];
        const groupSet = new Set(newIds);
        const result = [...globalOrder];
        const positions: number[] = [];
        for (let i = 0; i < result.length; i++) {
          if (groupSet.has(result[i])) positions.push(i);
        }
        newIds.filter((id) => globalOrder.includes(id)).forEach((id, i) => {
          result[positions[i]] = id;
        });
        const missing = newIds.filter((id) => !globalOrder.includes(id));
        setListOrder(listId!, [...result, ...missing]);
      }
    },
  });

  // Cross-group drag: pointer tracking
  useEffect(() => {
    if (!draggingHabitId) return;
    const habitId = draggingHabitId;

    function highlight(id: string | null) {
      if (!id) return;
      const cls = id === '__ungrouped__' ? 'ungrouped-drop-zone--active' : 'group-section--drag-over';
      document.querySelector(`[data-group-id="${id}"]`)?.classList.add(cls);
    }
    function unhighlight(id: string | null) {
      if (!id) return;
      const cls = id === '__ungrouped__' ? 'ungrouped-drop-zone--active' : 'group-section--drag-over';
      document.querySelector(`[data-group-id="${id}"]`)?.classList.remove(cls);
    }

    function onMove(e: PointerEvent) {
      if (groupGhostRef.current) {
        groupGhostRef.current.style.display = 'flex';
        groupGhostRef.current.style.left = `${e.clientX + 12}px`;
        groupGhostRef.current.style.top = `${e.clientY + 12}px`;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const groupEl = el?.closest('[data-group-id]');
      const newTarget = groupEl?.getAttribute('data-group-id') ?? null;
      if (newTarget !== groupDragTargetRef.current) {
        unhighlight(groupDragTargetRef.current);
        highlight(newTarget);
        groupDragTargetRef.current = newTarget;
      }
    }

    function cleanup() {
      unhighlight(groupDragTargetRef.current);
      groupDragTargetRef.current = null;
      if (groupGhostRef.current) groupGhostRef.current.style.display = 'none';
    }

    async function onUp() {
      const target = groupDragTargetRef.current;
      cleanup();
      if (target === '__ungrouped__') await moveTaskToGroup(habitId, listId!, null);
      else if (target) await moveTaskToGroup(habitId, listId!, target);
      setDraggingHabitId(null);
      reload();
    }

    function onCancel() { cleanup(); setDraggingHabitId(null); }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cleanup();
    };
  }, [draggingHabitId]);

  // Auto-sync group order: add any new groups that appear in rows
  useEffect(() => {
    const activeGroups = [...new Set(
      rows.filter((r) => r.task.group && !r.task.deleted_at).map((r) => r.task.group!)
    )];
    const saved = listGroupOrders[listId!] ?? [];
    const newOnes = activeGroups.filter((g) => !saved.includes(g));
    if (newOnes.length > 0) setListGroupOrder(listId!, [...saved, ...newOnes]);
  }, [rows, listId]);

  if (isLoading) return null;

  const globalOrder = listOrders[listId!] ?? [];
  const orderedRows = applyOrder(rows, globalOrder, (r) => r.task.id);

  const ungroupedRows = orderedRows.filter((r) => !r.task.group);
  const groupMap = new Map<string, HabitRow[]>();
  for (const row of orderedRows) {
    if (row.task.group) {
      if (!groupMap.has(row.task.group)) groupMap.set(row.task.group, []);
      groupMap.get(row.task.group)!.push(row);
    }
  }

  const savedGroupOrder = listGroupOrders[listId!] ?? [];
  const allGroupNames = [
    ...savedGroupOrder.filter((g) => groupMap.has(g)),
    ...Array.from(groupMap.keys()).filter((g) => !savedGroupOrder.includes(g)),
  ];

  const ghostRow = dragId ? orderedRows.find((r) => r.task.id === dragId) ?? (allGroupNames.includes(dragId) ? { task: { title: dragId } } : null) : null;
  const ghostLabel = ghostRow ? ('title' in ghostRow.task ? ghostRow.task.title : dragId) : null;
  const groupDragRow = draggingHabitId ? orderedRows.find((r) => r.task.id === draggingHabitId) : null;

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

  async function handleRenameGroup(oldName: string, newName: string) {
    await renameGroup(listId!, oldName, newName);
    const current = listGroupOrders[listId!] ?? [];
    setListGroupOrder(listId!, current.map((g) => (g === oldName ? newName : g)));
    reload();
  }

  async function handleDeleteGroup(name: string) {
    await deleteGroup(listId!, name);
    const current = listGroupOrders[listId!] ?? [];
    setListGroupOrder(listId!, current.filter((g) => g !== name));
    reload();
  }

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
      {groupDragRow && createPortal(
        <div ref={groupGhostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
          {groupDragRow.task.title}
        </div>,
        document.body
      )}
      <div>
        <div className="view-header">
          <div className="view-title-row">
            {list && getListIcon(list, 20) && <span className="view-title-icon">{getListIcon(list, 20)}</span>}
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
          {/* Ungrouped zone — also acts as drop target for removing group assignment */}
          <div
            data-group-id="__ungrouped__"
            className={[
              'ungrouped-drop-zone',
              habitEditMode ? 'ungrouped-drop-zone--editing' : '',
              draggingHabitId ? 'ungrouped-drop-zone--dragging' : '',
            ].filter(Boolean).join(' ')}
          >
            <form onSubmit={handleAdd}>
              <input
                className="add-task-input"
                placeholder="+ Add habit"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={commitAdd}
              />
            </form>
            <div data-reorder-context="ungrouped">
              {ungroupedRows.map((row) => (
                <HabitRow
                  key={row.task.id}
                  row={row}
                  editMode={habitEditMode}
                  onToggle={() => handleToggle(row.task.id)}
                  onSelect={() => detail?.task.id === row.task.id ? closeDetail() : openDetail({ task: row.task })}
                  onDelete={() => removeTask(row.task.id, listId!).then(reload)}
                  isSelected={detail?.task.id === row.task.id}
                  onReorderStart={(e) => startDrag(e, row.task.id, 'ungrouped', 'task-row--dragging')}
                  onGroupDragStart={(e) => { e.preventDefault(); setDraggingHabitId(row.task.id); }}
                />
              ))}
            </div>
          </div>

          {/* Group sections */}
          <div data-reorder-context="groups">
            {allGroupNames.map((groupName) => (
              <HabitGroupSection
                key={groupName}
                groupName={groupName}
                rows={groupMap.get(groupName) ?? []}
                editMode={habitEditMode}
                onToggle={(row) => handleToggle(row.task.id)}
                onSelect={(row) => detail?.task.id === row.task.id ? closeDetail() : openDetail({ task: row.task })}
                onDelete={(row) => removeTask(row.task.id, listId!).then(reload)}
                onRename={handleRenameGroup}
                onDeleteGroup={handleDeleteGroup}
                onGroupDragStart={(e, taskId) => { e.preventDefault(); setDraggingHabitId(taskId); }}
                selectedTaskId={detail?.task.id}
                startDrag={startDrag}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify the build passes**

```bash
cd /home/hau5/projects/todo && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Manually verify DailyView**

Open the app, go to a daily/habits list. If no habits have groups yet, everything should render as before (all in ungrouped zone). Open a habit's detail panel, assign it to a group (e.g. "morning"). Close the panel. The habit should now appear under a "morning" group section. Turn on edit mode: drag handle reorders within groups, `FolderInput` button drags to move between groups or back to ungrouped.

- [ ] **Step 4: Commit**

```bash
git add src/views/DailyView.tsx
git commit -m "feat: add full group rendering and cross-group drag to DailyView"
```

---

## Task 4: MyDayView — habit group separators

**Files:**
- Modify: `src/views/MyDayView.tsx`

Update the `orderedHabits` memo to produce per-list, per-group sections, then render group separators in the Habits section.

- [ ] **Step 1: Add `listGroupOrders` to the `useSettings` destructure**

In `MyDayView`, update the settings line (currently `const { listOrders } = useSettings();`) to also pull `listGroupOrders` and the lists from the store:

```tsx
const { listOrders, listGroupOrders } = useSettings();
const lists = useAppStore((s) => s.lists);
```

- [ ] **Step 2: Replace the `orderedHabits` memo**

Replace the existing `orderedHabits` useMemo with a version that returns structured sections:

```tsx
type HabitSection = {
  listId: string;
  listName: string;
  groupName: string | null;
  habits: typeof myDayHabits;
};

const habitSections = useMemo((): HabitSection[] => {
  const byList = new Map<string, typeof myDayHabits>();
  for (const h of myDayHabits) {
    const id = h.task.list_id;
    if (!byList.has(id)) byList.set(id, []);
    byList.get(id)!.push(h);
  }

  const sections: HabitSection[] = [];
  for (const [listId, habits] of byList) {
    const listName = lists.find((l) => l.id === listId)?.name ?? '';
    const ordered = applyOrder(habits, listOrders[listId] ?? [], (h) => h.task.id);

    // Split into ungrouped + named groups
    const ungrouped = ordered.filter((h) => !h.task.group);
    const groupMap = new Map<string, typeof myDayHabits>();
    for (const h of ordered) {
      if (h.task.group) {
        if (!groupMap.has(h.task.group)) groupMap.set(h.task.group, []);
        groupMap.get(h.task.group)!.push(h);
      }
    }

    const savedGroupOrder = listGroupOrders[listId] ?? [];
    const allGroupNames = [
      ...savedGroupOrder.filter((g) => groupMap.has(g)),
      ...Array.from(groupMap.keys()).filter((g) => !savedGroupOrder.includes(g)),
    ];

    if (ungrouped.length > 0) {
      sections.push({ listId, listName, groupName: null, habits: ungrouped });
    }
    for (const groupName of allGroupNames) {
      sections.push({ listId, listName, groupName, habits: groupMap.get(groupName) ?? [] });
    }
  }
  return sections;
}, [myDayHabits, listOrders, listGroupOrders, lists]);
```

- [ ] **Step 3: Update the Habits section render**

Replace the existing habits render block (the `orderedHabits.length > 0` section) with one that renders list-name dividers (when multiple lists) and group separators:

```tsx
{habitSections.length > 0 && (
  <motion.section variants={sectionVariants}>
    <div className="section-heading"><CalendarCheck size={ICON_SIZE} />Habits</div>
    {(() => {
      const multipleListsPresent = new Set(habitSections.map((s) => s.listId)).size > 1;
      let lastListId: string | null = null;
      return habitSections.map((section, i) => {
        const showListHeader = multipleListsPresent && section.listId !== lastListId;
        lastListId = section.listId;
        return (
          <div key={`${section.listId}-${section.groupName ?? '__ungrouped__'}-${i}`}>
            {showListHeader && (
              <div className="my-day-list-label">{section.listName}</div>
            )}
            {section.groupName && (
              <div className="my-day-group-label">{section.groupName}</div>
            )}
            {section.habits.map(({ task, completedToday, streak }) => (
              <HabitItem
                key={task.id}
                title={task.title}
                completedToday={completedToday}
                streak={streak}
                onToggle={() => handleHabitToggle(task.id)}
              />
            ))}
          </div>
        );
      });
    })()}
  </motion.section>
)}
```

- [ ] **Step 4: Add CSS for the new labels**

Check if `my-day-group-label` and `my-day-list-label` styles already exist in the stylesheet. Find the CSS file:

```bash
find /home/hau5/projects/todo/src -name "*.css" | head -5
```

Open the relevant CSS file and add at an appropriate location:

```css
.my-day-list-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary, var(--text-muted));
  padding: 0.75rem 0 0.25rem 0;
  opacity: 0.7;
}

.my-day-group-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-muted);
  padding: 0.5rem 0 0.15rem 0.25rem;
  border-bottom: 1px solid var(--border-subtle, var(--border));
  margin-bottom: 0.1rem;
  opacity: 0.75;
}
```

- [ ] **Step 5: Verify the build passes**

```bash
cd /home/hau5/projects/todo && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 6: Manually verify MyDayView**

Go to My Day. If you have habits with groups assigned (from Task 3 verification), they should appear with a subtle group label above each group's habits. Habits without a group render first with no label. If habits from two different daily lists are shown, a small list-name header appears above each list's block.

- [ ] **Step 7: Commit**

```bash
git add src/views/MyDayView.tsx src/index.css  # adjust CSS file path as found in Step 4
git commit -m "feat: show habit group separators in My Day"
```

---

## Self-review notes

- All three parts of the spec are covered: ListView refactor (Task 1), DailyView full groups (Tasks 2–3), MyDayView separators (Task 4).
- `reorderGroupInGlobal` logic is inlined in DailyView's `onCommit` rather than extracted, since it's a single-use helper — YAGNI.
- `HabitWithCompletion` is not imported in MyDayView since `typeof myDayHabits` is used inline, matching the existing pattern.
- CSS class names `my-day-group-label` / `my-day-list-label` are new — Step 4 includes finding the actual CSS file path before writing.
- `ghostRow` computation in DailyView handles both task ids and group name ids (same pattern as ListView's `ghostLabel`).
