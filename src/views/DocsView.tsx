import { NavLink } from 'react-router-dom';
import { ArrowLeft, Question, Keyboard } from '@phosphor-icons/react';

interface ShortcutRow {
  keys: string[];
  description: string;
}

interface Section {
  title: string;
  rows: ShortcutRow[];
}

const sections: Section[] = [
  {
    title: 'Sidebar',
    rows: [
      { keys: ['Tab', '↓'], description: 'Next list' },
      { keys: ['Shift Tab', '↑'], description: 'Previous list' },
      { keys: ['Enter', '→'], description: 'Open list, focus first item' },
    ],
  },
  {
    title: 'Task / Habit list',
    rows: [
      { keys: ['Tab', '↓'], description: 'Next item' },
      { keys: ['Shift Tab', '↑'], description: 'Previous item' },
      { keys: ['Space'], description: 'Toggle complete' },
      { keys: ['Enter'], description: 'Open detail' },
      { keys: ['←'], description: 'Back to sidebar' },
      { keys: ['Esc'], description: 'Back to sidebar' },
    ],
  },
  {
    title: 'Detail panel',
    rows: [
      { keys: ['Tab'], description: 'Next field' },
      { keys: ['Shift Tab'], description: 'Previous field' },
      { keys: ['Esc'], description: 'Close, return to task' },
    ],
  },
];

const gettingStarted = [
  { heading: 'Offline first', body: 'Your data lives on this device. The app works without a connection — cloud sync is optional.' },
  { heading: 'Lists', body: 'Create lists to organise your tasks. General lists are for one-off tasks, daily lists are for habits, and shopping lists group items by purchase.' },
  { heading: 'My Day', body: 'A built-in view that pulls together overdue tasks and anything due today. Habits from daily lists appear here automatically each day.' },
  { heading: 'Habits', body: 'Add tasks to a daily list. Each day they reset and show up in My Day — tap to complete, and your streak grows.' },
  { heading: 'Cloud sync', body: 'Sign in to back up your data and access it across devices. You can enable or disable sync any time in Settings.' },
];

export function DocsView() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="view-title-row" style={{ marginBottom: '2rem' }}>
        <NavLink to="/settings" className="docs-back-btn" title="Back to settings">
          <ArrowLeft size={22} weight="bold" />
        </NavLink>
        <span className="view-title-icon"><Question size={20} weight="fill" /></span>
        <h1 className="view-title">Help</h1>
      </div>

      <section className="settings-section">
        <div className="settings-section-title">Getting started</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
          {gettingStarted.map(({ heading, body }) => (
            <div key={heading}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>{heading}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-title">
          <Keyboard size={16} weight="fill" />
          Keyboard shortcuts
        </div>
        <p className="view-subtitle" style={{ marginBottom: '1.5rem', marginTop: '0.25rem', textTransform: 'none', letterSpacing: 0 }}>Navigate without touching your mouse.</p>
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)', marginBottom: '0.5rem' }}>{section.title}</p>
            <div className="docs-shortcut-list">
              {section.rows.map((row, i) => (
                <div key={i} className="docs-shortcut-row">
                  <span className="docs-shortcut-keys">
                    {row.keys.map((k, i) => (
                      <span key={k}>
                        <kbd className="docs-kbd">{k}</kbd>
                        {i < row.keys.length - 1 && <span className="docs-kbd-sep">/</span>}
                      </span>
                    ))}
                  </span>
                  <span className="docs-shortcut-desc">{row.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
