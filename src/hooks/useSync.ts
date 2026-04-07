import { useState, useEffect, useCallback, useRef } from 'react';
import { getDB, req } from '../db/client';
import { pushPending, pullFromSupabase } from '../db/sync';
import { supabase } from '../supabase/client';
import { useSettings } from '../contexts/SettingsContext';
import { registerSyncHandler } from '../sync/orchestrator';
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
  const { syncEnabled } = useSettings();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const syncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (!syncEnabled) return;
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
      setPendingCount(0); // pushPending cleared all pending flags
    } catch (e) {
      setSyncError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [syncEnabled]);

  useEffect(() => {
    if (!syncEnabled) return;
    countPending().then(setPendingCount);
    sync();
    const unregister = registerSyncHandler(sync);
    const onFocus = () => sync();
    const onVisibility = () => { if (!document.hidden) sync(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unregister();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sync, syncEnabled]);

  return { pendingCount, isSyncing, sync, syncError, syncEnabled };
}
