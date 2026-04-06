import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { useSettings } from '../contexts/SettingsContext';
import { playComplete } from '../utils/sound';
export function TaskItem({ title, completed, dueDate, today, onToggle, onSelect, isSelected }) {
    const isOverdue = dueDate && dueDate < today;
    const { soundEnabled } = useSettings();
    const [flashing, setFlashing] = useState(false);
    const prev = useRef(completed);
    useEffect(() => {
        if (completed && !prev.current) {
            setFlashing(true);
            if (soundEnabled)
                playComplete();
            const t = setTimeout(() => setFlashing(false), 600);
            return () => clearTimeout(t);
        }
        prev.current = completed;
    }, [completed, soundEnabled]);
    return (_jsxs("div", { className: [
            'task-item',
            isSelected ? 'task-item--selected' : '',
            onSelect ? 'task-item--selectable' : '',
            flashing ? 'task-item--flash' : '',
        ].filter(Boolean).join(' '), onClick: onSelect, children: [_jsx(AnimatedCheckbox, { checked: completed, onChange: onToggle }), _jsx("span", { className: `task-item__title${completed ? ' task-item__title--completed' : ''}`, children: title }), dueDate && (_jsx("span", { className: `task-item__date${isOverdue ? ' task-item__date--overdue' : ''}`, children: isOverdue ? dueDate : 'today' }))] }));
}
