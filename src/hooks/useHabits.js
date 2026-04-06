import { useState, useCallback, useMemo, useEffect } from 'react';
import { getTasksByList } from '../db/tasks';
import { getCompletionsForTask, getTodayCompletions, calculateStreak } from '../db/habits';
export function useHabits(listId) {
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const load = useCallback(async () => {
        try {
            const [tasks, todayCompletions] = await Promise.all([
                getTasksByList(listId),
                getTodayCompletions(today),
            ]);
            const completedIds = new Set(todayCompletions.map((c) => c.task_id));
            const rowsWithStreaks = await Promise.all(tasks.map(async (task) => {
                const completions = await getCompletionsForTask(task.id);
                return {
                    task,
                    completedToday: completedIds.has(task.id),
                    streak: calculateStreak(completions, task.id, today),
                };
            }));
            setRows(rowsWithStreaks);
        }
        catch (err) {
            console.error('useHabits load failed', err);
        }
        finally {
            setIsLoading(false);
        }
    }, [listId, today]);
    useEffect(() => { load(); }, [load]);
    return { rows, isLoading, reload: load, today };
}
