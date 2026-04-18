import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Keyboard, List, Sun, Repeat, ShoppingCart, Folder, WifiOff, Cloud, RotateCcw, Plus, Pencil, Copy, Smile, Trash2, Info, Zap, MousePointerClick } from 'lucide-react';
import { ease } from '../utils/easing';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const sectionVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: ease.out } },
};

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
    title: '① Sidebar',
    rows: [
      { keys: ['Tab', '↓'], description: 'Next list' },
      { keys: ['Shift Tab', '↑'], description: 'Previous list' },
      { keys: ['Enter', '→'], description: 'Open list, focus first item' },
    ],
  },
  {
    title: '② Task / Habit list',
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
    title: '③ Detail panel',
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
    icon: RotateCcw,
    heading: 'Chores list',
    body: 'Recurring tasks that cycle instead of complete. Set an interval (e.g. every 3 days) and checking off a task advances its due date rather than removing it.',
  },
  {
    icon: Folder,
    heading: 'Folders',
    body: 'Group lists into collapsible folders in the sidebar to keep things organised.',
  },
];

interface ButtonItem {
  icon: LucideIcon;
  label: string;
  body: string;
}

const sidebarButtons: ButtonItem[] = [
  { icon: Plus, label: '+', body: 'Create a new list or folder.' },
  { icon: Pencil, label: 'Edit', body: 'Enter edit mode. Drag handles appear on each list so you can reorder them. A folder icon lets you drag a list into or out of a folder. A delete button appears on each list.' },
];

const listViewButtons: ButtonItem[] = [
  { icon: Pencil, label: 'Edit', body: 'Enter edit mode. Each task gets a drag handle to reorder, a group icon to drag it into a different group, and a delete button.' },
  { icon: Copy, label: 'Duplicate', body: 'Create a copy of the list and all its tasks.' },
  { icon: Smile, label: 'Icon', body: 'Pick an emoji icon for the list. Shown in the sidebar and the list header.' },
  { icon: Trash2, label: 'Delete', body: 'Permanently delete the list and all its tasks.' },
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

function KeyboardDiagram() {
  const badge: CSSProperties = {
    position: 'absolute',
    top: 4,
    right: 4,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '0.6rem',
    borderRadius: 3,
    padding: '1px 4px',
    fontWeight: 700,
  };
  const row: CSSProperties = {
    background: 'var(--border)',
    height: 7,
    borderRadius: 3,
    marginTop: 3,
  };
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '1.25rem', fontSize: '0.72rem' }}>
      <div style={{ background: 'var(--surface)', padding: '0.3rem 0.6rem', borderBottom: '1px solid var(--border)', color: 'var(--fg-muted)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        TO DO — app layout
      </div>
      <div style={{ display: 'flex', height: 90 }}>
        {/* Sidebar */}
        <div style={{ width: 90, borderRight: '1px solid var(--border)', padding: '0.5rem', flexShrink: 0, position: 'relative' }}>
          <span style={badge}>① Sidebar</span>
          <div style={{ ...row, marginTop: 20 }} />
          <div style={{ ...row, opacity: 0.35, background: 'var(--accent)' }} />
          <div style={{ ...row, opacity: 0.6 }} />
          <div style={{ ...row, opacity: 0.4 }} />
        </div>
        {/* Task list */}
        <div style={{ flex: 1, borderRight: '1px solid var(--border)', padding: '0.5rem', position: 'relative' }}>
          <span style={badge}>② Task list</span>
          <div style={{ ...row, marginTop: 20, width: '80%' }} />
          <div style={{ ...row, opacity: 0.35, background: 'var(--accent)', width: '60%' }} />
          <div style={{ ...row, opacity: 0.6, width: '70%' }} />
          <div style={{ ...row, opacity: 0.4, width: '50%' }} />
        </div>
        {/* Detail panel */}
        <div style={{ width: 110, padding: '0.5rem', flexShrink: 0, position: 'relative' }}>
          <span style={badge}>③ Detail</span>
          <div style={{ ...row, marginTop: 20 }} />
          <div style={{ ...row, opacity: 0.6, width: '70%' }} />
          <div style={{ ...row, opacity: 0.4, width: '50%' }} />
          <div style={{ ...row, opacity: 0.3, width: '60%' }} />
        </div>
      </div>
    </div>
  );
}

function ButtonRow({ icon: BtnIcon, label, body }: ButtonItem) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, marginTop: 1 }}>
        <BtnIcon size={13} style={{ color: 'var(--fg-muted)' }} />
      </span>
      <div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
        <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', lineHeight: 1.5, marginTop: '0.1rem' }}>{body}</p>
      </div>
    </div>
  );
}

export function DocsView() {
  return (
    <motion.div style={{ maxWidth: 480, margin: '0 auto' }} variants={containerVariants} initial="hidden" animate="show">
      <div className="view-title-row" style={{ marginBottom: '2rem' }}>
        <h1 className="view-title">Help</h1>
        <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', opacity: 0.6, alignSelf: 'flex-end', paddingBottom: '0.2rem' }}>v{__APP_VERSION__}</span>
      </div>

      <motion.section className="settings-section" variants={sectionVariants}>
        <div className="settings-section-title">
          <Info size={16} />
          About
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginTop: '0.25rem' }}>
          A minimal, offline-first task manager.
        </p>
      </motion.section>

      <motion.section className="settings-section" variants={sectionVariants}>
        <div className="settings-section-title">
          <Zap size={16} />
          Features
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
          {features.map((item) => <ItemRow key={item.heading} {...item} />)}
        </div>
      </motion.section>

      <motion.section className="settings-section" variants={sectionVariants}>
        <div className="settings-section-title">
          <List size={16} />
          Lists
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
          {listSubSections.map((item) => <ItemRow key={item.heading} {...item} />)}
        </div>
      </motion.section>

      <motion.section className="settings-section" variants={sectionVariants}>
        <div className="settings-section-title">
          <MousePointerClick size={16} />
          Action buttons
        </div>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)', margin: '0.5rem 0 0.375rem' }}>Sidebar</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
          {sidebarButtons.map((b) => <ButtonRow key={b.label} {...b} />)}
        </div>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)', margin: '0.5rem 0 0.375rem' }}>List / Folder view</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {listViewButtons.map((b) => <ButtonRow key={b.label} {...b} />)}
        </div>
      </motion.section>

      <motion.section className="settings-section" variants={sectionVariants}>
        <div className="settings-section-title">
          <Keyboard size={16} />
          Keyboard shortcuts
        </div>
        <p className="view-subtitle" style={{ marginBottom: '1.5rem', marginTop: '0.25rem', textTransform: 'none', letterSpacing: 0 }}>Navigate without touching your mouse.</p>
        <KeyboardDiagram />
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
      </motion.section>

    </motion.div>
  );
}
