import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sun, Settings2, LogOut, ChevronDown, ChevronRight, List, ShoppingCart, RefreshCw, CalendarCheck, Copy } from 'lucide-react';
import { getLists } from '../db/lists';
import { signOut } from '../supabase/auth';
import { useSettings } from '../contexts/SettingsContext';
const LIST_ICONS = {
    general: _jsx(List, { size: 14, strokeWidth: 1.75 }),
    shopping: _jsx(ShoppingCart, { size: 14, strokeWidth: 1.75 }),
    cyclical: _jsx(RefreshCw, { size: 14, strokeWidth: 1.75 }),
    daily: _jsx(CalendarCheck, { size: 14, strokeWidth: 1.75 }),
    template: _jsx(Copy, { size: 14, strokeWidth: 1.75 }),
};
export function Sidebar() {
    const [lists, setLists] = useState([]);
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const { hiddenListIds, showMyDay } = useSettings();
    useEffect(() => {
        getLists().then(setLists).catch((err) => console.error('Failed to load lists', err));
    }, []);
    const userLists = lists.filter((l) => l.type !== 'template' && !hiddenListIds.includes(l.id));
    const templates = lists.filter((l) => l.type === 'template' && !hiddenListIds.includes(l.id));
    return (_jsxs("nav", { className: "sidebar", children: [showMyDay && (_jsxs(NavLink, { to: "/my-day", className: ({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item', children: [_jsx(Sun, { size: 14, strokeWidth: 1.75 }), "My Day"] })), _jsx("div", { className: "nav-section-label", children: "Lists" }), userLists.map((l) => (_jsxs(NavLink, { to: `/list/${l.id}`, className: ({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item', children: [LIST_ICONS[l.type], l.name] }, l.id))), templates.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("button", { className: "nav-section-label nav-section-label--button", onClick: () => setTemplatesOpen((o) => !o), children: ["Templates ", templatesOpen ? _jsx(ChevronDown, { size: 11 }) : _jsx(ChevronRight, { size: 11 })] }), templatesOpen && templates.map((l) => (_jsxs(NavLink, { to: `/list/${l.id}`, className: ({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item', children: [LIST_ICONS.template, l.name] }, l.id)))] })), _jsx("div", { className: "sidebar-spacer" }), _jsxs(NavLink, { to: "/settings", className: ({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item', children: [_jsx(Settings2, { size: 14, strokeWidth: 1.75 }), "Settings"] }), _jsxs("button", { className: "nav-item nav-btn", onClick: () => signOut().catch(console.error), children: [_jsx(LogOut, { size: 14, strokeWidth: 1.75 }), "Sign out"] })] }));
}
