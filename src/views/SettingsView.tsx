import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Trash2, CircleUser, Paintbrush, Volume2, Pin, TriangleAlert, GripVertical, HelpCircle, LogOut } from 'lucide-react';
import { ICON_SIZE } from '../config/constants';
import { Reorder, useDragControls } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { playComplete, SOUND_STYLES } from '../utils/sound';
import { useAppStore } from '../store';
import { clearAllLocalData } from '../db/client';
import { deleteAllCloudData } from '../db/sync';
import { logOut, signOut } from '../supabase/auth';
import { supabase } from '../supabase/client';
import { ColorSwatchPicker } from '../components/ColorSwatchPicker';
import { SettingsRow } from '../components/SettingsRow';
import type { List } from '../types';
import { LIST_TYPE_LABELS } from '../types';

const MY_DAY_SENTINEL = { id: 'my-day' as const };
type PinnedItem = List | typeof MY_DAY_SENTINEL;

// ── SortableSettingsRow ───────────────────────────────────────────────────────

function SortableSettingsRow({ list, checked, onChange }: { list: List; checked: boolean; onChange: () => void }) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item as="div" value={list} dragListener={false} dragControls={dragControls} className="settings-row-sortable">
      <div className="settings-drag-handle" onPointerDown={(e) => dragControls.start(e)}>
        <GripVertical size={ICON_SIZE} />
      </div>
      <SettingsRow label={list.name} sublabel={LIST_TYPE_LABELS[list.type]} checked={checked} onChange={onChange} />
    </Reorder.Item>
  );
}

function SortableMyDaySettingsRow({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item as="div" value={MY_DAY_SENTINEL} dragListener={false} dragControls={dragControls} className="settings-row-sortable">
      <div className="settings-drag-handle" onPointerDown={(e) => dragControls.start(e)}>
        <GripVertical size={ICON_SIZE} />
      </div>
      <SettingsRow label="My Day" sublabel="built-in" checked={checked} onChange={onChange} />
    </Reorder.Item>
  );
}

// ── SettingsView ──────────────────────────────────────────────────────────────

export function SettingsView() {
  const {
    accent, setAccent,
    theme, setTheme,
    hiddenListIds, toggleListVisibility,
    pinnedOrder, setPinnedOrder,
    soundEnabled, setSoundEnabled,
    soundStyle, setSoundStyle,
    hapticEnabled, setHapticEnabled,
    syncEnabled, setSyncEnabled,
    localOnly, setLocalOnly,
  } = useSettings();

  const lists = useAppStore((s) => s.lists);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleDeleteAll() {
    setBusy(true);
    setDeleteError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await deleteAllCloudData(supabase, user.id);
      await clearAllLocalData();
      localStorage.clear();
      if (user) await signOut();
      else window.location.reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const pinnedItems: PinnedItem[] = pinnedOrder
    .map((id): PinnedItem | undefined =>
      id === 'my-day' ? MY_DAY_SENTINEL : lists.find((l) => l.id === id)
    )
    .filter((item): item is PinnedItem => item !== undefined);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="view-title-row" style={{ marginBottom: '2rem' }}>
        <h1 className="view-title">Settings</h1>
      </div>

      {/* Help */}
      <section className="settings-section">
        <div className="settings-section-title">
          <HelpCircle size={16} />
          Help
        </div>
        <NavLink to="/docs" className="settings-link-row">
          Documentation & tips
        </NavLink>
      </section>

      {/* Account */}
      <section className="settings-section">
        <div className="settings-section-title">
          <CircleUser size={16} />
          Account
        </div>
        {localOnly
          ? <p className="settings-email">Local account — data stored on this device only</p>
          : email && <p className="settings-email">{email}</p>}
        {!localOnly && (
          <SettingsRow
            label="Cloud sync"
            sublabel="back up and access your data on multiple devices"
            checked={syncEnabled}
            onChange={() => setSyncEnabled(!syncEnabled)}
          />
        )}
        {!localOnly && (
          <button
            className="settings-signout-btn"
            onClick={() => logOut(localOnly, setLocalOnly).catch(console.error)}
          >
            <LogOut size={14} />
            Sign out
          </button>
        )}
      </section>

      {/* Pinned items */}
      {pinnedItems.length > 0 && (
        <section className="settings-section">
          <div className="settings-section-title">
            <Pin size={16} />
            Pinned
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', margin: '0.5rem 0 0.875rem' }}>
            Drag to reorder. Toggle to show or hide in the sidebar.
          </p>
          <Reorder.Group
            as="div"
            axis="y"
            values={pinnedItems}
            onReorder={(newOrder) => setPinnedOrder(newOrder.map((item) => item.id))}
          >
            {pinnedItems.map((item) =>
              item.id === 'my-day'
                ? <SortableMyDaySettingsRow
                    key="my-day"
                    checked={!hiddenListIds.includes('my-day')}
                    onChange={() => toggleListVisibility('my-day')}
                  />
                : <SortableSettingsRow
                    key={item.id}
                    list={item as List}
                    checked={!hiddenListIds.includes(item.id)}
                    onChange={() => toggleListVisibility(item.id)}
                  />
            )}
          </Reorder.Group>
        </section>
      )}

      {/* Appearance */}
      <section className="settings-section">
        <div className="settings-section-title">
          <Paintbrush size={16} />
          Appearance
        </div>
        <div className="settings-appearance-fields">
          <div className="settings-appearance-field">
            <span className="settings-field-label">Accent color</span>
            <ColorSwatchPicker accent={accent} onSelect={setAccent} />
          </div>
          <div className="settings-appearance-field">
            <span className="settings-field-label">Theme</span>
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
      </section>

      {/* Sound */}
      <section className="settings-section">
        <div className="settings-section-title">
          <Volume2 size={16} />
          Sound
        </div>
        <SettingsRow
          label="Completion sound"
          sublabel="plays when a task is checked off"
          checked={soundEnabled}
          onChange={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            if (next) playComplete(soundStyle);
          }}
        />
        <SettingsRow
          label="Haptic feedback"
          sublabel="vibrate on completion"
          checked={hapticEnabled}
          onChange={() => setHapticEnabled(!hapticEnabled)}
        />
        {soundEnabled && (
          <div className="theme-btn-group theme-btn-group--vertical" style={{ marginTop: '0.625rem' }}>
            {SOUND_STYLES.map(({ key, label }) => (
              <button
                key={key}
                className={`theme-btn${soundStyle === key ? ' theme-btn--active' : ''}`}
                onClick={() => { setSoundStyle(key); playComplete(key); }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="settings-section">
        <div className="settings-section-title settings-section-title--danger">
          <TriangleAlert size={16} />
          Danger zone
        </div>
        <div className="danger-zone" style={{ marginTop: '0.75rem' }}>
          {!confirmDelete ? (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.75rem' }}>
                {localOnly
                  ? 'Permanently deletes all your data from this device.'
                  : 'Permanently deletes all your data from this device and the cloud.'}
              </p>
              <button className="btn-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 size={ICON_SIZE} />
                {localOnly ? 'Delete everything' : 'Delete everything and sign out'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                Are you absolutely sure?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.875rem' }}>
                {localOnly
                  ? 'This will permanently delete all lists, tasks, and habits from this device. There is no undo.'
                  : <>This will permanently delete all lists, tasks, and habits from <strong>this device and the cloud</strong>. There is no undo.</>}
              </p>
              {deleteError && (
                <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '0.625rem' }}>{deleteError}</p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-danger" onClick={handleDeleteAll} disabled={busy}>
                  {busy ? 'Deleting…' : 'Yes, delete everything'}
                </button>
                <button className="btn-ghost" style={{ padding: '6px 14px' }} onClick={() => { setConfirmDelete(false); setDeleteError(null); }} disabled={busy}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </section>

    </div>
  );
}
