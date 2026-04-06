import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { useList } from '../hooks/useList';
import { TaskItem } from '../components/TaskItem';
import { createTask, setTaskCompleted, advanceCyclicalTask, softDeleteTask, updateTask } from '../db/tasks';
import { updateList, deleteList } from '../db/lists';
export function ListView() {
    const { listId } = useParams();
    const navigate = useNavigate();
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const { list, tasks, isLoading, reload } = useList(listId);
    const [newTitle, setNewTitle] = useState('');
    const [editingListName, setEditingListName] = useState(false);
    const [newListName, setNewListName] = useState('');
    const listNameInputRef = useRef(null);
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
    function startEditListName() {
        setNewListName(list.name);
        setEditingListName(true);
        setTimeout(() => listNameInputRef.current?.focus(), 0);
    }
    async function commitEditListName() {
        const name = newListName.trim();
        if (name && name !== list.name) {
            await updateList(listId, { name });
            reload();
        }
        setEditingListName(false);
    }
    function cancelEditListName() {
        setEditingListName(false);
    }
    async function handleDeleteList() {
        if (!confirm(`Delete "${list.name}" and all its tasks?`))
            return;
        await deleteList(listId);
        navigate('/');
    }
    async function handleRenameTask(task, title) {
        await updateTask(task.id, { title });
        reload();
    }
    async function handleDeleteTask(task) {
        await softDeleteTask(task.id);
        reload();
    }
    return (_jsxs("div", { children: [_jsx("div", { className: "view-title-row", children: editingListName ? (_jsxs(_Fragment, { children: [_jsx("input", { ref: listNameInputRef, className: "view-title-input", value: newListName, onChange: (e) => setNewListName(e.target.value), onKeyDown: (e) => {
                                if (e.key === 'Enter')
                                    commitEditListName();
                                if (e.key === 'Escape')
                                    cancelEditListName();
                            } }), _jsx("button", { className: "view-title-action-btn", onClick: commitEditListName, title: "Save", children: _jsx(Check, { size: 15, strokeWidth: 2 }) }), _jsx("button", { className: "view-title-action-btn", onClick: cancelEditListName, title: "Cancel", children: _jsx(X, { size: 15, strokeWidth: 2 }) })] })) : (_jsxs(_Fragment, { children: [_jsx("h1", { className: "view-title", children: list.name }), _jsxs("span", { className: "view-title-actions", children: [_jsx("button", { className: "view-title-action-btn", onClick: startEditListName, title: "Rename list", children: _jsx(Pencil, { size: 14, strokeWidth: 1.75 }) }), _jsx("button", { className: "view-title-action-btn view-title-action-btn--danger", onClick: handleDeleteList, title: "Delete list", children: _jsx(Trash2, { size: 14, strokeWidth: 1.75 }) })] })] })) }), activeTasks.map((task) => (_jsx(TaskItem, { title: task.title, completed: task.completed, dueDate: task.due_date, today: today, onToggle: () => handleToggle(task), onRename: (newTitle) => handleRenameTask(task, newTitle), onDelete: () => handleDeleteTask(task) }, task.id))), _jsx("form", { onSubmit: handleAdd, children: _jsx("input", { className: "add-task-input", placeholder: "+ Add task", value: newTitle, onChange: (e) => setNewTitle(e.target.value) }) }), recentCompleted.length > 0 && (_jsxs("section", { children: [_jsx("div", { className: "section-heading", children: "Recently completed" }), recentCompleted.map((task) => (_jsx(TaskItem, { title: task.title, completed: true, today: today, onToggle: () => { } }, task.id)))] }))] }));
}
