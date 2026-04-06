import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function HabitItem({ title, completedToday, streak, onToggle }) {
    return (_jsxs("div", { className: "habit-item", children: [_jsx("input", { type: "checkbox", checked: completedToday, onChange: onToggle }), _jsx("span", { children: title }), streak > 0 && _jsxs("span", { className: "habit-item__streak", children: ["\uD83D\uDD25 ", streak] })] }));
}
