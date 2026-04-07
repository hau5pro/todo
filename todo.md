# Review Todo

## Features

## Bugs

- [x] **`SetupWizard.tsx` TS error** — `Variants` type mismatch on animation variants object; `center` key's `transition.ease` is typed as `string` but must be `Easing | Easing[]`

## Improvements

- [ ] **Recurrence UX** — improve recurrence picker/flow
- [ ] **Group field in task detail** — dropdown doesn't match any existing group names; replace with autocomplete from active groups in the list
- [ ] **Add item in group** — "Add item" button inside a group should behave consistently with the main "Add task" input at the top of the list

## Tests

- [ ] **`db/sync.ts`** — `pushPending`, `pullFromSupabase`, `deleteAllCloudData` have zero tests (sync bugs #2 and #3 above would have been caught here)
- [ ] **`db/habits.ts`** — `toggleHabitCompletion` and `calculateStreak` untested (`calculateStreak` is a pure function, trivial to test)
- [ ] **Store mutations** — `completeTask`, `advanceCyclicalTask`, `duplicateList`, `deleteFolder` untested
- [ ] **`db/lists.ts` / `db/folders.ts`** — no tests at all for the lists or folders DB layer
- [ ] **Edge cases** — month-overflow recurrence (e.g. Jan 31 + 1 month), `getMyDayTasks` date boundary, `calculateStreak` with a gap on today vs yesterday
