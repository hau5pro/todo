import { useState, useEffect, useCallback, useRef } from 'react';
import { getDB, req } from '../db/client';
import { pushPending, pullFromSupabase } from '../db/sync';
import { supabase } from '../supabase/client';
import type { List, Task, HabitCompletion } from '../types';

async function countPending(): Promise<number> {
  const db = await getDB();
  const [lists, tasks, habits] = await Promise.all([
    req<List[]>(db.transaction('lists').objectStore('lists').getAll()),
    req<Task[]>(db.transaction('tasks').objectStore('tasks').getAll()),
    req<HabitCompletion[]>(db.transaction('habit_completions').objectStore('habit_completions').getAll()),
  ]);
  return (
    lists.filter((l) => l.pending_sync).length +
    tasks.filter((t) => t.pending_sync).length +
    habits.filter((h) => h.pending_sync).length
  );
}

export function useSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    setPendingCount(await countPending());
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const db = await getDB();
      await pushPending(db, supabase, user.id);
      await pullFromSupabase(db, supabase);
      await refreshPending();
    } catch (e) {
      setSyncError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPending]);

  useEffect(() => {
    // sync() calls refreshPending() internally on success
    sync();
    const onFocus = () => sync();
    const onVisibility = () => { if (!document.hidden) sync(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sync]);

  return { pendingCount, isSyncing, sync, refreshPending, syncError };
}
