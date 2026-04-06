import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
export function TaskItem({ title, completed, dueDate, today, onToggle, onRename, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const isOverdue = dueDate && dueDate < today;
    function startEdit() {
        setEditTitle(title);
        setEditing(true);
    }
    function commitEdit() {
        const t = editTitle.trim();
        if (t && t !== title)
            onRename?.(t);
        setEditing(false);
    }
    function cancelEdit() {
        setEditing(false);
    }
    if (editing) {
        return (_jsxs("div", { className: "task-item", children: [_jsx("input", { type: "checkbox", checked: completed, onChange: onToggle }), _jsx("input", { className: "task-item__edit-input", value: editTitle, onChange: (e) => setEditTitle(e.target.value), onKeyDown: (e) => {
                        if (e.key === 'Enter')
                            commitEdit();
                        if (e.key === 'Escape')
                            cancelEdit();
                    }, autoFocus: true }), _jsx("button", { className: "task-item__action-btn", onClick: commitEdit, title: "Save", children: _jsx(Check, { size: 13, strokeWidth: 2 }) }), _jsx("button", { className: "task-item__action-btn", onClick: cancelEdit, title: "Cancel", children: _jsx(X, { size: 13, strokeWidth: 2 }) })] }));
    }
    return (_jsxs("div", { className: "task-item", children: [_jsx("input", { type: "checkbox", checked: completed, onChange: onToggle }), _jsx("span", { className: `task-item__title${completed ? ' task-item__title--completed' : ''}`, children: title }), dueDate && (_jsx("span", { className: `task-item__date${isOverdue ? ' task-item__date--overdue' : ''}`, children: isOverdue ? dueDate : 'today' })), (onRename || onDelete) && (_jsxs("span", { className: "task-item__actions", children: [onRename && (_jsx("button", { className: "task-item__action-btn", onClick: startEdit, title: "Rename", children: _jsx(Pencil, { size: 12, strokeWidth: 1.75 }) })), onDelete && (_jsx("button", { className: "task-item__action-btn task-item__action-btn--danger", onClick: onDelete, title: "Delete", children: _jsx(Trash2, { size: 12, strokeWidth: 1.75 }) }))] }))] }));
}
