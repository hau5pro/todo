# Test Coverage

## `db/client.ts`
- `client.test.ts` — DB opens, object stores exist

## `db/lists.ts`
- `lists.test.ts` — CRUD: create, read, update, soft-delete

## `db/folders.ts`
- `folders.test.ts` — CRUD: create, read, rename, soft-delete

## `db/tasks.ts`
- `tasks.test.ts` — create, read, complete, soft-delete, advance cyclical (days/weeks/months), month-overflow edge case, advance recurring (rrule), rrule with no further occurrences, updateTask, bulkUpdateTaskGroup, getMyDayTasks, purgeOldShoppingItems

## `db/habits.ts`
- `habits.test.ts` — toggleHabitCompletion (add/remove), calculateStreak (0, 1, consecutive, gap, soft-deleted, wrong task, gap on today)

## `db/sync.ts`
- `sync.test.ts` — pushPending (lists + tasks, clears pending_sync, no-op when clean), pullFromSupabase (merge, last-write-wins, updates localStorage, correct filter fields), initialSync (clears last_sync before pull), deleteAllCloudData (all tables called, throws on error, resolves on success)

## `store/index.ts`
- `store/store.test.ts` — completeTask (true/false), advanceCyclicalTask, duplicateList (copy tasks, suffix increment), deleteFolder (moves lists to root in store + IDB)
