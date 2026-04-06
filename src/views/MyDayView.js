import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Reorder } from 'framer-motion';
import { useAppStore } from '../store';
import { useSettings } from '../contexts/SettingsContext';
import { TaskItem } from '../components/TaskItem';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion, getCompletionsForTask, calculateStreak } from '../db/habits';
function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
function formatDate(d) {
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    const year = d.getFullYear();
    return `${weekday}, ${month} ${ordinal(d.getDate())}, ${year}`;
}
function applyOrder(tasks, order) {
    if (order.length === 0)
        return tasks;
    const map = new Map(tasks.map((t) => [t.id, t]));
    const ordered = order.flatMap((id) => (map.has(id) ? [map.get(id)] : []));
    const rest = tasks.filter((t) => !order.includes(t.id));
    return [...ordered, ...rest];
}
export function MyDayView() {
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const { myDayOverdue, myDayToday, myDayHabits, myDayLoaded, loadMyDay, completeTask, advanceCyclicalTask } = useAppStore();
    const { myDayOrder, setMyDayOrder } = useSettings();
    const [streaks, setStreaks] = useState(new Map());
    useEffect(() => { loadMyDay(); }, []);
    useEffect(() => {
        if (myDayHabits.length === 0)
            return;
        Promise.all(myDayHabits.map(async ({ task }) => {
            const completions = await getCompletionsForTask(task.id);
            return [task.id, calculateStreak(completions, task.id, today)];
        })).then((entries) => setStreaks(new Map(entries)));
    }, [myDayHabits, today]);
    async function handleTaskToggle(task) {
        if (task.recurrence_interval) {
            await advanceCyclicalTask(task.id, task.list_id);
        }
        else {
            await completeTask(task.id, task.list_id, !task.completed);
        }
    }
    async function handleHabitToggle(taskId) {
        await toggleHabitCompletion(taskId, today);
        loadMyDay();
    }
    if (!myDayLoaded)
        return null;
    const hasAnything = myDayOverdue.length > 0 || myDayToday.length > 0 || myDayHabits.length > 0;
    const orderedOverdue = applyOrder(myDayOverdue, myDayOrder);
    const orderedToday = applyOrder(myDayToday, myDayOrder);
    function handleReorder(reordered) {
        // Merge the reordered section IDs back into the full order
        const reorderedIds = reordered.map((t) => t.id);
        const otherIds = myDayOrder.filter((id) => !myDayOverdue.some((t) => t.id === id) && !myDayToday.some((t) => t.id === id));
        setMyDayOrder([...reorderedIds, ...otherIds]);
    }
    return (_jsxs("div", { children: [_jsxs("h1", { className: "view-title", children: ["My Day \u2014 ", formatDate(new Date())] }), !hasAnything && _jsx("p", { className: "empty-state", children: "Nothing due today." }), myDayOverdue.length > 0 && (_jsxs("section", { children: [_jsx("div", { className: "section-heading", children: "Overdue" }), _jsx(Reorder.Group, { as: "div", axis: "y", values: orderedOverdue, onReorder: handleReorder, children: orderedOverdue.map((task) => (_jsx(Reorder.Item, { as: "div", value: task, children: _jsx(TaskItem, { title: task.title, completed: task.completed, dueDate: task.due_date, today: today, onToggle: () => handleTaskToggle(task) }) }, task.id))) })] })), myDayToday.length > 0 && (_jsxs("section", { children: [_jsx("div", { className: "section-heading", children: "Today" }), _jsx(Reorder.Group, { as: "div", axis: "y", values: orderedToday, onReorder: handleReorder, children: orderedToday.map((task) => (_jsx(Reorder.Item, { as: "div", value: task, children: _jsx(TaskItem, { title: task.title, completed: task.completed, dueDate: task.due_date, today: today, onToggle: () => handleTaskToggle(task) }) }, task.id))) })] })), myDayHabits.length > 0 && (_jsxs("section", { children: [_jsx("div", { className: "section-heading", children: "Habits" }), myDayHabits.map(({ task, completedToday }) => (_jsx(HabitItem, { title: task.title, completedToday: completedToday, streak: streaks.get(task.id) ?? 0, onToggle: () => handleHabitToggle(task.id) }, task.id)))] }))] }));
}
