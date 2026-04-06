import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { useSettings, ACCENT_COLORS } from '../contexts/SettingsContext';
import { getLists } from '../db/lists';
import { clearAllLocalData } from '../db/client';
import { deleteAllCloudData } from '../db/sync';
import { signOut } from '../supabase/auth';
import { supabase } from '../supabase/client';
function ToggleButton({ checked, onChange }) {
    return (_jsx("button", { role: "switch", "aria-checked": checked, onClick: onChange, className: `toggle-btn${checked ? ' toggle-btn--on' : ''}` }));
}
export function SettingsView() {
    const { accent, setAccent, hiddenListIds, toggleListVisibility, showMyDay, setShowMyDay } = useSettings();
    const [lists, setLists] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    useEffect(() => {
        getLists().then(setLists).catch((err) => console.error('Failed to load lists', err));
    }, []);
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
    const userLists = lists.filter((l) => l.type !== 'template');
    const templates = lists.filter((l) => l.type === 'template');
    return (_jsxs("div", { style: { maxWidth: 480 }, children: [_jsx("h1", { className: "view-title", style: { marginBottom: '2rem' }, children: "Settings" }), _jsxs("section", { className: "settings-section", children: [_jsx("div", { className: "settings-section-title", children: "Appearance" }), _jsx("div", { className: "color-swatches", style: { marginTop: '0.75rem' }, children: ACCENT_COLORS.map((c) => (_jsx("button", { className: `color-swatch${accent === c.key ? ' color-swatch--selected' : ''}`, style: { background: c.hex, '--swatch-hex': c.hex }, onClick: () => setAccent(c.key), title: c.label, "aria-label": `${c.label} accent color`, children: accent === c.key && _jsx(Check, { size: 11, strokeWidth: 2.5, color: "white" }) }, c.key))) })] }), _jsxs("section", { className: "settings-section", children: [_jsx("div", { className: "settings-section-title", children: "Navigation" }), _jsx("p", { style: { fontSize: '0.85rem', color: 'var(--fg-muted)', margin: '0.5rem 0 0.875rem' }, children: "Choose which lists appear in the sidebar." }), _jsxs("div", { className: "settings-row", children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: '0.875rem' }, children: "My Day" }), _jsx("div", { style: { fontSize: '0.72rem', color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }, children: "built-in" })] }), _jsx(ToggleButton, { checked: showMyDay, onChange: () => setShowMyDay(!showMyDay) })] }), userLists.length === 0 && templates.length === 0 && (_jsx("p", { className: "empty-state", style: { marginTop: '0.5rem' }, children: "No lists yet." })), userLists.map((l) => (_jsxs("div", { className: "settings-row", children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: '0.875rem' }, children: l.name }), _jsx("div", { style: { fontSize: '0.72rem', color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }, children: l.type })] }), _jsx(ToggleButton, { checked: !hiddenListIds.includes(l.id), onChange: () => toggleListVisibility(l.id) })] }, l.id))), templates.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--fg-muted)', padding: '0.875rem 0 0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Templates" }), templates.map((l) => (_jsxs("div", { className: "settings-row", children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: '0.875rem' }, children: l.name }), _jsx("div", { style: { fontSize: '0.72rem', color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }, children: "template" })] }), _jsx(ToggleButton, { checked: !hiddenListIds.includes(l.id), onChange: () => toggleListVisibility(l.id) })] }, l.id)))] }))] }), _jsxs("section", { className: "settings-section", children: [_jsx("div", { className: "settings-section-title", children: "Danger zone" }), _jsx("div", { className: "danger-zone", style: { marginTop: '0.75rem' }, children: !confirmDelete ? (_jsxs(_Fragment, { children: [_jsx("p", { style: { fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.75rem' }, children: "Permanently deletes all your data from this device and the cloud." }), _jsxs("button", { className: "btn-danger", onClick: () => setConfirmDelete(true), disabled: busy, children: [_jsx(Trash2, { size: 14, strokeWidth: 2 }), "Delete everything and sign out"] })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { style: { fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }, children: "Are you absolutely sure?" }), _jsxs("p", { style: { fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.875rem' }, children: ["This will permanently delete all lists, tasks, and habits from ", _jsx("strong", { children: "this device and the cloud" }), ". There is no undo."] }), deleteError && (_jsx("p", { style: { fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '0.625rem' }, children: deleteError })), _jsxs("div", { style: { display: 'flex', gap: '0.5rem' }, children: [_jsx("button", { className: "btn-danger", onClick: handleDeleteAll, disabled: busy, children: busy ? 'Deleting…' : 'Yes, delete everything' }), _jsx("button", { className: "btn-ghost", style: { padding: '6px 14px' }, onClick: () => { setConfirmDelete(false); setDeleteError(null); }, disabled: busy, children: "Cancel" })] })] })) })] })] }));
}
