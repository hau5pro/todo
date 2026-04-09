# TO DO — Project Guide

## App overview

Offline-first PWA todo app. React 18 + TypeScript + Vite.
- **Storage**: IndexedDB (local-first) via `src/db/` — all reads/writes go through these modules
- **Sync**: Supabase (optional, togglable). Mutations call `requestSync()` which debounces a push. `src/sync/orchestrator.ts`
- **State**: Zustand store at `src/store/index.ts` — lists, folders, tasks, my-day slices
- **Settings**: React context at `src/contexts/SettingsContext.tsx` — ordering, visibility, theme, accent, sound

## Key file map

| What you're working on | Read first |
|---|---|
| Data model / types | `src/types.ts` |
| Store actions & shape | `src/store/index.ts` |
| Settings shape | `src/contexts/SettingsContext.tsx` |
| DB schema (IndexedDB) | `src/db/client.ts` |
| Sidebar nav + edit mode | `src/components/Sidebar.tsx` |
| Task list view | `src/views/ListView.tsx` |
| Task detail side panel | `src/components/TaskDetailPanel.tsx` |
| Drag handle + delete button | `src/components/EditControls.tsx` |
| Focus utilities | `src/utils/dom.ts` |
| Keyboard nav / focus traps | `src/hooks/useKeyboardNav.ts` |
| iOS PWA focus workaround | See "always-mounted" input comments in Sidebar.tsx + FolderRow |

## Git

### Atomic commits

Commit one logical change at a time. Each commit should be self-contained and buildable. Don't bundle unrelated fixes, style tweaks, and feature work into a single commit. If a session touches multiple concerns, split them into separate commits before wrapping up.

## UI behaviour rules

### One edit state at a time

Only one edit/input mode should be visually active at a time. When entering any edit state, exit any other active edit state first. This prevents mixed visual signals about user intent.

Examples of states that are mutually exclusive:
- `taskEditMode` (drag handles + delete buttons) and `editingListName` (list title input) in ListView
- `calOpen` (calendar picker), `editingTime` (time input), and `editingGroup` (group input) in TaskDetailPanel
- Folder/group `editingName` (rename input) suppresses the drag handle on that same row

### App name

Always **TO DO** (two words, all caps). Never "Todo" or "TODO" in UI copy.

### List subheadings (ListView view-subtitle)

Special-cased by list name — preserve these whenever touching that line:
- List named "Tasks" → subtitle is `"general"`
- List named "Chores" → subtitle is `"cycles"`
- All other general lists → subtitle is `"tasks"`
