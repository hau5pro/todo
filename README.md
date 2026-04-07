# To Do

A privacy-first, offline-capable task manager and habit tracker. All data lives in your browser — cloud sync is optional.

![Dark theme, indigo accent](https://placehold.co/1200x600/111118/6366f1?text=To+Do)

---

## Philosophy

- **Local-first.** IndexedDB is the source of truth. The app is fully functional with no network connection.
- **Optional cloud.** Sign in to sync across devices via Supabase. Sign out and your data stays on-device.
- **No tracking.** No analytics, no telemetry, no third-party scripts.

---

## Features

### Tasks
- Three list types: **General**, **Daily** (habit tracking), **Shopping**
- Groups/sections within lists
- Due dates with a **My Day** dashboard (overdue + today)
- Drag-and-drop reordering of tasks and groups
- Soft-delete with history

### Recurrence
- **Cyclical tasks** — repeat every N days, weeks, or months
- **Habits (RRule)** — iCalendar-format rules for complex schedules; streaks calculated per habit

### Organisation
- Folders for grouping lists
- List icons and custom ordering
- List duplication (copies all tasks)
- Pinned task/list order synced to cloud per user

### Sync
- Pending changes tracked with a `pending_sync` flag
- Push on mutation, pull on focus/visibility change
- Last-write-wins merge; soft deletes propagated to cloud
- Full re-pull on first sign-in; incremental sync thereafter
- Sync status dot in header with pending count

### Customisation
- **9 accent colours** — blue, sky, indigo, purple, fuchsia, pink, teal, yellow, slate
- **Theme** — system, light, or dark
- **Completion sounds** — pop, chime, snap, pluck, soft, rim (synthesised in-browser, no audio files)
- Collapsible sidebar
- Configurable list/task ordering persisted per user

### PWA
- Installable on desktop and mobile
- Works fully offline after first load (Workbox precaching)
- Dynamic favicon tinted to current accent colour

---

## Design

**Typefaces** — Plus Jakarta Sans (UI) · DM Mono (code)

**Colour tokens** (CSS custom properties, not Tailwind)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f6f6f6` | `#0a0a0e` |
| `--surface` | `#ffffff` | `#111118` |
| `--fg` | `#1a1a1a` | `#e6e6f4` |
| `--accent` | dynamic | dynamic |

Status colours: `--danger` · `--warn` · `--success` · `--info`

Layout uses a two-column shell (collapsible sidebar + scrollable main). Animations are handled by Framer Motion with custom easing curves. No utility-class framework — styling is component-scoped CSS with design tokens.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript 5 |
| Router | React Router 7 |
| State | Zustand 5 |
| Local DB | IndexedDB (native) |
| Cloud | Supabase (Postgres + Auth) |
| Animation | Framer Motion 12 |
| Icons | Lucide React |
| Recurrence | RRule |
| Dates | Day.js |
| Build | Vite 6 |
| PWA | vite-plugin-pwa + Workbox |
| Tests | Vitest + Testing Library + fake-indexeddb |

---

## Project Structure

```
src/
├── app.css                  # Design tokens, layout, shared styles
├── components/              # Reusable UI (TaskItem, Sidebar, AnimatedCheckbox, …)
├── views/                   # Page-level components (MyDayView, ListView, SettingsView, …)
├── store/index.ts           # Zustand store — all data mutations go through here
├── db/                      # IndexedDB layer (tasks, lists, folders, habits, sync)
├── sync/orchestrator.ts     # Debounced sync request queue
├── hooks/                   # useSync, useList, useMyDay, useHabits, …
├── contexts/                # SettingsContext (theme, accent, local-only mode)
├── supabase/                # Supabase client + auth helpers
├── utils/                   # date, sound (WAV synthesis), order, easing, dom
├── sw/service-worker.ts     # Workbox service worker entry
└── tests/                   # Vitest tests + COVERAGE.md

supabase/migrations/         # Postgres schema history
```

---

## Getting Started

```bash
npm install
```

Copy `.env.example` to `.env.local` and add your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> Cloud sync is optional. The app runs fully in local-only mode without these values.

---

## Commands

```bash
npm run dev        # Start dev server (HMR)
npm run build      # Type-check + production build
npm run preview    # Serve production build locally
npm test           # Run tests in watch mode
npm run typecheck  # Type-check without emitting
```

---

## Data Architecture

### Local (IndexedDB)

Four object stores: `lists`, `tasks`, `habit_completions`, `folders`. Every record carries `pending_sync: boolean` and `deleted_at: string | null` for offline-safe soft deletes.

### Cloud (Supabase)

Mirrors the local schema with `user_id` for row-level security. A `user_settings` table stores per-user preferences (accent, hidden lists, pinned order). Sync is append/upsert only — hard deletes never happen client-side.

### Sync Flow

```
mutation → pending_sync = true → requestSync() (debounced 500ms)
                                        ↓
                              pushPending()  ← upserts pending rows
                              pullFromSupabase() ← fetches rows updated since last sync
                                                   last-write-wins on conflict
```
