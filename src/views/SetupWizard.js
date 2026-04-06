import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Check, Palette, LayoutList, Sun, List, CalendarCheck, ShoppingCart, ClipboardList } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { createList } from '../db/lists';
import { ColorSwatchPicker } from '../components/ColorSwatchPicker';
const LIST_OPTIONS = [
    { key: 'My Day', label: 'My Day', icon: _jsx(Sun, { size: 15, strokeWidth: 1.75 }) },
    { key: 'Tasks', label: 'Tasks', icon: _jsx(List, { size: 15, strokeWidth: 1.75 }) },
    { key: 'Habits', label: 'Habits', icon: _jsx(CalendarCheck, { size: 15, strokeWidth: 1.75 }) },
    { key: 'Groceries', label: 'Groceries', icon: _jsx(ShoppingCart, { size: 15, strokeWidth: 1.75 }) },
    { key: 'Chores', label: 'Chores', icon: _jsx(ClipboardList, { size: 15, strokeWidth: 1.75 }) },
];
const STEPS = [
    { icon: _jsx(Check, { size: 20, strokeWidth: 2.5 }), title: 'Welcome to TO DO', body: 'A minimal, offline-first task manager.' },
    { icon: _jsx(Palette, { size: 20, strokeWidth: 2 }), title: 'Pick a color', body: 'You can always change this in settings.' },
    { icon: _jsx(LayoutList, { size: 20, strokeWidth: 1.75 }), title: 'Your lists', body: 'Choose which lists you want to start with.' },
];
export function SetupWizard() {
    const { accent, setAccent, markSetupDone, setShowMyDay, setPinnedOrder } = useSettings();
    const [step, setStep] = useState(0);
    const [lists, setLists] = useState({
        'My Day': true, 'Tasks': true, 'Habits': true, 'Groceries': true, 'Chores': true,
    });
    const [saving, setSaving] = useState(false);
    function toggle(key) {
        setLists((prev) => ({ ...prev, [key]: !prev[key] }));
    }
    async function finish() {
        setSaving(true);
        setShowMyDay(lists['My Day']);
        const createdIds = [];
        if (lists['Tasks'])
            createdIds.push((await createList('Tasks', 'general')).id);
        if (lists['Habits'])
            createdIds.push((await createList('Habits', 'daily')).id);
        if (lists['Groceries'])
            createdIds.push((await createList('Groceries', 'shopping')).id);
        if (lists['Chores'])
            createdIds.push((await createList('Chores', 'general')).id);
        setPinnedOrder(createdIds);
        markSetupDone();
    }
    return (_jsx("div", { className: "wizard-screen", children: _jsxs("div", { className: "wizard-step", children: [_jsxs("div", { className: "wizard-step__content", children: [_jsxs("div", { className: "wizard-step__header", children: [_jsx("div", { className: "wizard-step__icon", children: STEPS[step].icon }), _jsx("h1", { className: "wizard-title", children: STEPS[step].title })] }), _jsx("p", { className: "wizard-body", children: STEPS[step].body }), step === 1 && _jsx(ColorSwatchPicker, { accent: accent, onSelect: setAccent }), step === 2 && (_jsx("div", { className: "wizard-list-options", children: LIST_OPTIONS.map(({ key, label, icon }) => (_jsxs("button", { className: `wizard-list-option${lists[key] ? ' wizard-list-option--on' : ''}`, onClick: () => toggle(key), children: [_jsxs("span", { className: "wizard-list-option__label", children: [icon, label] }), _jsx("span", { className: `toggle-btn${lists[key] ? ' toggle-btn--on' : ''}`, "aria-hidden": "true" })] }, key))) }))] }), _jsxs("div", { className: "wizard-step__controls", children: [_jsx("div", { className: "wizard-actions", children: step === 0 ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn-ghost", onClick: markSetupDone, children: "Skip" }), _jsx("button", { className: "btn-primary", onClick: () => setStep(1), children: "Get started" })] })) : step === 1 ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn-ghost", onClick: () => setStep(0), children: "Back" }), _jsx("button", { className: "btn-primary", onClick: () => setStep(2), children: "Next" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn-ghost", onClick: () => setStep(1), children: "Back" }), _jsx("button", { className: "btn-primary", onClick: finish, disabled: saving, children: "Done" })] })) }), _jsx("div", { className: "wizard-dots", children: STEPS.map((_, i) => (_jsx("span", { className: `wizard-dot${step === i ? ' wizard-dot--active' : ''}` }, i))) })] })] }) }));
}
