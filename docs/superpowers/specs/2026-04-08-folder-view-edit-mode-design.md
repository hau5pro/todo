# Folder View Edit Mode Design

**Date:** 2026-04-08

## Summary

Add an edit mode to `FolderView` that allows the user to reorder and delete lists within a folder. Also fix the group collapse chevron background appearing in ListView edit mode.

## FolderView Edit Mode

### State & Data

- Add `const [editMode, setEditMode] = useState(false)` to `FolderView`
- Pull `folderOrders`, `setFolderOrder` from `useSettings()`
- Pull `deleteList` from `useAppStore()`
- Sort `folderLists` using `applyOrder(folderLists, folderOrders[folderId] ?? [], l => l.id)` so the display order matches the saved order

### Header Toggle

- Add a `view-title-action-btn` pencil/checkmark button to the header (same pattern as ListView's task edit mode toggle)
- Pencil icon when not in edit mode; `CheckCircle` icon with `color: var(--success)` when active

### List Items

- Replace `Reorder.Group` wrapper around the list instead of the plain `motion.div`
- Each item becomes a `Reorder.Item` using `useDragControls`
- Grip handle (`GripVertical`) animates in when `editMode` is true (width 0→26, same animation as Sidebar's `SortableItem`)
- NavLink replaced by plain `div` in edit mode (not navigable while reordering)
- Delete button (`Trash2`) animates in on the right in edit mode; calls `deleteList(list.id)`
- On `Reorder.Group` reorder: `setFolderOrder(folderId, newOrder.map(l => l.id))`

### Patterns to Follow

- `SortableItem` in `Sidebar.tsx` — grip handle, delete button, NavLink↔div swap
- `TaskRow` in `ListView.tsx` — `Reorder.Item` + `useDragControls` pattern

## Group Chevron Background Fix (ListView)

`GroupSection` applies `group-header-collapse--expanded` unconditionally when not collapsed, giving it `background: var(--hover)`. In edit mode this looks out of place next to the grip handle.

**Fix:** Only apply `--expanded` when `!editMode`:
```tsx
className={`group-header-collapse${!collapsed && !editMode ? ' group-header-collapse--expanded' : ''}`}
```

## Files Changed

- `src/views/FolderView.tsx` — main feature
- `src/views/ListView.tsx` — chevron fix (one line)
