# Help Keyboard Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an annotated three-panel app-layout diagram to the top of the keyboard shortcuts section in the Help page so users know which UI region each shortcut group applies to.

**Architecture:** Single file change in `DocsView.tsx` — add an inline `KeyboardDiagram` component and update the three shortcut subheading strings to include numbered prefixes (①②③) that match the diagram callouts. No new files, no new dependencies, no assets.

**Tech Stack:** React 18, TypeScript, CSS variables (existing design tokens)

---

### Task 1: Add the `KeyboardDiagram` component and update subheadings

**Files:**
- Modify: `src/views/DocsView.tsx`

- [ ] **Step 1: Add the `KeyboardDiagram` component**

  In `src/views/DocsView.tsx`, add the following component above the `DocsView` export:

  ```tsx
  function KeyboardDiagram() {
    const badge: React.CSSProperties = {
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
    const row: React.CSSProperties = {
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
  ```

- [ ] **Step 2: Render `KeyboardDiagram` above the shortcut groups**

  In the keyboard shortcuts section of `DocsView`, find this block (around line 196):

  ```tsx
  <p className="view-subtitle" style={{ marginBottom: '1.5rem', marginTop: '0.25rem', textTransform: 'none', letterSpacing: 0 }}>Navigate without touching your mouse.</p>
  {sections.map((section) => (
  ```

  Add `<KeyboardDiagram />` between the two:

  ```tsx
  <p className="view-subtitle" style={{ marginBottom: '1.5rem', marginTop: '0.25rem', textTransform: 'none', letterSpacing: 0 }}>Navigate without touching your mouse.</p>
  <KeyboardDiagram />
  {sections.map((section) => (
  ```

- [ ] **Step 3: Update the `sections` subheading strings to include numbered prefixes**

  Find the `sections` array (around line 14) and update the three `title` values:

  ```tsx
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
  ```

- [ ] **Step 4: Type-check and build**

  ```bash
  npm run build
  ```

  Expected: exits 0 with no TypeScript errors.

- [ ] **Step 5: Smoke-test visually**

  Run `npm run dev`, open the app, navigate to Help. Verify:
  - The annotated diagram appears above the shortcut groups
  - Numbered badges (①②③) are visible in accent colour
  - Subheadings read "① Sidebar", "② Task / Habit list", "③ Detail panel"
  - Diagram looks correct in both light and dark mode (toggle in Settings)

- [ ] **Step 6: Commit**

  ```bash
  git add src/views/DocsView.tsx
  git commit -m "feat: add annotated layout diagram to help keyboard section"
  ```
