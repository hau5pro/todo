import type { LucideIcon } from 'lucide-react';
import { Keyboard, List, Sun, Repeat, ShoppingCart, Folder, WifiOff, Cloud } from 'lucide-react';

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

interface FeatureItem {
  icon: LucideIcon;
  heading: string;
  body: string;
}

const features: FeatureItem[] = [
  { icon: WifiOff, heading: 'Offline first', body: 'Your data lives on this device. The app works without a connection.' },
  { icon: Cloud, heading: 'Cloud sync', body: 'Sign in to back up your data and sync across devices. Enable or disable any time in Settings.' },
];

interface ListSubSection {
  icon: LucideIcon;
  heading: string;
  body: string;
}

const listSubSections: ListSubSection[] = [
  {
    icon: Sun,
    heading: 'My Day',
    body: 'A pinned view that pulls in overdue tasks, anything due today, and habits from your daily lists.',
  },
  {
    icon: List,
    heading: 'General lists',
    body: 'Standard task lists for one-off to-dos. Tasks stay until you delete them.',
  },
  {
    icon: Repeat,
    heading: 'Daily lists',
    body: 'Habit lists that reset each day. Tasks appear in My Day automatically — complete them to grow your streak.',
  },
  {
    icon: ShoppingCart,
    heading: 'Shopping lists',
    body: 'A persistent running list, never fully cleared. Good for groceries and anything you restock regularly.',
  },
  {
    icon: Folder,
    heading: 'Folders',
    body: 'Group lists into collapsible folders in the sidebar to keep things organised.',
  },
];

function ItemRow({ icon: ItemIcon, heading, body }: { icon: LucideIcon; heading: string; body: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
        <ItemIcon size={13} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{heading}</span>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', lineHeight: 1.5, paddingLeft: 'calc(13px + 0.4rem)' }}>{body}</p>
    </div>
  );
}

export function DocsView() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="view-title-row" style={{ marginBottom: '2rem' }}>
        <h1 className="view-title">Help</h1>
        <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', opacity: 0.6, alignSelf: 'flex-end', paddingBottom: '0.2rem' }}>v{__APP_VERSION__}</span>
      </div>

      <section className="settings-section">
        <div className="settings-section-title">About</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginTop: '0.25rem' }}>
          A minimal, offline-first task manager.
        </p>
      </section>

      <section className="settings-section">
        <div className="settings-section-title">Features</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
          {features.map((item) => <ItemRow key={item.heading} {...item} />)}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-title">
          <List size={16} />
          Lists
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
          {listSubSections.map((item) => <ItemRow key={item.heading} {...item} />)}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-title">
          <Keyboard size={16} />
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
