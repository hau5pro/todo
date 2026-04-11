# Animation Improvements — Design Spec
_2026-04-10_

## Scope

Three animation gaps to fill, all using existing Framer Motion dependency. No view transitions.

1. Task enter/exit
2. Completion reorder
3. Add-task input open/close

---

## 1 — Task Enter / Exit

**Where:** `GroupSection` (grouped tasks) and `ListView` (ungrouped task rows).

**What changes:**
- Wrap each task list with `<AnimatePresence>` (already imported in both files).
- Give each `TaskRow` / ungrouped task `motion.div` wrapper with:
  - `initial={{ opacity: 0, y: -6 }}`
  - `animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: ease.snap } }}`
  - `exit={{ opacity: 0, x: 12, transition: { duration: 0.18, ease: ease.in } }}`
- Height collapse on exit: animate `height` from current to `0` using Framer Motion (same pattern as `GroupSection` body collapse), with `overflow: hidden` on the motion wrapper.
- `key={task.id}` is already set on task rows — AnimatePresence will track additions/removals correctly without further changes.

**Files:** `src/components/GroupSection.tsx`, `src/views/ListView.tsx`

---

## 2 — Completion Reorder

**Where:** `ListView` and `GroupSection` — wherever active and completed tasks are rendered in separate sections.

**What changes:**
- Wrap both the active task list and the completed task list in `<AnimatePresence>` (same instance per section, not shared across sections).
- When a task is marked complete, it exits the active section with the task-exit animation (opacity 0, slight x offset, height collapse).
- It then enters the completed section with the task-enter animation (opacity 0, y: -6 → 0).
- The completed section container itself uses the existing height-collapse pattern (same as `GroupSection` body) to animate open the first time a completed task appears, and closed when the last completed task is unchecked.
- No `layoutId` or shared layout — each section manages its own AnimatePresence independently. The visual effect (exit one place, enter another) is sufficient without a cross-section fly animation.

**Files:** `src/views/ListView.tsx`, `src/components/GroupSection.tsx`

---

## 3 — Add-Task Input Open / Close

**Where:** `ListView` — the add-task input area at the bottom of the task list.

**What changes:**
- Wrap the input element in `<AnimatePresence>`.
- When the input is shown (user clicks "Add a task"):
  - `initial={{ height: 0, opacity: 0 }}`
  - `animate={{ height: 'auto', opacity: 1, transition: { duration: 0.22, ease: ease.snap } }}`
- When dismissed (blur, Escape, or task submitted):
  - `exit={{ height: 0, opacity: 0, transition: { duration: 0.16, ease: ease.in } }}`
- `overflow: hidden` on the motion wrapper during animation.
- Existing focus behaviour (`focusLater`) is unchanged.

**File:** `src/views/ListView.tsx`

---

## Easing

Use the existing `ease` utility from `src/utils/easing.ts` throughout (`ease.snap`, `ease.in`, `ease.out`) to stay consistent with the rest of the app.

---

## Out of Scope

- View transitions between lists (explicitly excluded)
- Habit list animations (separate component, separate concern)
- Sidebar animations (already handled)
- TaskDetailPanel (already animated)
