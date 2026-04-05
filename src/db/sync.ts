import type { SupabaseClient } from '@supabase/supabase-js';
import type { List, Task, HabitCompletion } from '../types';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

const LAST_SYNC_KEY = 'todo_last_sync';

/** Strip local-only field before sending to Supabase. */
function toRemote<T extends { pending_sync: boolean }>(record: T, userId: string): Omit<T, 'pending_sync'> & { user_id: string } {
  const { pending_sync: _p, ...rest } = record;
  return { ...rest, user_id: userId };
}

export async function pushPending(db: IDBDatabase, supabase: SupabaseClient, userId: string): Promise<void> {
  // Lists
  const allLists = await req<List[]>(db.transaction('lists').objectStore('lists').getAll());
  const pendingLists = allLists.filter((l) => l.pending_sync);
  if (pendingLists.length > 0) {
    const { error } = await supabase
      .from('lists')
      .upsert(pendingLists.map((l) => toRemote(l, userId)), { onConflict: 'id' });
    if (!error) {
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
    if (!error) {
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
      .upsert(pendingHabits.map((h) => toRemote(h, userId)), { onConflict: 'id' });
    if (!error) {
      const tx = db.transaction('habit_completions', 'readwrite');
      const store = tx.objectStore('habit_completions');
      await Promise.all(
        pendingHabits.map((h) => req(store.put({ ...h, pending_sync: false })))
      );
    }
  }
}

export async function pullFromSupabase(db: IDBDatabase, supabase: SupabaseClient): Promise<void> {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY) ?? '1970-01-01T00:00:00Z';

  for (const table of ['lists', 'tasks', 'habit_completions'] as const) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('updated_at', lastSync);

    if (error || !data) continue;

    const storeName = table === 'habit_completions' ? 'habit_completions' : table;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const remote of data) {
      const local = await req<List | Task | HabitCompletion | undefined>(store.get(remote.id));
      const remoteTime = remote.updated_at ?? remote.created_at;
      const localTime = local ? (local as List).updated_at : null;

      if (!localTime || remoteTime > localTime) {
        // Remote is newer — strip user_id, add pending_sync: false
        const { user_id: _u, ...record } = remote as Record<string, unknown>;
        await req(store.put({ ...record, pending_sync: false }));
      }
    }
  }

  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

/** Full pull from Supabase — used on first login to populate empty IndexedDB. */
export async function initialSync(db: IDBDatabase, supabase: SupabaseClient): Promise<void> {
  localStorage.removeItem(LAST_SYNC_KEY);
  await pullFromSupabase(db, supabase);
}
