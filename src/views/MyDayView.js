import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMyDay } from '../hooks/useMyDay';
import { TaskItem } from '../components/TaskItem';
import { HabitItem } from '../components/HabitItem';
import { setTaskCompleted, advanceCyclicalTask } from '../db/tasks';
import { toggleHabitCompletion, getCompletionsForTask, calculateStreak } from '../db/habits';
import { useState, useEffect, useMemo } from 'react';
function formatDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
export function MyDayView() {
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const { overdue, today: todayTasks, habits, isLoading, reload } = useMyDay();
    const [streaks, setStreaks] = useState(new Map());
    useEffect(() => {
        if (habits.length === 0)
            return;
        Promise.all(habits.map(async ({ task }) => {
            const completions = await getCompletionsForTask(task.id);
            return [task.id, calculateStreak(completions, task.id, today)];
        })).then((entries) => setStreaks(new Map(entries)));
    }, [habits, today]);
    async function handleTaskToggle(task) {
        if (task.recurrence_interval) {
            await advanceCyclicalTask(task.id);
        }
        else {
            await setTaskCompleted(task.id, !task.completed);
        }
        reload();
    }
    async function handleHabitToggle(taskId) {
        await toggleHabitCompletion(taskId, today);
        reload();
    }
    if (isLoading)
        return null;
    const hasAnything = overdue.length > 0 || todayTasks.length > 0 || habits.length > 0;
    return (_jsxs("div", { children: [_jsxs("h1", { className: "view-title", children: ["My Day \u2014 ", formatDate(new Date())] }), !hasAnything && _jsx("p", { className: "empty-state", children: "Nothing due today." }), overdue.length > 0 && (_jsxs("section", { children: [_jsx("div", { className: "section-heading", children: "Overdue" }), overdue.map((task) => (_jsx(TaskItem, { title: task.title, completed: task.completed, dueDate: task.due_date, today: today, onToggle: () => handleTaskToggle(task) }, task.id)))] })), todayTasks.length > 0 && (_jsxs("section", { children: [_jsx("div", { className: "section-heading", children: "Today" }), todayTasks.map((task) => (_jsx(TaskItem, { title: task.title, completed: task.completed, dueDate: task.due_date, today: today, onToggle: () => handleTaskToggle(task) }, task.id)))] })), habits.length > 0 && (_jsxs("section", { children: [_jsx("div", { className: "section-heading", children: "Habits" }), habits.map(({ task, completedToday }) => (_jsx(HabitItem, { title: task.title, completedToday: completedToday, streak: streaks.get(task.id) ?? 0, onToggle: () => handleHabitToggle(task.id) }, task.id)))] }))] }));
}
