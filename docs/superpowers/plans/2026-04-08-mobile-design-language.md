# Mobile-First Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the mobile-first design language spec: drawer nav, contrast token lift, 44px touch targets, safe areas, viewport fixes, and PWA keyboard improvements.

**Architecture:** Pure CSS changes for tokens/touch targets/layout rules; React component changes in `AppShell` (hamburger + drawer state) and `Sidebar` (overlay drawer mode + close-on-nav). No new dependencies.

**Tech Stack:** React 18, TypeScript, CSS custom properties, Framer Motion, Lucide React

**Spec:** `docs/superpowers/specs/2026-04-08-design-language-design.md`

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Add `viewport-fit=cover, user-scalable=no` |
| `src/app.css` | Token lift, touch targets, safe areas, drawer CSS, input font size, tooltip suppression, title weight |
| `src/utils/dom.ts` | Increase `focusLater` default delay to 50ms |
| `src/components/AppShell.tsx` | Add hamburger button, drawer open/close state, backdrop |
| `src/components/Sidebar.tsx` | Accept `isDrawerOpen`/`onClose` props, overlay mode, close on nav, `inputmode` on inline inputs |

---

## Task 1: Viewport meta

**Files:**
- Modify: `index.html:5`

- [ ] **Step 1: Update the viewport meta tag**

In `index.html`, change line 5:

```html
<!-- before -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- after -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
```

`viewport-fit=cover` enables `env(safe-area-inset-*)` on iPhone. `user-scalable=no` disables pinch-zoom for a native app feel.

- [ ] **Step 2: Verify**

Open in browser. On iOS or DevTools (set device to iPhone): confirm pinch-to-zoom no longer works.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix(pwa): add viewport-fit=cover and user-scalable=no"
```

---

## Task 2: CSS color token lift

**Files:**
- Modify: `src/app.css:4-74`

Token changes: `--fg-muted` in light mode, and 7 tokens in dark mode.

- [ ] **Step 1: Update light mode `--fg-muted`**

In `src/app.css`, in the `:root` block (around line 21), change:

```css
/* before */
--fg-muted:    #909090;

/* after */
--fg-muted:    #5c5c6e;
```

- [ ] **Step 2: Update dark mode tokens in the `@media (prefers-color-scheme: dark)` block**

Around line 26–41:

```css
/* before */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
    --bg:         #0a0a0e;
    --surface:    #111118;
    --hover:      #1a1a24;
    --border:     #202030;
    --divider:    #181824;
    --fg:         #e6e6f4;
    --fg-muted:   #4e4e6a;
    --accent:     #60a5fa;
    --accent-dim: rgba(96, 165, 250, 0.12);
    --danger:     #f87171;
    --warn:       #fbbf24;
    --success:    #4ade80;
    --info:       #22d3ee;
  }
}

/* after */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
    --bg:         #09090f;
    --surface:    #111118;
    --hover:      #1c1c28;
    --border:     #252535;
    --divider:    #1c1c2c;
    --fg:         #f0f0ff;
    --fg-muted:   #8888b0;
    --accent:     #63b3ed;
    --accent-dim: rgba(96, 165, 250, 0.12);
    --danger:     #f87171;
    --warn:       #fbbf24;
    --success:    #4ade80;
    --info:       #22d3ee;
  }
}
```

- [ ] **Step 3: Update dark mode tokens in the `[data-theme="dark"]` block**

Around line 44–59, apply the same 7 changes to the `[data-theme="dark"]` block:

```css
[data-theme="dark"] {
  color-scheme: dark;
  --bg:         #09090f;
  --surface:    #111118;
  --hover:      #1c1c28;
  --border:     #252535;
  --divider:    #1c1c2c;
  --fg:         #f0f0ff;
  --fg-muted:   #8888b0;
  --accent:     #63b3ed;
  --accent-dim: rgba(96, 165, 250, 0.12);
  --danger:     #f87171;
  --warn:       #fbbf24;
  --success:    #4ade80;
  --info:       #22d3ee;
}
```

- [ ] **Step 4: Verify**

In the browser, enable dark mode. Check that section labels (e.g. "HABITS", "TODAY"), muted dates, and sidebar icon tooltips are clearly visible. In light mode, confirm section labels and muted text have more contrast than before.

- [ ] **Step 5: Commit**

```bash
git add src/app.css
git commit -m "feat(design): lift fg-muted and dark mode contrast tokens"
```

---

## Task 3: CSS structural mobile fixes

**Files:**
- Modify: `src/app.css` (append new rules at the bottom, or add to the existing `@media (max-width: 640px)` block)

This task adds: touch targets, safe area padding, input font-size enforcement, view title weight bump, tooltip suppression on mobile, and drawer overlay CSS.

- [ ] **Step 1: Safe area on `app-main`**

Find the existing `.app-main` rule (around line 146–150) and add `padding-bottom`:

```css
/* before */
.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 1.75rem 1.5rem;
}

/* after */
.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 1.75rem 1.5rem;
  padding-bottom: max(1.75rem, env(safe-area-inset-bottom));
}
```

- [ ] **Step 2: Input font size**

Find the `.nav-inline-input` rule (around line 422) and update its font-size:

```css
/* before */
.nav-inline-input {
  flex: 1;
  background: none;
  border: none;
  border-bottom: 1px solid var(--accent);
  outline: none;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--fg);
  padding: 2px 0;
  min-width: 0;
}

/* after */
.nav-inline-input {
  flex: 1;
  background: none;
  border: none;
  border-bottom: 1px solid var(--accent);
  outline: none;
  font-size: max(16px, 0.875rem);
  font-family: inherit;
  color: var(--fg);
  padding: 2px 0;
  min-width: 0;
}
```

Then add a global rule after the reset block (after line ~99):

```css
/* Prevent iOS auto-zoom on input focus */
input, textarea, select { font-size: max(16px, 1rem); }
```

- [ ] **Step 3: Add mobile-specific CSS block at end of `app.css`**

Append to the end of `src/app.css`:

```css
/* ── Mobile-first overrides (< 640px) ───────────────────── */

/* Hamburger button — hidden on tablet/desktop */
.header-hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--fg);
  padding: 0;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Sidebar backdrop — hidden until drawer opens */
.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 199;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

@media (max-width: 639px) {
  /* Show hamburger */
  .header-hamburger { display: flex; }

  /* Hide logo mark so header reads: [☰] [date] [icons] */
  .app-logo__mark { display: none; }

  /* Touch targets */
  .task-item  { min-height: 44px; }
  .habit-item { min-height: 44px; }
  .nav-item   { min-height: 44px; }
  .settings-row { min-height: 44px; }
  .nav-icon-btn { width: 44px; height: 44px; }
  .header-icon-btn { min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }

  /* View title punch */
  .view-title { font-weight: 800; }

  /* No hover tooltips on touch */
  [data-tooltip]::after { display: none; }

  /* Sidebar as fixed overlay drawer */
  .sidebar {
    position: fixed !important;
    top: 0;
    left: 0;
    bottom: 0;
    height: 100dvh;
    width: min(280px, 85vw) !important;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-right: 1px solid var(--border);
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
  }

  .sidebar--drawer-open {
    transform: translateX(0);
  }

  /* Show backdrop when drawer is open */
  .sidebar-backdrop--visible {
    display: block;
  }
}
```

- [ ] **Step 4: Verify CSS in DevTools**

Open DevTools, set responsive mode to iPhone 15 Pro (393px). Confirm:
- Task items are at least 44px tall
- Sidebar slides off-screen to the left (not visible yet, will be wired in Task 5)
- `app-main` bottom padding respects safe area (inspect computed value)

- [ ] **Step 5: Commit**

```bash
git add src/app.css
git commit -m "feat(design): mobile touch targets, safe areas, drawer CSS, input font-size"
```

---

## Task 4: Fix `focusLater` delay for iOS PWA

**Files:**
- Modify: `src/utils/dom.ts`

iOS PWA requires ~50ms after an element mounts before `.focus()` reliably triggers the keyboard.

- [ ] **Step 1: Update `focusLater`**

```typescript
/* before */
export function focusLater(ref: RefObject<HTMLElement | null>) {
  setTimeout(() => ref.current?.focus(), 0);
}

/* after */
export function focusLater(ref: RefObject<HTMLElement | null>, delay = 50) {
  setTimeout(() => ref.current?.focus(), delay);
}
```

This is backward-compatible — all existing callers get 50ms, which is fine everywhere.

- [ ] **Step 2: Verify**

On a real iOS device (or Simulator) as a PWA, tap "+" to add a new list. The keyboard should appear immediately.

- [ ] **Step 3: Commit**

```bash
git add src/utils/dom.ts
git commit -m "fix(pwa): increase focusLater delay to 50ms for iOS keyboard"
```

---

## Task 5: AppShell — hamburger + drawer state

**Files:**
- Modify: `src/components/AppShell.tsx`

Add `drawerOpen` state, a hamburger button in the header (mobile only), a backdrop `<div>`, and pass drawer props to `<Sidebar>`.

- [ ] **Step 1: Update imports**

Add `Menu` to the lucide import and `useState` to the react import in `AppShell.tsx`:

```typescript
import { useState, useEffect, useMemo } from 'react';
import { HelpCircle, Menu } from 'lucide-react';
```

- [ ] **Step 2: Add `drawerOpen` state**

Inside `AppShell()`, after the existing `useMemo` calls:

```typescript
const [drawerOpen, setDrawerOpen] = useState(false);
```

- [ ] **Step 3: Replace the JSX**

Replace the full returned JSX in `AppShell` with:

```tsx
return (
  <TaskDetailProvider>
    <KeyboardNavController />
    <div className="app-shell">
      <header className="app-header">
        <button
          className="header-hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>
        <NavLink to="/my-day" className="app-logo">
          <div className="app-logo__mark">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <polyline
                points="2,8 6,12 13,4"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="app-title">
            {headerDate}
          </span>
        </NavLink>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <NavLink to="/docs" className="header-icon-btn" aria-label="Help">
            <HelpCircle size={18} />
          </NavLink>
          {syncEnabled && <SyncDot pendingCount={pendingCount} isSyncing={isSyncing} />}
        </div>
      </header>
      <div className="app-body">
        <div
          className={`sidebar-backdrop${drawerOpen ? ' sidebar-backdrop--visible' : ''}`}
          onClick={() => setDrawerOpen(false)}
        />
        <Sidebar isDrawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <main className="app-main">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: ease.out }}
          >
            <Outlet />
          </motion.div>
        </main>
        <DetailSlot />
      </div>
    </div>
  </TaskDetailProvider>
);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors (Sidebar doesn't yet accept the props, so there will be type errors — that's expected and will be fixed in Task 6).

- [ ] **Step 5: Commit once Task 6 is done** *(skip this step until after Task 6)*

---

## Task 6: Sidebar — overlay drawer mode

**Files:**
- Modify: `src/components/Sidebar.tsx`

Accept `isDrawerOpen` / `onClose` props, skip FM width animation on mobile, always show expanded content on mobile, close on navigation, add `inputmode="text"` to inline inputs.

- [ ] **Step 1: Add props and imports**

At the top of `Sidebar.tsx`, add `useLocation` to the router imports:

```typescript
import { NavLink, useNavigate, useMatch, useLocation } from 'react-router-dom';
```

- [ ] **Step 2: Update the `Sidebar` function signature**

```typescript
/* before */
export function Sidebar() {

/* after */
export function Sidebar({ isDrawerOpen = false, onClose }: { isDrawerOpen?: boolean; onClose?: () => void }) {
```

- [ ] **Step 3: Add `isMobile` state**

Inside `Sidebar()`, after the existing state declarations (around line 421):

```typescript
const { pathname } = useLocation();
const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

useEffect(() => {
  const mq = window.matchMedia('(max-width: 639px)');
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);

// Close drawer when navigating on mobile
useEffect(() => {
  if (isMobile) onClose?.();
}, [pathname]);
```

- [ ] **Step 4: Remove the auto-collapse-on-mobile `useEffect`**

Find and delete this existing block (around line 433–436):

```typescript
// DELETE THIS:
useEffect(() => {
  if (window.innerWidth < 640) setSidebarCollapsed(true);
}, []);
```

- [ ] **Step 5: Remove `SIDEBAR_W_MOBILE` constant and update the `motion.nav` animate**

At the top of the file (around line 410–412), remove `SIDEBAR_W_MOBILE`:

```typescript
/* before */
const SIDEBAR_W = window.innerWidth >= 1024 ? 256 : 208;
const SIDEBAR_W_MOBILE = 160;
const COLLAPSED_W = 40;

/* after */
const SIDEBAR_W = window.innerWidth >= 1024 ? 256 : 208;
const COLLAPSED_W = 40;
```

Then update the `motion.nav` opening tag (around line 610–614):

```tsx
/* before */
<motion.nav
  className="sidebar"
  animate={{ width: sidebarCollapsed ? COLLAPSED_W : (window.innerWidth < 640 ? SIDEBAR_W_MOBILE : SIDEBAR_W) }}
  initial={false}
  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
>

/* after */
<motion.nav
  className={`sidebar${isMobile && isDrawerOpen ? ' sidebar--drawer-open' : ''}`}
  animate={isMobile ? {} : { width: sidebarCollapsed ? COLLAPSED_W : SIDEBAR_W }}
  initial={false}
  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
>
```

- [ ] **Step 6: Always show expanded content on mobile**

The `AnimatePresence` block that switches between collapsed and expanded views (around line 616–919) currently uses `{sidebarCollapsed ? <Collapsed /> : <Expanded />}`. Update the condition so mobile always gets the expanded view:

```tsx
/* before */
{sidebarCollapsed ? (
  <motion.div key="collapsed" className="sidebar--collapsed" ...>
    ...collapsed content...
  </motion.div>
) : (
  <motion.div key="expanded" className="sidebar__inner" ...>
    ...expanded content...
  </motion.div>
)}

/* after */
{(!isMobile && sidebarCollapsed) ? (
  <motion.div key="collapsed" className="sidebar--collapsed" ...>
    ...collapsed content (unchanged)...
  </motion.div>
) : (
  <motion.div key="expanded" className="sidebar__inner" ...>
    ...expanded content (unchanged)...
  </motion.div>
)}
```

- [ ] **Step 7: Add `inputmode="text"` to inline inputs**

Find the list name input (around line 887) and folder name input (around line 868). Add `inputmode="text"` to each:

```tsx
/* List name input — around line 887 */
<input
  ref={addInputRef}
  className="nav-inline-input"
  placeholder="List name"
  inputMode="text"
  value={newListName}
  onChange={(e) => setNewListName(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') commitAddList();
    if (e.key === 'Escape') cancelAddList();
  }}
/>

/* Folder name input — around line 868 */
<input
  ref={addFolderInputRef}
  className="nav-inline-input"
  placeholder="Folder name"
  inputMode="text"
  value={newFolderName}
  onChange={(e) => setNewFolderName(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') commitAddFolder();
    if (e.key === 'Escape') cancelAddFolder();
  }}
/>
```

- [ ] **Step 8: Verify TypeScript compiles with no errors**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 9: Verify in browser — mobile view**

Open DevTools, set to iPhone 15 Pro (393px). Confirm:

1. Sidebar is not visible on load (hidden behind left edge)
2. Tapping the hamburger (☰) slides the drawer in from the left
3. A dim backdrop covers the content area
4. Tapping the backdrop closes the drawer
5. Navigating to a list closes the drawer automatically
6. On tablet (700px), sidebar shows as collapsed icon-only with no hamburger
7. On desktop (1100px), full sidebar shows — no change from before

- [ ] **Step 10: Commit both Task 5 and Task 6**

```bash
git add src/components/AppShell.tsx src/components/Sidebar.tsx
git commit -m "feat(mobile): hamburger drawer nav — overlay sidebar at <640px"
```

---

## Final verification checklist

After all tasks are committed, test on a real device or thorough DevTools simulation:

- [ ] Pinch-to-zoom disabled
- [ ] Dark mode section labels and muted text legible at 30% brightness
- [ ] Light mode muted text has more contrast (section labels, dates)
- [ ] Drawer opens/closes cleanly, backdrop dismisses it
- [ ] Settings content not cut off at bottom on iPhone
- [ ] Tapping "+" for new list/folder triggers keyboard on iOS PWA
- [ ] Task and habit rows are comfortably tappable (44px height)
- [ ] Collapsed sidebar icon buttons are 44×44 on tablet
- [ ] No zoom on input focus
