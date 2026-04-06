import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function SettingsRow({ label, sublabel, checked, onChange }) {
    return (_jsxs("div", { className: "settings-row", children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: '0.875rem' }, children: label }), sublabel && (_jsx("div", { style: { fontSize: '0.72rem', color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }, children: sublabel }))] }), _jsx("button", { role: "switch", "aria-checked": checked, onClick: onChange, className: `toggle-btn${checked ? ' toggle-btn--on' : ''}` })] }));
}
