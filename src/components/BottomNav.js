import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, useLocation } from 'react-router-dom';
export function BottomNav() {
    const location = useLocation();
    const inList = location.pathname.startsWith('/list/');
    return (_jsxs("nav", { className: "bottom-nav", children: [_jsx(NavLink, { to: "/my-day", className: ({ isActive }) => isActive ? 'bottom-tab bottom-tab--active' : 'bottom-tab', children: "My Day" }), _jsx(NavLink, { to: "/lists", className: ({ isActive }) => isActive ? 'bottom-tab bottom-tab--active' : 'bottom-tab', children: "Lists" }), inList && (_jsx("span", { className: "bottom-tab bottom-tab--active", children: "List" })), _jsx(NavLink, { to: "/settings", className: ({ isActive }) => isActive ? 'bottom-tab bottom-tab--active' : 'bottom-tab', children: "Settings" })] }));
}
