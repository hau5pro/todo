# Habit Groups Design

**Date:** 2026-04-10
**Status:** Approved

## Overview

Habits (daily-type list tasks) already support a `group` field and can be assigned to groups via TaskDetailPanel, but groups are never rendered in DailyView or MyDayView. This feature makes groups visible and manageable in both views, and replaces ListView's body-drag cross-group mechanism with a dedicated icon button matching the sidebar's folder-assignment pattern.

## Scope

Three coordinated changes:

1. **ListView** — refactor cross-group assignment trigger (body-drag → dedicated button)
2. **DailyView** — add full group rendering + management
3. **MyDayView** — add lightweight habit group separators

---

## Part 1: ListView cross-group refactor

### What changes

The existing cross-group assignment works by pointer-down on the task body in edit mode. This is replaced with a dedicated `FolderInput` icon button in `nav-item-drag-zone`, matching the sidebar's folder-assignment pattern.

**`TaskRow` changes:**
- Remove `onPointerDown={editMode ? onGroupDragStart : undefined}` from the content div
- Add a `FolderInput` icon button in `nav-item-drag-zone` in edit mode (after the reorder handle, before delete button), which calls `onGroupDragStart` on pointer-down
- Remove `touchAction: 'none'` override from the content div (no longer needed)

**`GroupSection` changes:**
- Remove `onGroupDragStart` prop — groups themselves don't need it; only task rows do

**`ListView` changes:**
- `draggingTaskId` state, pointer event tracking (`pointermove`/`pointerup`/`pointercancel`), `groupGhostRef`, group highlight logic — all remain, only the trigger point moves
- Remove `onGroupDragStart` from `GroupSection` usage

### Result

Body no longer hijacks pointer events in edit mode. Interaction is explicit and consistent with sidebar.

---

## Part 2: DailyView groups

### Structure

DailyView gains the same group layout as ListView:

- **Ungrouped zone** (`data-group-id="__ungrouped__"`): renders above all group sections, contains ungrouped habits and the add-habit input
- **`HabitGroupSection` component**: one per named group, rendered below the ungrouped zone

### `HabitGroupSection`

Mirrors `GroupSection` from ListView:
- Collapse/expand toggle
- Group name display; rename via inline input
- `⋯` menu with Rename and Delete group actions
- Drag handle (edit mode) to reorder groups — uses existing `useLineDrag` with context `'groups'`
- `data-reorder-id={groupName}` and `data-group-id={groupName}` attributes
- Confirm-delete modal: "Items will be moved to the main list, not deleted."

### `HabitRow` in edit mode

Each habit row gets a `FolderInput` icon button in `nav-item-drag-zone` (same position as ListView's new button). Pointer-down initiates cross-group assignment drag.

### Cross-group assignment

Identical pointer tracking to ListView:
- `draggingHabitId` state
- `pointermove`: move ghost, highlight drop target group
- `pointerup`: call `moveTaskToGroup(habitId, listId, targetGroup)`
- Drop on `__ungrouped__` → `moveTaskToGroup(..., null)`

### Ordering & persistence

- Task order within groups: `listOrders[listId]` via `applyOrder` — same as current flat order
- Group order: `listGroupOrders[listId]` via `setListGroupOrder` — same settings key used by ListView
- Auto-sync effect: when `rows` changes, any group names not yet in `listGroupOrders[listId]` are appended (copied from ListView)

### Store actions used

All pre-existing, no new store changes needed:
- `moveTaskToGroup(id, listId, group | null)`
- `renameGroup(listId, oldName, newName)`
- `deleteGroup(listId, name)` — moves tasks to null group

---

## Part 3: MyDayView habit groups

### Structure

Within the existing "Habits" section, habits are rendered per-list, and within each list per-group.

**Rendering order:**
1. Ungrouped habits (no label)
2. Each named group: subtle separator (group name label + thin rule), then habits below

**If multiple daily lists contribute habits**, a list-name divider renders above each list's block. This falls naturally out of the grouping pass and clarifies which list each habit belongs to.

### Visual treatment

- Group label: small muted text, same style as existing `section-heading` but lighter
- No collapse, no edit controls, no drag
- Read-only digest — no interaction beyond toggling habits

### Data

- Reads `listOrders[listId]` and `listGroupOrders[listId]` from `useSettings` (already imported in MyDayView)
- `orderedHabits` memo updated to sort by group within each list, respecting `listGroupOrders`
- No new state, no store changes

---

## What is not changing

- `Task` type — `group` field already exists
- Store mutations — `moveTaskToGroup`, `renameGroup`, `deleteGroup` already work for any list type
- Settings context — `listGroupOrders`/`setListGroupOrder` already exist
- TaskDetailPanel group assignment — already works for habits, no changes needed
- DB layer — no schema changes

---

## Files touched

| File | Change |
|---|---|
| `src/views/ListView.tsx` | Refactor cross-group trigger: remove body-drag, add FolderInput button to TaskRow |
| `src/views/DailyView.tsx` | Add HabitGroupSection, ungrouped zone, cross-group drag, group order logic |
| `src/views/MyDayView.tsx` | Update orderedHabits memo to respect groups; render group separators |
