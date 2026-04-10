import { useState, useEffect, useCallback, useRef } from 'react';
import { getMyDayTasks } from '../db/tasks';
import { getLists } from '../db/lists';
import { getTodayString } from '../utils/date';
import { getTasksByList } from '../db/tasks';
import { getTodayCompletions, getCompletionsForTask, calculateStreak } from '../db/habits';
import type { Task, List } from '../types';

interface HabitWithCompletion {
  task: Task;
  completedToday: boolean;
  streak: number;
}

interface MyDayData {
  overdue: Task[];
  today: Task[];
  habits: HabitWithCompletion[];
  isLoading: boolean;
}

export function useMyDay(): MyDayData & { reload: () => void } {
  const [data, setData] = useState<MyDayData>({ overdue: [], today: [], habits: [], isLoading: true });
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const todayDate = getTodayString();
      const [{ overdue, today }, lists, todayCompletions] = await Promise.all([
        getMyDayTasks(todayDate),
        getLists(),
        getTodayCompletions(todayDate),
      ]);

      const dailyLists = lists.filter((l: List) => l.type === 'daily');
      const habitTasks = (
        await Promise.all(dailyLists.map((l: List) => getTasksByList(l.id)))
      ).flat();

      const completedIds = new Set(todayCompletions.map((c) => c.task_id));

      const habits = await Promise.all(
        habitTasks.map(async (task) => {
          const completions = await getCompletionsForTask(task.id);
          return {
            task,
            completedToday: completedIds.has(task.id),
            streak: calculateStreak(completions, task.id, todayDate),
          };
        })
      );

      if (cancelledRef.current) return;
      setData({ overdue, today, habits, isLoading: false });
    } catch (err) {
      console.error('useMyDay load failed', err);
      if (!cancelledRef.current) setData((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return { ...data, reload: load };
}
