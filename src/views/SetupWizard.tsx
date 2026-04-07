import { useState } from 'react';
import { Check, Palette, ListDashes, Sun, List, CalendarCheck, ShoppingCart, Sparkle } from '@phosphor-icons/react';
import { ICON_SIZE } from '../config/icons';
import { useSettings } from '../contexts/SettingsContext';
import { createList } from '../db/lists';
import { ColorSwatchPicker } from '../components/ColorSwatchPicker';

const LIST_OPTIONS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'My Day',    label: 'My Day',    icon: <Sun size={ICON_SIZE} weight="fill" /> },
  { key: 'Tasks',     label: 'Tasks',     icon: <List size={ICON_SIZE} weight="fill" /> },
  { key: 'Habits',    label: 'Habits',    icon: <CalendarCheck size={ICON_SIZE} weight="fill" /> },
  { key: 'Groceries', label: 'Groceries', icon: <ShoppingCart size={ICON_SIZE} weight="fill" /> },
  { key: 'Chores',    label: 'Chores',    icon: <Sparkle size={ICON_SIZE} weight="fill" /> },
];

const STEPS = [
  { icon: <Check size={28} weight="fill" />,      title: 'Welcome to TO DO', body: 'A minimal, offline-first task manager with cloud sync.' },
  { icon: <Palette size={28} weight="fill" />,    title: 'Appearance',      body: 'Choose your accent color and theme.' },
  { icon: <ListDashes size={28} weight="fill" />, title: 'Your lists',      body: 'Choose which lists you want to start with.' },
];

export function SetupWizard() {
  const { accent, setAccent, theme, setTheme, markSetupDone, toggleListVisibility, setPinnedOrder } = useSettings();
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
    if (!lists['My Day']) toggleListVisibility('my-day');
    const createdIds: string[] = [];
    if (lists['Tasks'])     createdIds.push((await createList('Tasks', 'general')).id);
    if (lists['Habits'])    createdIds.push((await createList('Habits', 'daily')).id);
    if (lists['Groceries']) createdIds.push((await createList('Groceries', 'shopping')).id);
    if (lists['Chores'])    createdIds.push((await createList('Chores', 'general')).id);
    setPinnedOrder(['my-day', ...createdIds]);
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

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                <span className="wizard-field-label">Accent</span>
                <ColorSwatchPicker accent={accent} onSelect={setAccent} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="wizard-field-label">Mode</span>
                <div className="theme-btn-group theme-btn-group--vertical">
                  {(['system', 'light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      className={`theme-btn${theme === t ? ' theme-btn--active' : ''}`}
                      onClick={() => setTheme(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
