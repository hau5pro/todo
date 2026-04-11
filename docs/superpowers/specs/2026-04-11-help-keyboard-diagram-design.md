# Help page — keyboard section annotated diagram

**Date:** 2026-04-11
**Status:** approved

## Problem

The keyboard shortcuts section in `DocsView.tsx` has three subsections — Sidebar, Task / Habit list, Detail panel — but nothing tells the user what those terms refer to visually. Users unfamiliar with the layout don't know which part of the app each group applies to.

## Solution

Add a single annotated app-layout diagram at the top of the keyboard shortcuts section. The diagram shows the three UI zones side by side (sidebar | task list | detail panel), each labelled with a numbered callout (①②③) that matches the subheading of the shortcut group below it.

## Design decisions

- **HTML/CSS only — no images.** The diagram is built from the app's own CSS variables (`--border`, `--surface`, `--accent`, etc.), so it automatically respects the current theme (light/dark) and accent colour. No PNG/WebP assets, no bundle weight increase.
- **Scope: keyboard section only.** Other sections (Features, Lists, Action buttons) are self-explanatory and don't need visuals.
- **One diagram, not per-subsection thumbnails.** A single layout overview is scanned once and understood. Per-subsection thumbnails would add repetitive weight without clarity benefit.
- **Numbered callouts match subheading labels.** ① Sidebar → ② Task / Habit list → ③ Detail panel. The link between diagram and shortcut group is immediate without extra prose.

## Implementation

### Component

Add a new `<KeyboardDiagram />` component inside `DocsView.tsx` (or inline JSX — it's small enough). Render it between the section intro text and the first shortcut group.

### Diagram structure

Three-column flex layout inside a rounded bordered container:

| Column | Width | Content |
|---|---|---|
| Sidebar | ~90px fixed | Numbered badge ①, placeholder list rows |
| Task list | flex-grow | Numbered badge ②, placeholder task rows |
| Detail panel | ~110px fixed | Numbered badge ③, placeholder field rows |

Placeholder rows are simple `div`s with `background: var(--border)` and reduced opacity — no text, no real data.

### Subheading labels

Update the three existing subheading strings to include the matching number prefix so they echo the diagram:

- `"Sidebar"` → `"① Sidebar"`
- `"Task / Habit list"` → `"② Task / Habit list"`
- `"Detail panel"` → `"③ Detail panel"`

### No new files

All changes are confined to `src/views/DocsView.tsx`.

## Acceptance criteria

- Diagram renders above the first shortcut group in the keyboard section
- Diagram uses only CSS variables — visually correct in light mode, dark mode, and all accent colours
- Numbered callouts in the diagram match the numbered subheading prefixes below
- No images, no new files, no new dependencies
