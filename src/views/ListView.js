import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useList } from '../hooks/useList';
import { TaskItem } from '../components/TaskItem';
import { createTask, setTaskCompleted, advanceCyclicalTask, softDeleteTask } from '../db/tasks';
export function ListView() {
    const { listId } = useParams();
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const { list, tasks, isLoading, reload } = useList(listId);
    const [newTitle, setNewTitle] = useState('');
    if (isLoading || !list)
        return null;
    // Shopping: show soft-deleted items as recent history; others: show active only
    const activeTasks = tasks.filter((t) => !t.completed && t.deleted_at === null);
    const recentCompleted = list.type === 'shopping'
        ? tasks.filter((t) => t.deleted_at !== null)
        : [];
    async function handleToggle(task) {
        if (list.type === 'cyclical' && task.recurrence_interval) {
            await advanceCyclicalTask(task.id);
        }
        else if (list.type === 'shopping') {
            await softDeleteTask(task.id);
        }
        else {
            await setTaskCompleted(task.id, !task.completed);
        }
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
    return (_jsxs("div", { children: [_jsx("h1", { className: "view-title", children: list.name }), activeTasks.map((task) => (_jsx(TaskItem, { title: task.title, completed: task.completed, dueDate: task.due_date, today: today, onToggle: () => handleToggle(task) }, task.id))), _jsx("form", { onSubmit: handleAdd, children: _jsx("input", { className: "add-task-input", placeholder: "+ Add task", value: newTitle, onChange: (e) => setNewTitle(e.target.value) }) }), recentCompleted.length > 0 && (_jsxs("section", { children: [_jsx("div", { className: "section-heading", children: "Recently completed" }), recentCompleted.map((task) => (_jsx(TaskItem, { title: task.title, completed: true, today: today, onToggle: () => { } }, task.id)))] }))] }));
}
