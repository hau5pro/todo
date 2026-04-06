import { useState } from 'react';
import { Check, Palette, LayoutList, Sun, List, CalendarCheck, ShoppingCart, ClipboardList } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { createList } from '../db/lists';
import { ColorSwatchPicker } from '../components/ColorSwatchPicker';

const LIST_OPTIONS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'My Day',    label: 'My Day',    icon: <Sun size={15} strokeWidth={1.75} /> },
  { key: 'Tasks',     label: 'Tasks',     icon: <List size={15} strokeWidth={1.75} /> },
  { key: 'Habits',    label: 'Habits',    icon: <CalendarCheck size={15} strokeWidth={1.75} /> },
  { key: 'Groceries', label: 'Groceries', icon: <ShoppingCart size={15} strokeWidth={1.75} /> },
  { key: 'Chores',    label: 'Chores',    icon: <ClipboardList size={15} strokeWidth={1.75} /> },
];

const STEPS = [
  { icon: <Check size={20} strokeWidth={2.5} />,       title: 'Welcome to TO DO', body: 'A minimal, offline-first task manager.' },
  { icon: <Palette size={20} strokeWidth={2} />,        title: 'Pick a color',    body: 'You can always change this in settings.' },
  { icon: <LayoutList size={20} strokeWidth={1.75} />,  title: 'Your lists',      body: 'Choose which lists you want to start with.' },
];

export function SetupWizard() {
  const { accent, setAccent, markSetupDone, setShowMyDay, setPinnedOrder } = useSettings();
  const [step, setStep] = useState(0);
  const [lists, setLists] = useState<Record<string, boolean>>({
    'My Day': true, 'Tasks': true, 'Habits': true, 'Groceries': true, 'Chores': true,
  });
  const [saving, setSaving] = useState(false);

  function toggle(key: string) {
    setLists((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function finish() {
    setSaving(true);
    setShowMyDay(lists['My Day']);
    const createdIds: string[] = [];
    if (lists['Tasks'])     createdIds.push((await createList('Tasks', 'general')).id);
    if (lists['Habits'])    createdIds.push((await createList('Habits', 'daily')).id);
    if (lists['Groceries']) createdIds.push((await createList('Groceries', 'shopping')).id);
    if (lists['Chores'])    createdIds.push((await createList('Chores', 'general')).id);
    setPinnedOrder(createdIds);
    markSetupDone();
  }

  return (
    <div className="wizard-screen">
      <div className="wizard-step">
        <div className="wizard-step__content">
          <div className="wizard-step__header">
            <div className="wizard-step__icon">{STEPS[step].icon}</div>
            <h1 className="wizard-title">{STEPS[step].title}</h1>
          </div>

          <p className="wizard-body">{STEPS[step].body}</p>

          {step === 1 && <ColorSwatchPicker accent={accent} onSelect={setAccent} />}

          {step === 2 && (
            <div className="wizard-list-options">
              {LIST_OPTIONS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  className={`wizard-list-option${lists[key] ? ' wizard-list-option--on' : ''}`}
                  onClick={() => toggle(key)}
                >
                  <span className="wizard-list-option__label">{icon}{label}</span>
                  <span className={`toggle-btn${lists[key] ? ' toggle-btn--on' : ''}`} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="wizard-step__controls">
          <div className="wizard-actions">
            {step === 0 ? (
              <>
                <button className="btn-ghost" onClick={markSetupDone}>Skip</button>
                <button className="btn-primary" onClick={() => setStep(1)}>Get started</button>
              </>
            ) : step === 1 ? (
              <>
                <button className="btn-ghost" onClick={() => setStep(0)}>Back</button>
                <button className="btn-primary" onClick={() => setStep(2)}>Next</button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button className="btn-primary" onClick={finish} disabled={saving}>Done</button>
              </>
            )}
          </div>

          <div className="wizard-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={`wizard-dot${step === i ? ' wizard-dot--active' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
