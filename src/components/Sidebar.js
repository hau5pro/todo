import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { useState, useRef } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Sun, Settings2, LogOut, ChevronDown, ChevronRight, List, ShoppingCart, RefreshCw, CalendarCheck, Copy, GripVertical, Plus, Check, X, } from 'lucide-react';
import { signOut } from '../supabase/auth';
import { useSettings } from '../contexts/SettingsContext';
import { useAppStore } from '../store';
import { ICON_SIZE } from '../config/icons';
const LIST_ICONS = {
    general: _jsx(List, { size: ICON_SIZE, strokeWidth: 1.75 }),
    shopping: _jsx(ShoppingCart, { size: ICON_SIZE, strokeWidth: 1.75 }),
    cyclical: _jsx(RefreshCw, { size: ICON_SIZE, strokeWidth: 1.75 }),
    daily: _jsx(CalendarCheck, { size: ICON_SIZE, strokeWidth: 1.75 }),
    template: _jsx(Copy, { size: ICON_SIZE, strokeWidth: 1.75 }),
};
const MY_DAY_SENTINEL = { id: 'my-day' };
// ── SortableItem ─────────────────────────────────────────────────────────────
function SortableItem({ list }) {
    const dragControls = useDragControls();
    return (_jsxs(Reorder.Item, { as: "div", value: list, dragListener: false, dragControls: dragControls, className: "nav-item-row", children: [_jsx("div", { className: "nav-drag-handle", onPointerDown: (e) => dragControls.start(e), children: _jsx(GripVertical, { size: ICON_SIZE, strokeWidth: 1.75 }) }), _jsxs(NavLink, { to: `/list/${list.id}`, className: ({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item', children: [LIST_ICONS[list.type], list.name] })] }));
}
function SortableMyDayItem() {
    const dragControls = useDragControls();
    return (_jsxs(Reorder.Item, { as: "div", value: MY_DAY_SENTINEL, dragListener: false, dragControls: dragControls, className: "nav-item-row", children: [_jsx("div", { className: "nav-drag-handle", onPointerDown: (e) => dragControls.start(e), children: _jsx(GripVertical, { size: ICON_SIZE, strokeWidth: 1.75 }) }), _jsxs(NavLink, { to: "/my-day", className: ({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item', children: [_jsx(Sun, { size: ICON_SIZE, strokeWidth: 1.75 }), "My Day"] })] }));
}
// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar() {
    const lists = useAppStore((s) => s.lists);
    const createList = useAppStore((s) => s.createList);
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [addingList, setAddingList] = useState(false);
    const [newListName, setNewListName] = useState('');
    const addInputRef = useRef(null);
    const { hiddenListIds, pinnedOrder, customOrder, setPinnedOrder, setCustomOrder, } = useSettings();
    // Pinned: IDs in pinnedOrder mapped to list objects or the my-day sentinel
    const pinnedItems = pinnedOrder
        .map((id) => id === 'my-day' ? MY_DAY_SENTINEL : lists.find((l) => l.id === id))
        .filter((item) => item !== undefined)
        .filter((item) => item.id === 'my-day' || !hiddenListIds.includes(item.id));
    // Custom: non-template lists NOT in pinnedOrder, sorted by customOrder
    const pinnedSet = new Set(pinnedOrder);
    const nonPinnedLists = lists.filter((l) => l.type !== 'template' && !pinnedSet.has(l.id) && !hiddenListIds.includes(l.id));
    const customOrderedIds = customOrder.filter((id) => nonPinnedLists.some((l) => l.id === id));
    const remainder = nonPinnedLists.filter((l) => !customOrder.includes(l.id));
    const customLists = [
        ...customOrderedIds.map((id) => nonPinnedLists.find((l) => l.id === id)),
        ...remainder,
    ];
    const templates = lists.filter((l) => l.type === 'template' && !hiddenListIds.includes(l.id));
    function startAddList() {
        setNewListName('');
        setAddingList(true);
        setTimeout(() => addInputRef.current?.focus(), 0);
    }
    async function commitAddList() {
        const name = newListName.trim();
        if (!name) {
            setAddingList(false);
            return;
        }
        try {
            const created = await createList(name, 'general');
            setCustomOrder([...customOrder, created.id]);
        }
        catch (err) {
            console.error(err);
        }
        setAddingList(false);
        setNewListName('');
    }
    function cancelAddList() {
        setAddingList(false);
        setNewListName('');
    }
    return (_jsxs("nav", { className: "sidebar", children: [pinnedItems.length > 0 && (_jsx(Reorder.Group, { as: "div", axis: "y", values: pinnedItems, onReorder: (newOrder) => setPinnedOrder(newOrder.map((item) => item.id)), className: "nav-reorder-group", children: pinnedItems.map((item) => item.id === 'my-day'
                    ? _jsx(SortableMyDayItem, {}, "my-day")
                    : _jsx(SortableItem, { list: item }, item.id)) })), _jsxs("div", { className: "nav-section-label", children: ["Lists", _jsx("button", { className: "nav-add-btn", onClick: startAddList, title: "New list", children: _jsx(Plus, { size: ICON_SIZE, strokeWidth: 2 }) })] }), _jsx(Reorder.Group, { as: "div", axis: "y", values: customLists, onReorder: (newOrder) => setCustomOrder(newOrder.map((l) => l.id)), className: "nav-reorder-group", children: customLists.map((l) => (_jsx(SortableItem, { list: l }, l.id))) }), addingList && (_jsxs("div", { className: "nav-item nav-item--editing", children: [_jsx("input", { ref: addInputRef, className: "nav-inline-input", placeholder: "List name", value: newListName, onChange: (e) => setNewListName(e.target.value), onKeyDown: (e) => {
                            if (e.key === 'Enter')
                                commitAddList();
                            if (e.key === 'Escape')
                                cancelAddList();
                        } }), _jsx("button", { className: "nav-action-btn", onClick: commitAddList, title: "Create", children: _jsx(Check, { size: ICON_SIZE, strokeWidth: 2 }) }), _jsx("button", { className: "nav-action-btn", onClick: cancelAddList, title: "Cancel", children: _jsx(X, { size: ICON_SIZE, strokeWidth: 2 }) })] })), templates.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("button", { className: "nav-section-label nav-section-label--button", onClick: () => setTemplatesOpen((o) => !o), children: ["Templates ", templatesOpen ? _jsx(ChevronDown, { size: ICON_SIZE }) : _jsx(ChevronRight, { size: ICON_SIZE })] }), templatesOpen && templates.map((l) => (_jsxs(NavLink, { to: `/list/${l.id}`, className: ({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item', children: [LIST_ICONS.template, l.name] }, l.id)))] })), _jsx("div", { className: "sidebar-spacer" }), _jsxs(NavLink, { to: "/settings", className: ({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item', children: [_jsx(Settings2, { size: ICON_SIZE, strokeWidth: 1.75 }), "Settings"] }), _jsxs("button", { className: "nav-item nav-btn", onClick: () => signOut().catch(console.error), children: [_jsx(LogOut, { size: ICON_SIZE, strokeWidth: 1.75 }), "Sign out"] })] }));
}
