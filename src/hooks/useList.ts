import { useState, useEffect, useCallback } from 'react';
import { getListById } from '../db/lists';
import { getTasksByList } from '../db/tasks';
import type { List, Task } from '../types';

export function useList(listId: string) {
  const [list, setList] = useState<List | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const [l, t] = await Promise.all([
      getListById(listId),
      getTasksByList(listId),
    ]);
    setList(l ?? null);
    setTasks(t);
    setIsLoading(false);
  }, [listId]);

  useEffect(() => { load(); }, [load]);

  return { list, tasks, isLoading, reload: load };
}
