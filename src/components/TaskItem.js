import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ICON_SIZE } from '../config/icons';
export function TaskItem({ title, completed, dueDate, today, onToggle, onSelect, isSelected }) {
    const isOverdue = dueDate && dueDate < today;
    return (_jsxs("div", { className: `task-item${isSelected ? ' task-item--selected' : ''}${onSelect ? ' task-item--selectable' : ''}`, onClick: onSelect, children: [_jsx("input", { type: "checkbox", checked: completed, onChange: onToggle, onClick: (e) => e.stopPropagation(), style: { width: ICON_SIZE, height: ICON_SIZE, flexShrink: 0 } }), _jsx("span", { className: `task-item__title${completed ? ' task-item__title--completed' : ''}`, children: title }), dueDate && (_jsx("span", { className: `task-item__date${isOverdue ? ' task-item__date--overdue' : ''}`, children: isOverdue ? dueDate : 'today' }))] }));
}
