# Review Todo

## Features

## Bugs

## Improvements

## Tests

- [ ] **`db/sync.ts`** — `pushPending`, `pullFromSupabase`, `deleteAllCloudData` have zero tests (sync bugs #2 and #3 above would have been caught here)
- [ ] **`db/habits.ts`** — `toggleHabitCompletion` and `calculateStreak` untested (`calculateStreak` is a pure function, trivial to test)
- [ ] **Store mutations** — `completeTask`, `advanceCyclicalTask`, `duplicateList`, `deleteFolder` untested
- [ ] **`db/lists.ts` / `db/folders.ts`** — no tests at all for the lists or folders DB layer
- [ ] **Edge cases** — month-overflow recurrence (e.g. Jan 31 + 1 month), `getMyDayTasks` date boundary, `calculateStreak` with a gap on today vs yesterday
