import { useState, useEffect } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { getLists } from '../db/lists';
import { clearAllLocalData } from '../db/client';
import { deleteAllCloudData } from '../db/sync';
import { signOut } from '../supabase/auth';
import { supabase } from '../supabase/client';
import type { List } from '../types';
import { ColorSwatchPicker } from '../components/ColorSwatchPicker';
import { SettingsRow } from '../components/SettingsRow';

// ── SortableSettingsRow ───────────────────────────────────────────────────────

function SortableSettingsRow({ list, checked, onChange }: {
  list: List;
  checked: boolean;
  onChange: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item as="div" value={list} dragListener={false} dragControls={dragControls} className="settings-row-sortable">
      <div className="settings-drag-handle" onPointerDown={(e) => dragControls.start(e)}>
        <GripVertical size={13} strokeWidth={1.75} />
      </div>
      <SettingsRow label={list.name} sublabel={list.type} checked={checked} onChange={onChange} />
    </Reorder.Item>
  );
}

// ── SettingsView ──────────────────────────────────────────────────────────────

export function SettingsView() {
  const {
    accent, setAccent,
    hiddenListIds, toggleListVisibility,
    showMyDay, setShowMyDay,
    pinnedOrder, customOrder,
    setPinnedOrder, setCustomOrder,
  } = useSettings();
  const [lists, setLists] = useState<List[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    getLists().then(setLists).catch((err) => console.error('Failed to load lists', err));
  }, []);

  async function handleDeleteAll() {
    setBusy(true);
    setDeleteError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await deleteAllCloudData(supabase, user.id);
      await clearAllLocalData();
      localStorage.clear();
      await signOut();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const pinnedSet = new Set(pinnedOrder);
  const pinnedLists = pinnedOrder
    .map((id) => lists.find((l) => l.id === id))
    .filter((l): l is List => l !== undefined);

  const nonPinnedLists = lists.filter((l) => l.type !== 'template' && !pinnedSet.has(l.id));
  const customOrderedIds = customOrder.filter((id) => nonPinnedLists.some((l) => l.id === id));
  const remainder = nonPinnedLists.filter((l) => !customOrder.includes(l.id));
  const customLists: List[] = [
    ...customOrderedIds.map((id) => nonPinnedLists.find((l) => l.id === id)!),
    ...remainder,
  ];

  const templates = lists.filter((l) => l.type === 'template');

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 className="view-title" style={{ marginBottom: '2rem' }}>Settings</h1>

      {/* Appearance */}
      <section className="settings-section">
        <div className="settings-section-title">Appearance</div>
        <div style={{ marginTop: '0.75rem' }}>
          <ColorSwatchPicker accent={accent} onSelect={setAccent} />
        </div>
      </section>

      {/* Navigation */}
      <section className="settings-section">
        <div className="settings-section-title">Navigation</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', margin: '0.5rem 0 0.875rem' }}>
          Choose which lists appear in the sidebar.
        </p>

        <SettingsRow label="My Day" sublabel="built-in" checked={showMyDay} onChange={() => setShowMyDay(!showMyDay)} />

        {pinnedLists.length === 0 && customLists.length === 0 && templates.length === 0 && (
          <p className="empty-state" style={{ marginTop: '0.5rem' }}>No lists yet.</p>
        )}

        {pinnedLists.length > 0 && (
          <Reorder.Group
            as="div"
            axis="y"
            values={pinnedLists}
            onReorder={(newOrder) => setPinnedOrder(newOrder.map((l) => l.id))}
          >
            {pinnedLists.map((l) => (
              <SortableSettingsRow
                key={l.id}
                list={l}
                checked={!hiddenListIds.includes(l.id)}
                onChange={() => toggleListVisibility(l.id)}
              />
            ))}
          </Reorder.Group>
        )}

        {customLists.length > 0 && (
          <>
            {pinnedLists.length > 0 && (
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--fg-muted)', padding: '0.875rem 0 0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Custom</div>
            )}
            <Reorder.Group
              as="div"
              axis="y"
              values={customLists}
              onReorder={(newOrder) => setCustomOrder(newOrder.map((l) => l.id))}
            >
              {customLists.map((l) => (
                <SortableSettingsRow
                  key={l.id}
                  list={l}
                  checked={!hiddenListIds.includes(l.id)}
                  onChange={() => toggleListVisibility(l.id)}
                />
              ))}
            </Reorder.Group>
          </>
        )}

        {templates.length > 0 && (
          <>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--fg-muted)', padding: '0.875rem 0 0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Templates</div>
            {templates.map((l) => (
              <SettingsRow
                key={l.id}
                label={l.name}
                sublabel="template"
                checked={!hiddenListIds.includes(l.id)}
                onChange={() => toggleListVisibility(l.id)}
              />
            ))}
          </>
        )}
      </section>

      {/* Danger zone */}
      <section className="settings-section">
        <div className="settings-section-title">Danger zone</div>
        <div className="danger-zone" style={{ marginTop: '0.75rem' }}>
          {!confirmDelete ? (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.75rem' }}>
                Permanently deletes all your data from this device and the cloud.
              </p>
              <button className="btn-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 size={14} strokeWidth={2} />
                Delete everything and sign out
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                Are you absolutely sure?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.875rem' }}>
                This will permanently delete all lists, tasks, and habits from <strong>this device and the cloud</strong>. There is no undo.
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
