import { useState, useCallback, useMemo, useEffect } from 'react';
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

  const load = useCallback(async () => {
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

      setRows(rowsWithStreaks);
    } catch (err) {
      console.error('useHabits load failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [listId, today]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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

        if (cancelled) return;
        setRows(rowsWithStreaks);
      } catch (err) {
        console.error('useHabits load failed', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listId, today]);

  return { rows, isLoading, reload: load, today };
}
