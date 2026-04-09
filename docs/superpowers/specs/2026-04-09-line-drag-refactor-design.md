# Line-Drag Refactor — Phase 2

**Date:** 2026-04-09
**Scope:** Replace `Reorder.Group`/`Reorder.Item` in ListView, FolderView, and DailyView with a shared pointer-based line-indicator drag system, matching the sidebar's existing approach.

---

## Background

The sidebar already uses a custom pointer-event + line-indicator drag system (introduced in the sidebar overhaul commit). The three task/list views still use Framer Motion's `Reorder.Group`/`Reorder.Item`, which behaves differently: it animates items in place during drag rather than showing a drop-line indicator. This inconsistency is the motivation for P2.

---

## Goals

- Consistent drag feel across sidebar, task lists, habit lists, and folder-list views.
- No per-item enter/exit animations on drag rows (matches sidebar behaviour).
- DRY: shared hook rather than duplicating the sidebar's drag logic into each view.
- No layout shift or behavioural regression for existing features (cross-group HTML5 drag in ListView is untouched).

---

## Architecture

### New file: `src/hooks/useLineDrag.ts`

A single hook encapsulating all drag state and side effects.

```ts
interface UseLineDragOptions {
  scrollRef: React.RefObject<HTMLElement | null>;
  onCommit: (dragId: string, context: string, newIds: string[]) => void;
}

interface UseLineDragReturn {
  dragId: string | null;
  startDrag: (e: React.PointerEvent, itemId: string, context: string) => void;
  ghostRef: React.RefObject<HTMLDivElement | null>;
  lineRef: React.RefObject<HTMLDivElement | null>;
}

export function useLineDrag(options: UseLineDragOptions): UseLineDragReturn
```

**Internal state/refs:**
- `dragId` — React state; triggers the drag effect when set
- `contextRef` — current drag context string
- `insertAfterRef` — id of item to insert after (`'__start__'` for first position)
- `itemsRef` — ordered list of `{ id, el }` for items in the active context
- `ghostRef` / `lineRef` — passed back to the view for portal rendering

**Effect (fires when `dragId` changes):**
1. Query `[data-reorder-context="${context}"]` to find the group container
2. Collect all `[data-reorder-id]` children into `itemsRef`
3. Imperatively add a dragging CSS class to the dragged element
4. Start a `requestAnimationFrame` edge-scroll loop using `scrollRef`
5. Bind `pointermove` → update ghost position, compute `insertAfterRef`, position line indicator
6. Bind `pointerup` → call `reinsert` to compute `newIds`, call `onCommit`, clean up
7. Bind `pointercancel` → clean up without committing
8. Return cleanup function that cancels RAF and removes listeners

**`reinsert` utility:**
Move `reinsert` from `Sidebar.tsx` into `src/utils/order.ts` so the hook can import it. Sidebar imports it from there instead of defining it locally.

---

## DOM Conventions

All drag containers use `data-reorder-context="<context>"`.
All drag items use `data-reorder-id="<id>"`.
These attributes are already used by the sidebar; the hook reads them the same way.

---

## Per-View Changes

### DailyView

- Single context: the `listId` string.
- Replace `Reorder.Group` → `<div data-reorder-context={listId}>`.
- Replace `Reorder.Item` → plain `<div data-reorder-id={row.task.id}>`.
- Remove `useDragControls` from `HabitRow`; pass `onPointerDown` to `DragHandle` instead.
- Remove `AnimatePresence` wrapper around habit items (no per-item animations).
- Ghost content: habit title.
- Scroll container: DailyView and FolderView don't have a dedicated scroll ref — the `useLineDrag` hook must accept `null` for `scrollRef` and skip edge scrolling in that case (the page body scroll is handled by the browser).

### FolderView

- Single context: `"folder-lists"`.
- Replace `Reorder.Group` → `<div data-reorder-context="folder-lists">`.
- Replace `Reorder.Item` → plain `<div data-reorder-id={list.id}>`.
- Remove `useDragControls` from `SortableListItem`.
- Ghost content: list name.

### ListView

Three reorder contexts managed by one hook instance:

| Context string | Items | Commit action |
|---|---|---|
| `"ungrouped"` | ungrouped task ids | `setListOrder` |
| `"groups"` | group name strings | `setListGroupOrder` |
| `groupName` (literal group name) | task ids within that group | `setListOrder` via `reorderGroupInGlobal` |

`onCommit` routes by context:
```ts
function handleReorderCommit(dragId: string, context: string, newIds: string[]) {
  if (context === 'ungrouped') {
    setListOrder(listId!, newIds);
  } else if (context === 'groups') {
    setListGroupOrder(listId!, newIds);
  } else {
    setListOrder(listId!, reorderGroupInGlobal(globalOrder, newIds));
  }
}
```

- `Reorder.Group` on ungrouped tasks → `<div data-reorder-context="ungrouped">`.
- `Reorder.Group` on group sections → `<div data-reorder-context="groups">`.
- `Reorder.Group` inside each `GroupSection` → `<div data-reorder-context={groupName}>`.
- All `Reorder.Item` → plain `<div data-reorder-id="...">`.
- Remove `useDragControls` from `TaskRow` and `GroupSection`.
- Ghost content: task title (ungrouped/group-tasks contexts) or group name (groups context).
- `draggingTaskId` state remains for HTML5 cross-group drag (unaffected).

---

## CSS

One new rule added to `app.css`:

```css
.task-row--dragging,
.folder-view-list-item-row--dragging {
  opacity: 0.4;
}
```

The hook adds/removes the dragging class imperatively (no React re-render during drag). Class names match existing `--editing` modifier conventions.

Group sections use a similar approach: `group-section--dragging` already exists in the CSS for HTML5 drag; the reorder drag uses the same class imperatively.

---

## What Is Removed

- `Reorder.Group`, `Reorder.Item` imports from ListView, FolderView, DailyView.
- `useDragControls` calls and `dragControls` props in TaskRow, HabitRow, SortableListItem, GroupSection.
- `taskItemVariants`, `habitItemVariants` animation variant objects (no longer applied per-item).
- `AnimatePresence` wrappers around individual drag rows (list-level entrance animations via `motion.div` on the container can stay if present).
- Local `reinsert` definition in `Sidebar.tsx` (replaced by import from utils).

---

## What Is Not Changed

- HTML5 drag-to-group feature in ListView (`draggable`, `onDragStart`, `onDragEnd` on task content divs).
- Sidebar drag implementation (already correct; only `reinsert` is extracted).
- Group section collapse/expand, rename, delete, confirm-delete modal.
- Completed tasks section.
- `Reorder` usage anywhere else in the codebase (none expected).
