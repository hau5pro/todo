import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, CheckCircle, FolderInput } from 'lucide-react';
import { DragHandle, DeleteButton } from '../components/EditControls';
import { useHabits } from '../hooks/useHabits';
import { useLineDrag } from '../hooks/useLineDrag';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useSettings } from '../contexts/SettingsContext';
import { HabitItem } from '../components/HabitItem';
import { HabitGroupSection } from '../components/HabitGroupSection';
import { toggleHabitCompletion } from '../db/habits';
import { requestSync } from '../sync/orchestrator';
import { burstFullScreen } from '../utils/confetti';
import { LIST_TYPE_LABELS } from '../types';
import { getListIcon } from '../config/listIcons';
import { ICON_SIZE } from '../config/constants';
import type { HabitRow } from '../hooks/useHabits';
import { applyOrder } from '../utils/order';

function HabitRow({ row, editMode, onToggle, onSelect, onDelete, isSelected, onReorderStart, onGroupDragStart, dragging }: {
  row: HabitRow; editMode: boolean;
  onToggle: (id: string) => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
  onReorderStart?: (e: React.PointerEvent) => void;
  onGroupDragStart?: (e: React.PointerEvent) => void;
  dragging?: boolean;
}) {
  return (
    <div
      data-reorder-id={row.task.id}
      className={`task-row${editMode ? ' task-row--editing' : ''}`}
      style={{ cursor: 'default', opacity: dragging ? 0.4 : 1 }}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} onPointerDown={onReorderStart} />
        {editMode && <span className="nav-item-drag-zone-divider" />}
        {editMode && (
          <span
            className="task-edit-drag"
            title="Drag to move to group"
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onGroupDragStart?.(e);
            }}
          >
            <FolderInput size={ICON_SIZE} />
          </span>
        )}
        {editMode && <span className="nav-item-drag-zone-divider" />}
        <DeleteButton show={editMode} onClick={onDelete} title="Delete habit" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <HabitItem
          id={row.task.id}
          title={row.task.title}
          note={row.task.note}
          completedToday={row.completedToday}
          streak={row.streak}
          onToggle={onToggle}
          onSelect={editMode ? undefined : onSelect}
          isSelected={!editMode && isSelected}
        />
      </div>
    </div>
  );
}

export function DailyView() {
  const { listId } = useParams<{ listId: string }>();
  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const { addTask, removeTask, moveTaskToGroup, renameGroup, deleteGroup, loadTasks } = useAppStore();
  const { rows, isLoading, reload, today } = useHabits(listId!);
  const [newTitle, setNewTitle] = useState('');
  const [habitEditMode, setHabitEditMode] = useState(false);
  const [draggingHabitId, setDraggingHabitId] = useState<string | null>(null);

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
  const { listOrders, setListOrder, listGroupOrders, setListGroupOrder, confettiEnabled } = useSettings();
  const prevDetail = useRef(detail);
  useEffect(() => {
    if (prevDetail.current !== null && detail === null) reload();
    prevDetail.current = detail;
  }, [detail]);

  useEffect(() => {
    setHabitEditMode(false);
  }, [listId]);

  useEffect(() => {
    loadTasks(listId!);
  }, [listId]);

  const scrollRef = useRef<HTMLElement>(null);
  const groupGhostRef = useRef<HTMLDivElement>(null);
  const groupDragTargetRef = useRef<string | null>(null);

  const { dragId, startDrag, ghostRef, lineRef } = useLineDrag({
    scrollRef,
    onCommit: (_id, context, newIds) => {
      if (context === 'task-ungrouped') {
        setListOrder(listId!, newIds);
      } else if (context === 'groups') {
        setListGroupOrder(listId!, newIds);
      } else {
        // reorder within a named group — splice those ids back into global order
        const globalOrder = listOrders[listId!] ?? [];
        const groupSet = new Set(newIds);
        const result = [...globalOrder];
        const positions: number[] = [];
        for (let i = 0; i < result.length; i++) {
          if (groupSet.has(result[i])) positions.push(i);
        }
        newIds.filter((id) => globalOrder.includes(id)).forEach((id, i) => {
          result[positions[i]] = id;
        });
        const missing = newIds.filter((id) => !globalOrder.includes(id));
        setListOrder(listId!, [...result, ...missing]);
      }
    },
  });

  // Cross-group drag: pointer tracking
  useEffect(() => {
    if (!draggingHabitId) return;
    const habitId = draggingHabitId;

    function highlight(id: string | null) {
      if (!id) return;
      const cls = id === '__ungrouped__' ? 'ungrouped-drop-zone--active' : 'group-section--drag-over';
      document.querySelector(`[data-group-id="${id}"]`)?.classList.add(cls);
    }
    function unhighlight(id: string | null) {
      if (!id) return;
      const cls = id === '__ungrouped__' ? 'ungrouped-drop-zone--active' : 'group-section--drag-over';
      document.querySelector(`[data-group-id="${id}"]`)?.classList.remove(cls);
    }

    function onMove(e: PointerEvent) {
      if (groupGhostRef.current) {
        groupGhostRef.current.style.display = 'flex';
        groupGhostRef.current.style.left = `${e.clientX + 12}px`;
        groupGhostRef.current.style.top = `${e.clientY + 12}px`;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const groupEl = el?.closest('[data-group-id]');
      const newTarget = groupEl?.getAttribute('data-group-id') ?? null;
      if (newTarget !== groupDragTargetRef.current) {
        unhighlight(groupDragTargetRef.current);
        highlight(newTarget);
        groupDragTargetRef.current = newTarget;
      }
    }

    function cleanup() {
      unhighlight(groupDragTargetRef.current);
      groupDragTargetRef.current = null;
      if (groupGhostRef.current) groupGhostRef.current.style.display = 'none';
    }

    async function onUp() {
      const target = groupDragTargetRef.current;
      cleanup();
      if (target === '__ungrouped__') await moveTaskToGroup(habitId, listId!, null);
      else if (target) await moveTaskToGroup(habitId, listId!, target);
      setDraggingHabitId(null);
      reload();
    }

    function onCancel() { cleanup(); setDraggingHabitId(null); }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cleanup();
    };
  }, [draggingHabitId]);

  // Auto-sync group order: add any new groups that appear in rows
  useEffect(() => {
    const activeGroups = [...new Set(
      rows.filter((r) => r.task.group && !r.task.deleted_at).map((r) => r.task.group!)
    )];
    const saved = listGroupOrders[listId!] ?? [];
    const newOnes = activeGroups.filter((g) => !saved.includes(g));
    if (newOnes.length > 0) setListGroupOrder(listId!, [...saved, ...newOnes]);
  }, [rows, listId]);

  const handleToggle = useCallback(async (taskId: string) => {
    const wasCompletion = !rows.find((r) => r.task.id === taskId)?.completedToday;
    await toggleHabitCompletion(taskId, today);
    const freshRows = await reload();
    requestSync();

    if (!confettiEnabled || !wasCompletion) return;

    if (freshRows.length > 0 && freshRows.every((r) => r.completedToday)) {
      burstFullScreen();
    }
  }, [today, reload, confettiEnabled, rows]);

  if (isLoading) return null;

  const globalOrder = listOrders[listId!] ?? [];
  const orderedRows = applyOrder(rows, globalOrder, (r) => r.task.id);

  const ungroupedRows = orderedRows.filter((r) => !r.task.group);
  const groupMap = new Map<string, HabitRow[]>();
  for (const row of orderedRows) {
    if (row.task.group) {
      if (!groupMap.has(row.task.group)) groupMap.set(row.task.group, []);
      groupMap.get(row.task.group)!.push(row); // safe: set above if absent
    }
  }

  const savedGroupOrder = listGroupOrders[listId!] ?? [];
  const allGroupNames = [
    ...savedGroupOrder.filter((g) => groupMap.has(g)),
    ...Array.from(groupMap.keys()).filter((g) => !savedGroupOrder.includes(g)),
  ];

  const ghostTask = dragId ? orderedRows.find((r) => r.task.id === dragId) : null;
  const ghostLabel = ghostTask?.task.title ?? (dragId && allGroupNames.includes(dragId) ? dragId : null);
  const groupDragRow = draggingHabitId ? orderedRows.find((r) => r.task.id === draggingHabitId) : null;

  async function commitAdd() {
    if (!newTitle.trim()) return;
    await addTask(listId!, newTitle.trim());
    setNewTitle('');
    reload();
    closeDetail();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await commitAdd();
  }

  async function handleRenameGroup(oldName: string, newName: string) {
    await renameGroup(listId!, oldName, newName);
    const current = listGroupOrders[listId!] ?? [];
    setListGroupOrder(listId!, current.map((g) => (g === oldName ? newName : g)));
    reload();
  }

  async function handleDeleteGroup(name: string) {
    await deleteGroup(listId!, name);
    const current = listGroupOrders[listId!] ?? [];
    setListGroupOrder(listId!, current.filter((g) => g !== name));
    reload();
  }

  return (
    <>
      {ghostLabel !== null && createPortal(
        <div ref={ghostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
          {ghostLabel}
        </div>,
        document.body
      )}
      {createPortal(
        <div ref={lineRef} className="nav-reorder-line" style={{ opacity: 0 }} />,
        document.body
      )}
      {groupDragRow && createPortal(
        <div ref={groupGhostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
          {groupDragRow.task.title}
        </div>,
        document.body
      )}
      <div>
        <div className="view-header">
          <div className="view-title-row">
            {list && getListIcon(list, 20) && <span className="view-title-icon">{getListIcon(list, 20)}</span>}
            <h1 className="view-title">{list?.name ?? 'Habits'}</h1>
            <span className="view-title-actions">
              <button
                className="view-title-action-btn"
                onClick={() => setHabitEditMode((m) => !m)}
                title={habitEditMode ? 'Done editing' : 'Edit habits'}
                style={habitEditMode ? { color: 'var(--success)' } : undefined}
              >
                {habitEditMode
                  ? <CheckCircle size={ICON_SIZE} />
                  : <Pencil size={ICON_SIZE} />}
              </button>
            </span>
          </div>
          <p className="view-subtitle">{list ? LIST_TYPE_LABELS[list.type] : 'daily'}</p>
        </div>
        <div className="view-body">
          {/* Ungrouped zone — also acts as drop target for removing group assignment */}
          <div
            data-group-id="__ungrouped__"
            className={[
              'ungrouped-drop-zone',
              habitEditMode ? 'ungrouped-drop-zone--editing' : '',
              draggingHabitId ? 'ungrouped-drop-zone--dragging' : '',
            ].filter(Boolean).join(' ')}
          >
            <form onSubmit={handleAdd}>
              <input
                className="add-task-input"
                placeholder="+ Add habit"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={commitAdd}
              />
            </form>
            <div data-reorder-context="task-ungrouped">
              {ungroupedRows.map((row) => (
                <HabitRow
                  key={row.task.id}
                  row={row}
                  editMode={habitEditMode}
                  dragging={row.task.id === draggingHabitId}
                  onToggle={handleToggle}
                  onSelect={() => detail?.task.id === row.task.id ? closeDetail() : openDetail({ task: row.task })}
                  onDelete={() => removeTask(row.task.id, listId!).then(reload)}
                  isSelected={detail?.task.id === row.task.id}
                  onReorderStart={(e) => startDrag(e, row.task.id, 'task-ungrouped', 'task-row--dragging')}
                  onGroupDragStart={(e) => { e.preventDefault(); setDraggingHabitId(row.task.id); }}
                />
              ))}
            </div>
          </div>

          {/* Group sections */}
          <div data-reorder-context="groups">
            {allGroupNames.map((groupName) => (
              <HabitGroupSection
                key={groupName}
                groupName={groupName}
                rows={groupMap.get(groupName) ?? []}
                editMode={habitEditMode}
                draggingHabitId={draggingHabitId}
                onToggle={handleToggle}
                onSelect={(row) => detail?.task.id === row.task.id ? closeDetail() : openDetail({ task: row.task })}
                onDelete={(row) => removeTask(row.task.id, listId!).then(reload)}
                onRename={handleRenameGroup}
                onDeleteGroup={handleDeleteGroup}
                onGroupDragStart={(e, taskId) => { e.preventDefault(); setDraggingHabitId(taskId); }}
                selectedTaskId={detail?.task.id}
                startDrag={startDrag}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
