import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { getTasksByList } from '../db/tasks';
import { getCompletionsForTask, getTodayCompletions, calculateStreak } from '../db/habits';
import { getTodayString } from '../utils/date';
import type { Task } from '../types';

export interface HabitRow {
  task: Task;
  completedToday: boolean;
  streak: number;
}

export function useHabits(listId: string) {
  const [rows, setRows] = useState<HabitRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const today = useMemo(() => getTodayString(), []);
  const cancelledRef = useRef(false);

  const load = useCallback(async (): Promise<HabitRow[]> => {
    try {
      const [tasks, todayCompletions] = await Promise.all([
        getTasksByList(listId),
        getTodayCompletions(today),
      ]);

      const completedIds = new Set(todayCompletions.map((c) => c.task_id));

      const rowsWithStreaks = await Promise.all(
        tasks.map(async (task) => {
          const completions = await getCompletionsForTask(task.id);
          return {
            task,
            completedToday: completedIds.has(task.id),
            streak: calculateStreak(completions, task.id, today),
          };
        })
      );

      if (cancelledRef.current) return [];
      setRows(rowsWithStreaks);
      return rowsWithStreaks;
    } catch (err) {
      console.error('useHabits load failed', err);
      return [];
    } finally {
      if (!cancelledRef.current) setIsLoading(false);
    }
  }, [listId, today]);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [listId, today]);

  return { rows, isLoading, reload: load, today };
}
