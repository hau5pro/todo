# Todo App — Design Spec
**Date:** 2026-04-05

## Overview

A personal PWA todo app to replace Microsoft To Do. Single user, offline-capable, synced to Supabase. Mobile and desktop browser.

---

## Architecture

**Stack:**
- Frontend: React + Vite
- PWA: vite-plugin-pwa + Service Worker
- Local storage: Raw IndexedDB
- Backend/sync: Supabase (free tier) — Postgres + Auth + Edge Functions
- Auth: Supabase Google OAuth

**Storage strategy: local-first (Option B)**

IndexedDB is the primary store. All reads and writes go to IndexedDB immediately — no network latency. A background sync layer pushes changes to Supabase asynchronously.

- **Write:** save to IndexedDB → push to Supabase async
- **App load:** serve from IndexedDB instantly → fetch Supabase diff in background
- **Conflict resolution:** last-write-wins on `updated_at` timestamp (safe — single user)
- **Offline:** full read/write; syncs automatically on reconnect

**Sync indicator:** A small dot in the app header (Obsidian-style) shows pending/synced state. Nearly always invisible during normal use.

---

## Data Model

### `lists`
| field | type | notes |
|-------|------|-------|
| `id` | uuid | client-generated |
| `name` | text | |
| `type` | enum | `general` · `cyclical` · `daily` · `shopping` · `template` |
| `updated_at` | timestamp | used for sync |
| `deleted_at` | timestamp | soft delete |

### `tasks`
| field | type | notes |
|-------|------|-------|
| `id` | uuid | client-generated |
| `list_id` | uuid | → lists.id |
| `title` | text | |
| `completed` | bool | not used for `daily` type |
| `due_date` | date | nullable — cyclical tasks only; drives My Day |
| `recurrence_interval` | int | nullable — cyclical tasks only; e.g. `2` |
| `recurrence_unit` | enum | nullable — cyclical tasks only; `"days"` · `"weeks"` · `"months"` |
| `updated_at` | timestamp | used for sync |
| `deleted_at` | timestamp | soft delete |
| `pending_sync` | bool | local IndexedDB only — true when write not yet pushed to Supabase |

### `habit_completions`
| field | type | notes |
|-------|------|-------|
| `id` | uuid | client-generated |
| `task_id` | uuid | → tasks.id |
| `date` | date | the day completed (local date) |
| `created_at` | timestamp | |

Streak = consecutive days going back from today with a completion record for that task.

---

## List Types & Behaviours

### General
Regular tasks, no recurrence, no due date required. For things like "get a new family doctor."

### Cyclical
Recurring tasks with due dates (e.g. chores). On completion, `due_date` advances by the recurrence interval and `completed` resets to false. Overdue tasks surface in My Day.

### Daily (habits)
Tasks that reset every day — no overdue concept, no due date. Completion tracked via `habit_completions` for streak history. Positive reinforcement only: per-habit streak counter shown (e.g. 🔥 12). Never shown as overdue.

### Shopping
Completed items soft-deleted. Auto-purge completed/deleted items older than 30 days — only recent history matters.

### Template
Not shown in regular list views. Duplicate action creates a new list (type: `general`) and copies all tasks with `completed = false`.

---

## Views

### My Day
Tasks with `due_date ≤ today` and `completed = false`, plus all daily habits. Grouped into three sections:

```
Overdue     — due_date < today, red date label
Today       — due_date = today
Habits      — daily tasks, each with per-habit streak (🔥 N)
```

### Lists
Sidebar on desktop, tab on mobile. Sections:
- Fixed: My Day
- Lists (user-created: general, cyclical, shopping, daily)
- Templates (collapsible)

No "All Tasks" view — list views serve that purpose.

---

## UI Layout

**Desktop:** Persistent sidebar (180px) + main content area. Sync dot in header.

**Mobile:** Bottom tab bar with 3 tabs — My Day · Lists · (open list). Standard PWA pattern. Sync dot in header.

---

## Notifications

Push notifications via Web Push API + Supabase Edge Function cron.

- On login: browser requests notification permission, registers push subscription stored in Supabase
- Daily cron (Supabase Edge Function, configurable time): queries tasks where `due_date ≤ today` and `completed = false` → sends Web Push if any found
- Service worker receives and displays notification even when app is closed

**Caveats:**
- Android/Chrome: works reliably
- iOS: requires PWA installed to home screen, iOS 16.4+

---

## Sync Architecture Detail

Each record has `updated_at` (client-set timestamp) and `deleted_at` (soft delete).

**Initial device setup:** on first login, pull all records from Supabase into IndexedDB.

**Ongoing sync:**
1. On any local write → mark record with `pending_sync = true` in IndexedDB → attempt Supabase upsert
2. On reconnect / app foreground → push all `pending_sync = true` records to Supabase
3. On app load → fetch records from Supabase where `updated_at > last_sync_time` → merge into IndexedDB (last-write-wins)

`habit_completions` syncs the same way — upsert by `(task_id, date)`.

---

## Out of Scope

- Multi-user / shared lists
- Sub-tasks
- File attachments
- Negative streak indicators / missed day tracking
