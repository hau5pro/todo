import { NavLink } from 'react-router-dom';
import { ArrowLeft, Keyboard } from '@phosphor-icons/react';

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

export function DocsView() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="view-title-row" style={{ marginBottom: '0.25rem' }}>
        <NavLink to="/settings" className="docs-back-btn" title="Back to settings">
          <ArrowLeft size={22} weight="bold" />
        </NavLink>
        <span className="view-title-icon"><Keyboard size={20} weight="fill" /></span>
        <h1 className="view-title">Keyboard shortcuts</h1>
      </div>
      <p className="view-subtitle" style={{ marginBottom: '2.5rem', marginTop: '0.5rem', textTransform: 'none', letterSpacing: 0 }}>Navigate without touching your mouse.</p>

      {sections.map((section) => (
        <section key={section.title} className="settings-section">
          <div className="settings-section-title">{section.title}</div>
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
        </section>
      ))}
    </div>
  );
}
