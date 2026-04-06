import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useAppStore } from '../store';
import { ICON_SIZE } from '../config/icons';
export function TaskDetailPanel() {
    const { detail, close, updateTask: updateCtx } = useTaskDetail();
    const renameTask = useAppStore((s) => s.renameTask);
    const removeTask = useAppStore((s) => s.removeTask);
    const [editTitle, setEditTitle] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => {
        if (detail) {
            setEditTitle(detail.task.title);
            setConfirmDelete(false);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [detail?.task.id]);
    if (!detail)
        return null;
    const { task } = detail;
    async function commitTitle() {
        const t = editTitle.trim();
        if (!t || t === task.title)
            return;
        const updated = await renameTask(task.id, task.list_id, t);
        updateCtx(updated);
    }
    async function executeDelete() {
        await removeTask(task.id, task.list_id);
        close();
    }
    return (_jsxs("aside", { className: "task-detail-panel", children: [_jsx("div", { className: "task-detail-panel__header", children: _jsx("button", { className: "task-detail-close", onClick: close, title: "Close", children: _jsx(X, { size: ICON_SIZE, strokeWidth: 2 }) }) }), _jsx("div", { className: "task-detail-panel__body", children: _jsx("input", { ref: inputRef, className: "task-detail-title-input", value: editTitle, onChange: (e) => setEditTitle(e.target.value), onBlur: commitTitle, onKeyDown: (e) => {
                        if (e.key === 'Enter')
                            e.currentTarget.blur();
                        if (e.key === 'Escape') {
                            setEditTitle(task.title);
                            e.currentTarget.blur();
                        }
                    } }) }), _jsx("div", { className: "task-detail-panel__footer", children: confirmDelete ? (_jsxs("div", { className: "task-detail-delete-confirm", children: [_jsx("p", { children: "Delete this task?" }), _jsxs("div", { className: "task-detail-delete-confirm__actions", children: [_jsx("button", { className: "btn-danger-sm", onClick: executeDelete, children: "Delete" }), _jsx("button", { className: "btn-ghost-sm", onClick: () => setConfirmDelete(false), children: "Cancel" })] })] })) : (_jsxs("button", { className: "task-detail-delete-btn", onClick: () => setConfirmDelete(true), children: [_jsx(Trash2, { size: ICON_SIZE, strokeWidth: 2 }), "Delete task"] })) })] }));
}
