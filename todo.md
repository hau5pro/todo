# Review Todo

## Features

## Bugs

- [x] **Sign out (local-only user)** — clicking sign out does nothing; local-only users have no Supabase session so `signOut()` is a no-op, but the app should still clear local state and redirect to `/login`
- [ ] **Auth → local-only transition** — when a signed-in user signs out and then continues as a local-only user, stale cloud data or auth state may bleed into the new local session; need to verify full teardown (store reset, `localOnly` flag, localStorage) before the local session starts

## Improvements

- [x] **Build/perf** — vendor chunk splitting, lazy-load heavy views, switched from phosphor-icons to lucide-react (tree-shaken per icon)


## Tests

- [ ] **`db/sync.ts`** — `pushPending`, `pullFromSupabase`, `deleteAllCloudData` have zero tests (sync bugs #2 and #3 above would have been caught here)
- [ ] **`db/habits.ts`** — `toggleHabitCompletion` and `calculateStreak` untested (`calculateStreak` is a pure function, trivial to test)
- [ ] **Store mutations** — `completeTask`, `advanceCyclicalTask`, `duplicateList`, `deleteFolder` untested
- [ ] **`db/lists.ts` / `db/folders.ts`** — no tests at all for the lists or folders DB layer
- [ ] **Edge cases** — month-overflow recurrence (e.g. Jan 31 + 1 month), `getMyDayTasks` date boundary, `calculateStreak` with a gap on today vs yesterday
