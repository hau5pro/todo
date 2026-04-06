import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { TaskItem } from '../components/TaskItem';
import { ICON_SIZE } from '../config/icons';
export function ListView() {
    const { listId } = useParams();
    const navigate = useNavigate();
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
    const tasks = useAppStore((s) => s.tasksByList[listId]);
    const loadTasks = useAppStore((s) => s.loadTasks);
    const { renameList, deleteList, addTask, completeTask, shoppingCompleteTask, shoppingRestoreTask, advanceCyclicalTask } = useAppStore();
    const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
    const [newTitle, setNewTitle] = useState('');
    const [editingListName, setEditingListName] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [confirmDeleteList, setConfirmDeleteList] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const listNameInputRef = useRef(null);
    useEffect(() => {
        if (tasks === undefined)
            loadTasks(listId);
    }, [listId]);
    useEffect(() => { closeDetail(); }, [listId]);
    if (!list || tasks === undefined)
        return null;
    const activeTasks = tasks.filter((t) => !t.completed && t.deleted_at === null);
    const completedTasks = list.type !== 'shopping'
        ? tasks.filter((t) => t.completed && t.deleted_at === null)
        : [];
    const recentCompleted = list.type === 'shopping'
        ? tasks.filter((t) => t.deleted_at !== null)
        : [];
    async function handleToggle(task) {
        if (list.type === 'cyclical' && task.recurrence_interval) {
            await advanceCyclicalTask(task.id, listId);
        }
        else if (list.type === 'shopping') {
            await shoppingCompleteTask(task.id, listId);
        }
        else {
            await completeTask(task.id, listId, !task.completed);
        }
    }
    async function handleAdd(e) {
        e.preventDefault();
        if (!newTitle.trim())
            return;
        await addTask(listId, newTitle.trim());
        setNewTitle('');
    }
    function startEditListName() {
        setNewListName(list.name);
        setEditingListName(true);
        setTimeout(() => listNameInputRef.current?.focus(), 0);
    }
    async function commitEditListName() {
        const name = newListName.trim();
        if (name && name !== list.name)
            await renameList(listId, name);
        setEditingListName(false);
    }
    async function executeDeleteList() {
        await deleteList(listId);
        closeDetail();
        navigate('/');
    }
    function handleSelectTask(task) {
        if (detail?.task.id === task.id) {
            closeDetail();
        }
        else {
            openDetail({ task });
        }
    }
    return (_jsxs("div", { children: [_jsx("div", { className: "view-title-row", children: editingListName ? (_jsxs(_Fragment, { children: [_jsx("input", { ref: listNameInputRef, className: "view-title-input", value: newListName, onChange: (e) => setNewListName(e.target.value), onKeyDown: (e) => {
                                if (e.key === 'Enter')
                                    commitEditListName();
                                if (e.key === 'Escape')
                                    setEditingListName(false);
                            } }), _jsx("button", { className: "view-title-action-btn", onClick: commitEditListName, title: "Save", children: _jsx(Check, { size: ICON_SIZE, strokeWidth: 2 }) }), _jsx("button", { className: "view-title-action-btn", onClick: () => setEditingListName(false), title: "Cancel", children: _jsx(X, { size: ICON_SIZE, strokeWidth: 2 }) })] })) : (_jsxs(_Fragment, { children: [_jsx("h1", { className: "view-title", children: list.name }), _jsxs("span", { className: "view-title-actions", children: [_jsx("button", { className: "view-title-action-btn", onClick: startEditListName, title: "Rename list", children: _jsx(Pencil, { size: ICON_SIZE, strokeWidth: 2 }) }), _jsx("button", { className: "view-title-action-btn view-title-action-btn--danger", onClick: () => setConfirmDeleteList(true), title: "Delete list", children: _jsx(Trash2, { size: ICON_SIZE, strokeWidth: 2 }) })] })] })) }), activeTasks.map((task) => (_jsx(TaskItem, { title: task.title, completed: task.completed, dueDate: task.due_date, today: today, onToggle: () => handleToggle(task), onSelect: () => handleSelectTask(task), isSelected: detail?.task.id === task.id }, task.id))), _jsx("form", { onSubmit: handleAdd, children: _jsx("input", { className: "add-task-input", placeholder: "+ Add task", value: newTitle, onChange: (e) => setNewTitle(e.target.value) }) }), _jsxs("section", { children: [_jsxs("button", { className: "section-collapse-btn", onClick: () => setShowCompleted((p) => !p), children: [_jsxs("span", { className: "section-heading", style: { margin: 0 }, children: ["Completed", completedTasks.length > 0 ? ` (${completedTasks.length})` : ''] }), showCompleted
                                ? _jsx(ChevronDown, { size: ICON_SIZE, strokeWidth: 2 })
                                : _jsx(ChevronRight, { size: ICON_SIZE, strokeWidth: 2 })] }), showCompleted && completedTasks.map((task) => (_jsx(TaskItem, { title: task.title, completed: true, dueDate: task.due_date, today: today, onToggle: () => handleToggle(task), onSelect: () => handleSelectTask(task), isSelected: detail?.task.id === task.id }, task.id)))] }), recentCompleted.length > 0 && (_jsxs("section", { children: [_jsx("div", { className: "section-heading", children: "Recently completed" }), recentCompleted.map((task) => (_jsx(TaskItem, { title: task.title, completed: true, today: today, onToggle: () => shoppingRestoreTask(task.id, listId) }, task.id)))] })), confirmDeleteList && (_jsx("div", { className: "modal-backdrop", onClick: () => setConfirmDeleteList(false), children: _jsxs("div", { className: "modal-popup", onClick: (e) => e.stopPropagation(), children: [_jsxs("h3", { className: "modal-popup__title", children: ["Delete \"", list.name, "\"?"] }), _jsx("p", { className: "modal-popup__body", children: "This will permanently delete the list and all its tasks." }), _jsxs("div", { className: "modal-popup__actions", children: [_jsx("button", { className: "btn-danger-sm", onClick: executeDeleteList, children: "Delete" }), _jsx("button", { className: "btn-ghost-sm", onClick: () => setConfirmDeleteList(false), children: "Cancel" })] })] }) }))] }));
}
