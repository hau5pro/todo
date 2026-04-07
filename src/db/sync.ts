import type { SupabaseClient } from '@supabase/supabase-js';
import type { List, ListFolder, Task, HabitCompletion } from '../types';
import { req } from './client';

const LAST_SYNC_KEY = 'todo_last_sync';

/** Strip local-only field before sending to Supabase. */
function toRemote<T extends { pending_sync: boolean }>(record: T, userId: string): Omit<T, 'pending_sync'> & { user_id: string } {
  const { pending_sync: _p, ...rest } = record;
  return { ...rest, user_id: userId };
}

/** Strip user_id from a remote record in a type-safe way. */
function fromRemote<T extends Record<string, unknown>>(remote: T): Omit<T, 'user_id'> {
  const { user_id: _u, ...record } = remote;
  return record as Omit<T, 'user_id'>;
}

export async function pushPending(db: IDBDatabase, supabase: SupabaseClient, userId: string): Promise<void> {
  const errors: string[] = [];

  // Folders
  const allFolders = await req<ListFolder[]>(db.transaction('folders').objectStore('folders').getAll());
  const pendingFolders = allFolders.filter((f) => f.pending_sync);
  if (pendingFolders.length > 0) {
    const { error } = await supabase
      .from('folders')
      .upsert(pendingFolders.map((f) => toRemote(f, userId)), { onConflict: 'id' });
    if (error) {
      errors.push(`folders: ${error.message}`);
    } else {
      const tx = db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      await Promise.all(
        pendingFolders.map((f) => req(store.put({ ...f, pending_sync: false })))
      );
    }
  }

  // Lists
  const allLists = await req<List[]>(db.transaction('lists').objectStore('lists').getAll());
  const pendingLists = allLists.filter((l) => l.pending_sync);
  if (pendingLists.length > 0) {
    const { error } = await supabase
      .from('lists')
      .upsert(pendingLists.map((l) => toRemote(l, userId)), { onConflict: 'id' });
    if (error) {
      errors.push(`lists: ${error.message}`);
    } else {
      const tx = db.transaction('lists', 'readwrite');
      const store = tx.objectStore('lists');
      await Promise.all(
        pendingLists.map((l) => req(store.put({ ...l, pending_sync: false })))
      );
    }
  }

  // Tasks
  const allTasks = await req<Task[]>(db.transaction('tasks').objectStore('tasks').getAll());
  const pendingTasks = allTasks.filter((t) => t.pending_sync);
  if (pendingTasks.length > 0) {
    const { error } = await supabase
      .from('tasks')
      .upsert(pendingTasks.map((t) => toRemote(t, userId)), { onConflict: 'id' });
    if (error) {
      errors.push(`tasks: ${error.message}`);
    } else {
      const tx = db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      await Promise.all(
        pendingTasks.map((t) => req(store.put({ ...t, pending_sync: false })))
      );
    }
  }

  // Habit completions
  const allHabits = await req<HabitCompletion[]>(
    db.transaction('habit_completions').objectStore('habit_completions').getAll()
  );
  const pendingHabits = allHabits.filter((h) => h.pending_sync);
  if (pendingHabits.length > 0) {
    const { error } = await supabase
      .from('habit_completions')
      .upsert(pendingHabits.map((h) => toRemote(h, userId)), { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      errors.push(`habit_completions: ${error.message}`);
    } else {
      const tx = db.transaction('habit_completions', 'readwrite');
      const store = tx.objectStore('habit_completions');
      await Promise.all(
        pendingHabits.map((h) => req(store.put({ ...h, pending_sync: false })))
      );
    }
  }

  if (errors.length > 0) throw new Error(`pushPending failed: ${errors.join('; ')}`);
}

export async function pullFromSupabase(db: IDBDatabase, supabase: SupabaseClient): Promise<void> {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY) ?? '1970-01-01T00:00:00Z';
  let hasError = false;

  for (const table of ['folders', 'lists', 'tasks', 'habit_completions'] as const) {
    const filterField = table === 'habit_completions' ? 'created_at' : 'updated_at';
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt(filterField, lastSync);

    if (error || !data) {
      hasError = true;
      continue;
    }

    const tx = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);

    for (const remote of data) {
      const local = await req<ListFolder | List | Task | HabitCompletion | undefined>(store.get(remote.id));
      const remoteTime = remote.updated_at ?? remote.created_at;
      // Use the correct timestamp field per record type: habit_completions has created_at, others have updated_at
      const localTime = local
        ? table === 'habit_completions'
          ? (local as HabitCompletion).created_at
          : (local as ListFolder | List | Task).updated_at
        : null;

      if (!localTime || remoteTime > localTime) {
        // Remote is newer — strip user_id, add pending_sync: false
        await req(store.put({ ...fromRemote(remote), pending_sync: false }));
      }
    }
  }

  // Only advance the timestamp if all three table queries completed without error.
  // If any errored, do NOT update the timestamp so future syncs don't miss records.
  if (!hasError) {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  }
}

/** Full pull from Supabase — used on first login to populate empty IndexedDB. */
export async function initialSync(db: IDBDatabase, supabase: SupabaseClient): Promise<void> {
  localStorage.removeItem(LAST_SYNC_KEY);
  await pullFromSupabase(db, supabase);
}

/** Delete all of the user's records from Supabase. Children before parents to respect FK order. */
export async function deleteAllCloudData(supabase: SupabaseClient, userId: string): Promise<void> {
  const tables = ['habit_completions', 'tasks', 'lists', 'folders', 'user_settings'] as const;
  const errors: string[] = [];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) errors.push(`${table}: ${error.message}`);
  }
  if (errors.length > 0) throw new Error(`deleteAllCloudData failed: ${errors.join('; ')}`);
}
