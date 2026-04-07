import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from '../supabase/auth';
import { Check, Palette, ListDashes, Sun, List, CalendarCheck, ShoppingCart, Sparkle, CloudArrowUp, Info } from '@phosphor-icons/react';
import { ICON_SIZE } from '../config/constants';
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

const STEPS_FULL = [
  { icon: <Check size={28} weight="fill" />,        title: 'Welcome to TO DO', body: '' },
  { icon: <Palette size={28} weight="fill" />,      title: 'Appearance',       body: 'Choose your accent color and theme.' },
  { icon: <ListDashes size={28} weight="fill" />,   title: 'Your lists',       body: 'Choose which lists you want to start with.' },
  { icon: <CloudArrowUp size={28} weight="fill" />, title: 'Cloud sync',       body: 'Sync your data to the cloud to back it up and access it on multiple devices. You can change this later in Settings.' },
];

const STEPS_LOCAL = [
  { icon: <Check size={28} weight="fill" />,      title: 'Welcome to TO DO', body: 'Your data will only live on this device. Cloud sync is not available in local-only mode — to use it you would need to create an account.' },
  { icon: <Palette size={28} weight="fill" />,    title: 'Appearance',       body: 'Choose your accent color and theme.' },
  { icon: <ListDashes size={28} weight="fill" />, title: 'Your lists',       body: 'Choose which lists you want to start with.' },
];

const stepVariants = {
  enter: (d: number) => ({ opacity: 0, x: d * 24 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: (d: number) => ({ opacity: 0, x: d * -24, transition: { duration: 0.18, ease: 'easeIn' } }),
};

export function SetupWizard() {
  const { accent, setAccent, theme, setTheme, markSetupDone, toggleListVisibility, setPinnedOrder, setSyncEnabled, localOnly, setLocalOnly } = useSettings();
  const navigate = useNavigate();
  const dir = useRef(1);

  async function goBack() {
    if (localOnly) setLocalOnly(false);
    else await signOut().catch(() => {});
    navigate('/login');
  }
  const STEPS = localOnly ? STEPS_LOCAL : STEPS_FULL;
  const [step, setStep] = useState(0);
  const [lists, setLists] = useState<Record<string, boolean>>({
    'My Day': true, 'Tasks': true, 'Habits': true, 'Groceries': true, 'Chores': true,
  });
  const [syncChoice, setSyncChoice] = useState(true);
  const [saving, setSaving] = useState(false);

  function advance(next: number) {
    dir.current = next > step ? 1 : -1;
    setStep(next);
  }

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
    if (!localOnly) setSyncEnabled(syncChoice);
    markSetupDone();
  }

  return (
    <div className="wizard-screen">
      <div className="wizard-step">
        <div className="wizard-step__content">
          <AnimatePresence mode="wait" custom={dir.current}>
            <motion.div
              key={step}
              custom={dir.current}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
            >
              <div className="wizard-step__header">
                <div className="wizard-step__icon">{STEPS[step].icon}</div>
                <h1 className="wizard-title">{STEPS[step].title}</h1>
              </div>

              {localOnly && step === 0 ? (
                <div className="wizard-callout">
                  <Info size={18} weight="fill" className="wizard-callout__icon" />
                  <span>{STEPS[step].body}</span>
                </div>
              ) : STEPS[step].body ? (
                <p className="wizard-body">{STEPS[step].body}</p>
              ) : null}

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

              {step === 3 && (
                <div className="wizard-list-options">
                  <button
                    className={`wizard-list-option${syncChoice ? ' wizard-list-option--on' : ''}`}
                    onClick={() => setSyncChoice((v) => !v)}
                  >
                    <span className="wizard-list-option__label">
                      <CloudArrowUp size={ICON_SIZE} weight="fill" />
                      Enable cloud sync
                    </span>
                    <span className={`toggle-btn${syncChoice ? ' toggle-btn--on' : ''}`} aria-hidden="true" />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="wizard-step__controls">
          {step === 0 && (
            <button className="btn-ghost wizard-skip" onClick={markSetupDone}>Skip setup</button>
          )}
          <div className="wizard-actions">
            {step === 0 ? (
              <>
                <button className="btn-ghost" onClick={goBack}>Back</button>
                <button className="btn-primary" onClick={() => advance(1)}>Get started</button>
              </>
            ) : step < STEPS.length - 1 ? (
              <>
                <button className="btn-ghost" onClick={() => advance(step - 1)}>Back</button>
                <button className="btn-primary" onClick={() => advance(step + 1)}>Next</button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => advance(step - 1)}>Back</button>
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
