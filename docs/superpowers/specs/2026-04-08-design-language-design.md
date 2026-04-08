# TO DO — Mobile-First Design Language

**Date:** 2026-04-08
**Status:** Approved

---

## Overview

This spec establishes the design language for the TO DO PWA. The app is mobile-first: mobile is the default, tablet and desktop progressively enhance. The goal is to fix real usability gaps observed on actual devices (icons too small, dark mode too muted at low brightness, content cut off by safe areas, pinch-zoom enabled).

---

## 1. Breakpoints & Layout

Three tiers. Mobile is the base; enhancements are additive.

| Tier | Range | Sidebar | Header |
|------|-------|---------|--------|
| Mobile | `< 640px` | Overlay drawer | Hamburger ☰ + date + icons |
| Tablet | `640–1024px` | Collapsed, icon-only (44px wide) | Date + icons |
| Desktop | `> 1024px` | Expanded (208px), collapsible | Date + icons |

### Mobile (< 640px)
- Content fills full viewport width. No persistent sidebar.
- Header contains: hamburger icon (left), date (center), action icons (right).
- Tapping the hamburger slides the sidebar in as an overlay drawer from the left.
- Drawer closes on navigation or backdrop tap.
- Drawer width: `min(280px, 85vw)`.
- Drawer respects `env(safe-area-inset-left)` and `env(safe-area-inset-top)`.

### Tablet (640–1024px)
- Sidebar is always visible, collapsed to icon-only (44px wide).
- No hamburger in header.
- User can expand sidebar — preference persists via existing sidebar collapse state.
- Tooltips on hover work normally at this tier.

### Desktop (> 1024px)
- Full expanded sidebar (208px), collapsible to icon-only.
- Current behavior unchanged.

---

## 2. Color Tokens

Light mode and dark mode both get a contrast lift. The primary fix is `--fg-muted`, which was too low-contrast at typical device brightness levels.

### Light mode

| Token | Before | After | Reason |
|-------|--------|-------|--------|
| `--fg-muted` | `#909090` | `#5c5c6e` | Section labels, icons, dates now legible |
| Everything else | — | unchanged | Light mode contrast was otherwise adequate |

### Dark mode

| Token | Before | After | Reason |
|-------|--------|-------|--------|
| `--fg-muted` | `#4e4e6a` | `#8888b0` | Near-invisible at low brightness |
| `--fg` | `#e6e6f4` | `#f0f0ff` | Crisper primary text |
| `--bg` | `#0a0a0e` | `#09090f` | True black on OLED |
| `--border` | `#202030` | `#252535` | Dividers register at low brightness |
| `--divider` | `#181824` | `#1c1c2c` | Consistent lift |
| `--hover` | `#1a1a24` | `#1c1c28` | Subtle lift |
| `--accent` | `#60a5fa` | `#63b3ed` | Slightly warmer blue, same pop |

**Not changed:** `--danger`, `--warn`, `--success`, `--info`, `--accent-dim`. User's custom accent color overrides `--accent` and is unaffected.

---

## 3. Touch Targets

**Rule:** All interactive elements must have a minimum 44×44px hit area.

This applies to:
- Header icon buttons (help, sync dot area)
- Sidebar nav items (`min-height: 44px`)
- Sidebar icon buttons (collapse toggle, add, folder actions)
- Task items (`min-height: 44px`)
- Habit items (`min-height: 44px`)
- Settings rows (`min-height: 44px`)
- Checkbox hit area (extend beyond visual size via padding or `::before`)

Where a visual element is smaller than 44px, use padding or a transparent `::after`/`::before` pseudo-element to extend the hit area without changing the visual.

### Hover-only interactions on mobile

Tooltips that appear on `:hover` must not render on mobile (touch has no hover state). The collapsed sidebar tooltip specifically must not get stuck on screen on touch devices.

**Rule:** Suppress `[data-tooltip]::after` at `< 640px`. Collapsed sidebar must not render at `< 640px` (it becomes a drawer instead).

---

## 4. Typography

### Font scale
Existing responsive font-size breakpoints are kept:

```css
html { font-size: 16px; }
@media (min-width: 768px)  { html { font-size: 17px; } }
@media (min-width: 1280px) { html { font-size: 18px; } }
@media (min-width: 1600px) { html { font-size: 19px; } }
```

### Weight
- View titles (`.view-title`): `font-weight: 800` on mobile (currently 700). Adds punch at small sizes.

### Input font size
All `<input>` and `<textarea>` elements must have `font-size: 16px` minimum. iOS Safari auto-zooms the viewport when an input is focused with `font-size < 16px`. This is the fix for the layout jumping on focus.

```css
input, textarea, select {
  font-size: max(16px, 1rem);
}
```

---

## 5. Safe Areas

The app must respect device safe areas to avoid content being clipped by notches, home bars, and rounded corners.

```css
/* Main content area — fixes bottom cutoff on iPhone */
.app-main {
  padding-bottom: max(1.75rem, env(safe-area-inset-bottom));
}

/* Settings view — sign-out button cutoff fix */
.settings-view {
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
}

/* Drawer overlay */
.sidebar-drawer {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
}
```

The `<meta name="viewport">` tag must include `viewport-fit=cover` for `env(safe-area-inset-*)` to work on iPhone.

---

## 6. Viewport & PWA Meta

### Viewport tag (index.html)
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
```

- `viewport-fit=cover`: enables safe area insets on iPhone
- `user-scalable=no`: prevents pinch-zoom (intentional for a native-feeling app)

### Keyboard on PWA
List and folder name inputs must trigger the keyboard immediately on mount. Use `autoFocus` on the input element when it appears, combined with `inputmode="text"`. On iOS PWA, `autoFocus` alone is unreliable — call `.focus()` imperatively in a `useEffect` with a short delay if needed.

```tsx
// Pattern for inline inputs that need the keyboard
useEffect(() => {
  const t = setTimeout(() => ref.current?.focus(), 50);
  return () => clearTimeout(t);
}, []);
```

---

## 7. Implementation Scope

This spec covers design rules only. Implementation tasks:

1. **Viewport meta** — update `index.html`
2. **CSS token update** — update `--fg-muted` and dark mode tokens in `app.css`
3. **Sidebar drawer** — make sidebar render as overlay drawer at `< 640px`, add hamburger to header
4. **Touch targets** — audit all interactive elements, add `min-height: 44px` and extend hit areas
5. **Tooltip suppression** — suppress `[data-tooltip]::after` at `< 640px`
6. **Safe areas** — add `env(safe-area-inset-*)` padding to `app-main`, settings, drawer
7. **Input font size** — ensure all inputs are `font-size: 16px` minimum
8. **Input focus / keyboard** — add imperative `.focus()` to inline list/folder name inputs
9. **View title weight** — bump `.view-title` to `font-weight: 800` on mobile
