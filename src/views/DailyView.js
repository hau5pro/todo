import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useList } from '../hooks/useList';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion } from '../db/habits';
import { createTask } from '../db/tasks';
export function DailyView() {
    const { listId } = useParams();
    const { list } = useList(listId);
    const { rows, isLoading, reload, today } = useHabits(listId);
    const [newTitle, setNewTitle] = useState('');
    if (isLoading)
        return null;
    async function handleToggle(taskId) {
        await toggleHabitCompletion(taskId, today);
        reload();
    }
    async function handleAdd(e) {
        e.preventDefault();
        if (!newTitle.trim())
            return;
        await createTask(listId, newTitle.trim());
        setNewTitle('');
        reload();
    }
    return (_jsxs("div", { children: [_jsx("h1", { className: "view-title", children: list?.name ?? 'Habits' }), rows.map(({ task, completedToday, streak }) => (_jsx(HabitItem, { title: task.title, completedToday: completedToday, streak: streak, onToggle: () => handleToggle(task.id) }, task.id))), _jsx("form", { onSubmit: handleAdd, children: _jsx("input", { className: "add-task-input", placeholder: "+ Add habit", value: newTitle, onChange: (e) => setNewTitle(e.target.value) }) })] }));
}
