import { useState, useEffect, useCallback } from 'react';
import { getMyDayTasks } from '../db/tasks';
import { getLists } from '../db/lists';
import { getTasksByList } from '../db/tasks';
import { getTodayCompletions } from '../db/habits';
export function useMyDay() {
    const [data, setData] = useState({ overdue: [], today: [], habits: [], isLoading: true });
    const load = useCallback(async () => {
        try {
            const todayDate = new Date().toISOString().split('T')[0];
            const [{ overdue, today }, lists, todayCompletions] = await Promise.all([
                getMyDayTasks(todayDate),
                getLists(),
                getTodayCompletions(todayDate),
            ]);
            const dailyLists = lists.filter((l) => l.type === 'daily');
            const habitTasks = (await Promise.all(dailyLists.map((l) => getTasksByList(l.id)))).flat();
            const completedIds = new Set(todayCompletions.map((c) => c.task_id));
            setData({
                overdue,
                today,
                habits: habitTasks.map((task) => ({ task, completedToday: completedIds.has(task.id) })),
                isLoading: false,
            });
        }
        catch (err) {
            console.error('useMyDay load failed', err);
            setData((prev) => ({ ...prev, isLoading: false }));
        }
    }, []);
    useEffect(() => { load(); }, [load]);
    return { ...data, reload: load };
}
