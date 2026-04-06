import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function TaskItem({ title, completed, dueDate, today, onToggle }) {
    const isOverdue = dueDate && dueDate < today;
    return (_jsxs("div", { className: "task-item", children: [_jsx("input", { type: "checkbox", checked: completed, onChange: onToggle }), _jsx("span", { className: `task-item__title${completed ? ' task-item__title--completed' : ''}`, children: title }), dueDate && (_jsx("span", { className: `task-item__date${isOverdue ? ' task-item__date--overdue' : ''}`, children: isOverdue ? dueDate : 'today' }))] }));
}
