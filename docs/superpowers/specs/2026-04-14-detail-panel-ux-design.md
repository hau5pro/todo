# Detail Panel UX Improvements

**Date:** 2026-04-14
**Status:** Approved

## Overview

Three small UX improvements to the task detail panel and habit list view:

1. **Click-away to close** — clicking outside the panel on desktop closes it (save-on-blur handles persistence automatically)
2. **Note at top of panel** — Note section moves above Schedule and Organize
3. **HabitItem inline note** — note displays to the right of the habit title, capped at `18ch`, truncated with ellipsis

---

## 1. Click-Away Backdrop (Desktop Only)

### Where

`src/components/AppShell.tsx` — `DetailSlot` component

### How

When `detail` is non-null, render a `<div className="detail-backdrop">` inside `.app-body`, behind the panel. Clicking it calls `close()`.

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

### CSS

```css
.detail-backdrop {
  position: absolute;
  inset: 0;
  right: 335px; /* same as panel width */
  z-index: 1;
  cursor: default;
}

@media (max-width: 640px) {
  .detail-backdrop {
    display: none;
  }
}
```

The backdrop sits between `app-main` (z-index: auto) and the panel. On mobile the panel fills the screen so the backdrop is hidden.

### Save behaviour

All panel fields save on blur. When the user clicks the backdrop, the currently focused panel input blurs first (save fires), then the click handler fires (close). No extra save logic needed.

---

## 2. Note Section Moves to Top

### Where

`src/components/TaskDetailPanel.tsx`

### How

Move the `{/* Note */}` section block to appear immediately after the title `<input>` and before the `{/* Schedule */}` block. No other changes.

---

## 3. HabitItem Inline Note (Right of Title)

### Where

`src/components/HabitItem.tsx`, `src/app.css`

### How

Remove the `habit-item__title-wrap` column wrapper introduced in the previous feature. Note sits as a direct sibling of the title span in the existing `.habit-item` flex row:

```tsx
<span className={`habit-item__title${completedToday ? ' habit-item__title--completed' : ''}`}>
  {title}
</span>
{note && (
  <span className="habit-item__note">{note}</span>
)}
```

### CSS

Restore `.habit-item__title` to its original `flex: 1` shape. Add/update `.habit-item__note`:

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

Title always gets priority (`flex: 1`). Note is fixed-width and truncates independently. The streak badge retains `flex-shrink: 0; margin-left: auto`.

---

## Out of Scope

- Backdrop animation/fade (instant show/hide is fine)
- Touch swipe-to-close on mobile
