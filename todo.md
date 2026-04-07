# Review Todo

## Bugs

- [x] **`useSync.ts:62`** — visibility handler syncs on *hide* instead of *show* (`if (document.hidden)` should be `if (!document.hidden)`)
- [x] **`sync.ts`** — folders never pushed to or pulled from Supabase (`pushPending` + `pullFromSupabase` both skip the `folders` store)
- [x] **`sync.ts:138`** — `deleteAllCloudData` missing `'folders'` from its tables array
- [ ] **`MyDayView.tsx:77`** — habit ordering puts `rest` before `ordered`, opposite of `DailyView` — habits show in wrong order in My Day
- [ ] **Habit tasks — no due date or recurrence** — `TaskDetailPanel` should hide due date and recurrence fields when the task belongs to a `daily` list (habits are implicitly daily; setting these causes double display in My Day); groups should remain available; also fix the misleading comment in `getMyDayTasks` (`db/tasks.ts:191`)
- [ ] **`db/tasks.ts:108`** — `restoreTask` exported but never imported or used anywhere — dead code

## Security

- [ ] **`.env.local`** — rename `VITE_SUPABASE_DB_PW` → `SUPABASE_DB_PW` and `VITE_GOOGLE_CLIENT_SECRET` → `GOOGLE_CLIENT_SECRET` (drop the `VITE_` prefix so Vite can never accidentally bundle them)

## Reuse

- [ ] **`req()`** — identical 6-line IDB promise wrapper copied into `db/tasks.ts`, `db/sync.ts`, `db/habits.ts`, `db/lists.ts`, `db/folders.ts`, `hooks/useSync.ts` — move to `db/client.ts` and import
- [ ] **`applyOrder`** — defined separately in `ListView.tsx`, `DailyView.tsx`, and inline in `MyDayView.tsx` with diverging logic — extract to shared util
- [ ] **Streak loading** — `useHabits.ts` and `MyDayView.tsx` both independently fetch completions + calculate streaks for each habit — consolidate
- [ ] **`getTodayString()`** — `new Date().toISOString().split('T')[0]` repeated in ~6 places — extract to a shared util

## Simplification

- [ ] **`SettingsContext` `update()`** — 5 setters bypass `update()` and call `setSettings` directly just to do a Record merge — make `update()` accept `(prev) => next` to eliminate the duplication
- [ ] **`countPending` in `useSync.ts`** — fetches all records from all 3 stores just to count — reuse the already-filtered results from `pushPending` instead of a full re-scan

## Improvements

- [ ] **Folder nav destinations** — folders become NavLinks (`/folder/:id`) with a `FolderView` showing lists inside the folder; collapsed sidebar shows folder icons (no child lists); ungrouped user lists appear as icon buttons in collapsed sidebar just like pinned items
- [ ] **Accessibility** — final sweep
- [ ] **Recurrence UX** — improve recurrence picker/flow
- [ ] **Fast multi-complete** — ability to rapidly tap many items to completion; drop animations for that interaction, prioritise snappiness
- [ ] **Completed list performance** — will the completed section get heavy over time? consider pagination or a cap with "show older"
- [ ] **Group field in task detail** — dropdown doesn't match any existing group names; replace with autocomplete from active groups in the list
- [ ] **Add item in group** — "Add item" button inside a group should behave consistently with the main "Add task" input at the top of the list

## Tests

- [ ] **`db/sync.ts`** — `pushPending`, `pullFromSupabase`, `deleteAllCloudData` have zero tests (sync bugs #2 and #3 above would have been caught here)
- [ ] **`db/habits.ts`** — `toggleHabitCompletion` and `calculateStreak` untested (`calculateStreak` is a pure function, trivial to test)
- [ ] **Store mutations** — `completeTask`, `advanceCyclicalTask`, `duplicateList`, `deleteFolder` untested
- [ ] **`db/lists.ts` / `db/folders.ts`** — no tests at all for the lists or folders DB layer
- [ ] **Edge cases** — month-overflow recurrence (e.g. Jan 31 + 1 month), `getMyDayTasks` date boundary, `calculateStreak` with a gap on today vs yesterday
