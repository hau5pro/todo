import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { ICON_SIZE } from '../config/icons';
import { Reorder, useDragControls } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { playComplete } from '../utils/sound';
import { useAppStore } from '../store';
import { clearAllLocalData } from '../db/client';
import { deleteAllCloudData } from '../db/sync';
import { signOut } from '../supabase/auth';
import { supabase } from '../supabase/client';
import { ColorSwatchPicker } from '../components/ColorSwatchPicker';
import { SettingsRow } from '../components/SettingsRow';
const MY_DAY_SENTINEL = { id: 'my-day' };
// ── SortableSettingsRow ───────────────────────────────────────────────────────
function SortableSettingsRow({ list, checked, onChange }) {
    const dragControls = useDragControls();
    return (_jsxs(Reorder.Item, { as: "div", value: list, dragListener: false, dragControls: dragControls, className: "settings-row-sortable", children: [_jsx("div", { className: "settings-drag-handle", onPointerDown: (e) => dragControls.start(e), children: _jsx(GripVertical, { size: ICON_SIZE, strokeWidth: 1.75 }) }), _jsx(SettingsRow, { label: list.name, sublabel: list.type, checked: checked, onChange: onChange })] }));
}
function SortableMyDaySettingsRow({ checked, onChange }) {
    const dragControls = useDragControls();
    return (_jsxs(Reorder.Item, { as: "div", value: MY_DAY_SENTINEL, dragListener: false, dragControls: dragControls, className: "settings-row-sortable", children: [_jsx("div", { className: "settings-drag-handle", onPointerDown: (e) => dragControls.start(e), children: _jsx(GripVertical, { size: ICON_SIZE, strokeWidth: 1.75 }) }), _jsx(SettingsRow, { label: "My Day", sublabel: "built-in", checked: checked, onChange: onChange })] }));
}
// ── SettingsView ──────────────────────────────────────────────────────────────
export function SettingsView() {
    const { accent, setAccent, theme, setTheme, hiddenListIds, toggleListVisibility, showMyDay, setShowMyDay, pinnedOrder, customOrder, setPinnedOrder, setCustomOrder, soundEnabled, setSoundEnabled, } = useSettings();
    const lists = useAppStore((s) => s.lists);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    async function handleDeleteAll() {
        setBusy(true);
        setDeleteError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user)
                await deleteAllCloudData(supabase, user.id);
            await clearAllLocalData();
            localStorage.clear();
            await signOut();
        }
        catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
            setBusy(false);
        }
    }
    const pinnedSet = new Set(pinnedOrder);
    const pinnedItems = pinnedOrder
        .map((id) => id === 'my-day' ? MY_DAY_SENTINEL : lists.find((l) => l.id === id))
        .filter((item) => item !== undefined);
    const nonPinnedLists = lists.filter((l) => l.type !== 'template' && !pinnedSet.has(l.id));
    const customOrderedIds = customOrder.filter((id) => nonPinnedLists.some((l) => l.id === id));
    const remainder = nonPinnedLists.filter((l) => !customOrder.includes(l.id));
    const customLists = [
        ...customOrderedIds.map((id) => nonPinnedLists.find((l) => l.id === id)),
        ...remainder,
    ];
    const templates = lists.filter((l) => l.type === 'template');
    return (_jsxs("div", { style: { maxWidth: 480 }, children: [_jsx("h1", { className: "view-title", style: { marginBottom: '2rem' }, children: "Settings" }), _jsxs("section", { className: "settings-section", children: [_jsx("div", { className: "settings-section-title", children: "Appearance" }), _jsxs("div", { className: "settings-appearance-fields", children: [_jsxs("div", { className: "settings-appearance-field", children: [_jsx("span", { className: "settings-field-label", children: "Accent color" }), _jsx(ColorSwatchPicker, { accent: accent, onSelect: setAccent })] }), _jsxs("div", { className: "settings-appearance-field", children: [_jsx("span", { className: "settings-field-label", children: "Theme" }), _jsx("div", { className: "theme-btn-group theme-btn-group--vertical", children: ['system', 'light', 'dark'].map((t) => (_jsx("button", { className: `theme-btn${theme === t ? ' theme-btn--active' : ''}`, onClick: () => setTheme(t), children: t.charAt(0).toUpperCase() + t.slice(1) }, t))) })] })] })] }), _jsxs("section", { className: "settings-section", children: [_jsx("div", { className: "settings-section-title", children: "Sound" }), _jsx(SettingsRow, { label: "Completion sound", sublabel: "plays when a task is checked off", checked: soundEnabled, onChange: () => {
                            const next = !soundEnabled;
                            setSoundEnabled(next);
                            if (next)
                                playComplete();
                        } })] }), _jsxs("section", { className: "settings-section", children: [_jsx("div", { className: "settings-section-title", children: "Navigation" }), _jsx("p", { style: { fontSize: '0.85rem', color: 'var(--fg-muted)', margin: '0.5rem 0 0.875rem' }, children: "Choose which lists appear in the sidebar." }), pinnedItems.length === 0 && customLists.length === 0 && templates.length === 0 && (_jsx("p", { className: "empty-state", style: { marginTop: '0.5rem' }, children: "No lists yet." })), pinnedItems.length > 0 && (_jsx(Reorder.Group, { as: "div", axis: "y", values: pinnedItems, onReorder: (newOrder) => setPinnedOrder(newOrder.map((item) => item.id)), children: pinnedItems.map((item) => item.id === 'my-day'
                            ? _jsx(SortableMyDaySettingsRow, { checked: showMyDay, onChange: () => setShowMyDay(!showMyDay) }, "my-day")
                            : _jsx(SortableSettingsRow, { list: item, checked: !hiddenListIds.includes(item.id), onChange: () => toggleListVisibility(item.id) }, item.id)) })), customLists.length > 0 && (_jsxs(_Fragment, { children: [pinnedItems.length > 0 && (_jsx("div", { style: { fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--fg-muted)', padding: '0.875rem 0 0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Custom" })), _jsx(Reorder.Group, { as: "div", axis: "y", values: customLists, onReorder: (newOrder) => setCustomOrder(newOrder.map((l) => l.id)), children: customLists.map((l) => (_jsx(SortableSettingsRow, { list: l, checked: !hiddenListIds.includes(l.id), onChange: () => toggleListVisibility(l.id) }, l.id))) })] })), templates.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--fg-muted)', padding: '0.875rem 0 0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Templates" }), templates.map((l) => (_jsx(SettingsRow, { label: l.name, sublabel: "template", checked: !hiddenListIds.includes(l.id), onChange: () => toggleListVisibility(l.id) }, l.id)))] }))] }), _jsxs("section", { className: "settings-section", children: [_jsx("div", { className: "settings-section-title", children: "Danger zone" }), _jsx("div", { className: "danger-zone", style: { marginTop: '0.75rem' }, children: !confirmDelete ? (_jsxs(_Fragment, { children: [_jsx("p", { style: { fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.75rem' }, children: "Permanently deletes all your data from this device and the cloud." }), _jsxs("button", { className: "btn-danger", onClick: () => setConfirmDelete(true), disabled: busy, children: [_jsx(Trash2, { size: ICON_SIZE, strokeWidth: 2 }), "Delete everything and sign out"] })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { style: { fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }, children: "Are you absolutely sure?" }), _jsxs("p", { style: { fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.875rem' }, children: ["This will permanently delete all lists, tasks, and habits from ", _jsx("strong", { children: "this device and the cloud" }), ". There is no undo."] }), deleteError && (_jsx("p", { style: { fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '0.625rem' }, children: deleteError })), _jsxs("div", { style: { display: 'flex', gap: '0.5rem' }, children: [_jsx("button", { className: "btn-danger", onClick: handleDeleteAll, disabled: busy, children: busy ? 'Deleting…' : 'Yes, delete everything' }), _jsx("button", { className: "btn-ghost", style: { padding: '6px 14px' }, onClick: () => { setConfirmDelete(false); setDeleteError(null); }, disabled: busy, children: "Cancel" })] })] })) })] })] }));
}
